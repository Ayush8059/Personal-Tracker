import confetti from 'canvas-confetti';

/**
 * High-fidelity 3D Spiral Galaxy / Nebula Background Animation
 * Automatically shifts themes matching the local hour (Auto-Circadian Mode):
 * - Day Mode (6:00 AM - 6:00 PM): Golden sunny starfield, warmer colors, active motion
 * - Night Mode (6:00 PM - 6:00 AM): Deep neon-cyber space orbits, calm slow drift
 * Toggling theme manually in settings overrides auto-clock detection.
 */
export function startParticleBackground(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  const resizeHandler = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeHandler);

  // Mouse coordinate tracker for camera tilt
  let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
  
  const mouseMoveHandler = (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  };
  window.addEventListener('mousemove', mouseMoveHandler);

  const numParticles = 120;
  const particles = [];
  const focalLength = 320; 
  
  const numArms = 3;
  for (let i = 0; i < numParticles; i++) {
    const arm = i % numArms;
    const ratio = i / numParticles;
    const angle = ratio * Math.PI * 5 + (arm * Math.PI * 2 / numArms);
    const radius = ratio * Math.min(width, height) * 0.45 + 15;
    
    particles.push({
      diskX: Math.cos(angle) * radius,
      diskZ: Math.sin(angle) * radius,
      diskY: (Math.random() - 0.5) * 45, 
      orbitSpeed: 0.001 + (1 - ratio) * 0.0018, // speed curve
      currentAngle: angle,
      radius: Math.random() * 2 + 1,
      colorBias: Math.random() 
    });
  }

  let camRotX = 0.5;
  let camRotY = 0;
  let animId = null;
  let timeAngle = 0;
  
  function project(x, y, z) {
    const scale = focalLength / (focalLength + z);
    return {
      x: (x * scale) + (width / 2),
      y: (y * scale) + (height / 2),
      scale: scale
    };
  }

  function rotateY(x, y, z, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: x * cos - z * sin, y: y, z: z * cos + x * sin };
  }

  function rotateX(x, y, z, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: x, y: y * cos - z * sin, z: z * cos + y * sin };
  }

  function loop() {
    // 1. Theme Evaluation: Check manual override, fallback to hour clock
    const savedTheme = localStorage.getItem('aethertrack_theme');
    let isLight = false;
    
    if (savedTheme) {
      isLight = savedTheme === 'light';
    } else {
      // Auto Mode: 6 AM to 6 PM is daytime (Light), else nighttime (Dark)
      const hour = new Date().getHours();
      isLight = hour >= 6 && hour < 18;
    }
    
    // 2. Draw Theme-specific canvas background gradients
    if (isLight) {
      // Sunbeams Warm Golden/Blue daylight space
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f9f6f0'); 
      grad.addColorStop(0.5, '#eef2f7'); 
      grad.addColorStop(1, '#d5e0ea'); 
      ctx.fillStyle = grad;
    } else {
      // Midnight Neon Cyber Space
      const grad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, Math.max(width, height));
      grad.addColorStop(0, '#0a0d1e'); 
      grad.addColorStop(1, '#04050b'); 
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);
    
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
    
    // Camera orbital adjustment
    const targetCamRotY = (mouse.x - width / 2) * 0.0006;
    const targetCamRotX = 0.5 - (mouse.y - height / 2) * 0.0006;
    
    camRotX += (targetCamRotX - camRotX) * 0.05;
    camRotY += (targetCamRotY - camRotY) * 0.05;

    // Movement speed multiplier (faster sparkle during midday, calm drift at night)
    const speedMult = isLight ? 1.4 : 0.8;
    timeAngle += 0.003 * speedMult;
    
    const projectedParticles = [];
    
    for (let i = 0; i < numParticles; i++) {
      const p = particles[i];
      
      // Update rotation
      p.currentAngle += p.orbitSpeed * speedMult;
      const orbitalRadius = Math.sqrt(p.diskX*p.diskX + p.diskZ*p.diskZ);
      
      let rx = Math.cos(p.currentAngle) * orbitalRadius;
      let rz = Math.sin(p.currentAngle) * orbitalRadius;
      let ry = p.diskY;
      
      let rotPoint = rotateY(rx, ry, rz, camRotY);
      rotPoint = rotateX(rotPoint.x, rotPoint.y, rotPoint.z, camRotX);
      
      const projected = project(rotPoint.x, rotPoint.y, rotPoint.z);
      
      projectedParticles.push({
        x: projected.x,
        y: projected.y,
        scale: projected.scale,
        depth: rotPoint.z,
        colorBias: p.colorBias,
        radius: p.radius * projected.scale
      });
    }

    // Sort far to near
    projectedParticles.sort((a, b) => b.depth - a.depth);

    for (let i = 0; i < numParticles; i++) {
      const p = projectedParticles[i];
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      
      const depthRatio = (p.depth + 300) / 600;
      const opacity = Math.max(0.1, Math.min(0.9, (1 - depthRatio) * 0.8));
      
      let starColor = '';
      if (isLight) {
        // Glowing gold / warm violet sparkles in day
        starColor = p.colorBias > 0.5 ? 
          `rgba(255, 159, 67, ${opacity * 0.75})` : // Warm Amber Gold
          `rgba(138, 92, 246, ${opacity * 0.7})`;   // Violet Sunbeam
      } else {
        // Cyan / Magenta nebula orbits in night
        starColor = p.colorBias > 0.5 ? 
          `rgba(0, 229, 255, ${opacity})` : 
          `rgba(213, 0, 249, ${opacity})`;
      }

      ctx.fillStyle = starColor;
      
      if (!isLight && p.scale > 0.9) {
        ctx.shadowBlur = p.radius * 2;
        ctx.shadowColor = p.colorBias > 0.5 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(213, 0, 249, 0.4)';
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    animId = requestAnimationFrame(loop);
  }
  
  loop();

  return () => {
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('mousemove', mouseMoveHandler);
    if (animId) cancelAnimationFrame(animId);
  };
}

/**
 * 3D Tilt card transforms
 */
export function handleTiltMove(e, cardElement, maxTilt = 4) {
  if (!cardElement) return;
  const rect = cardElement.getBoundingClientRect();
  
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const xNorm = (mouseX / rect.width) - 0.5;
  const yNorm = (mouseY / rect.height) - 0.5;
  
  const rotY = xNorm * maxTilt * 2;
  const rotX = -yNorm * maxTilt * 2;
  
  cardElement.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
  cardElement.style.backgroundImage = `radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)`;
  cardElement.style.boxShadow = `0 16px 40px rgba(0, 229, 255, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.12)`;
}

export function handleTiltLeave(cardElement) {
  if (!cardElement) return;
  cardElement.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
  cardElement.style.backgroundImage = 'none';
  cardElement.style.boxShadow = '';
}

/**
 * Confetti celebration burst
 */
export function triggerCheckConfetti(clientX, clientY, colorHex) {
  const xRatio = clientX / window.innerWidth;
  const yRatio = clientY / window.innerHeight;
  
  confetti({
    particleCount: 24,
    spread: 60,
    origin: { x: xRatio, y: yRatio },
    colors: [colorHex || '#00e5ff', '#ffffff', '#d500f9'],
    disableForced3d: false,
    ticks: 150
  });
}
