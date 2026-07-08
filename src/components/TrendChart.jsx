import React, { useEffect, useRef, useState } from 'react';
import { handleTiltMove, handleTiltLeave } from '../utils/effects';
import { TrendingUp } from 'lucide-react';

export default function TrendChart({ habits, history, activeMonth, activeYear }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, day: 0, val: 0, x: 0, y: 0 });

  const totalDays = new Date(activeYear, activeMonth + 1, 0).getDate();

  // Get daily completion percentage array
  const getChartPoints = () => {
    const points = [];
    const totalHabits = habits.length;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let checkedCount = 0;
      
      habits.forEach(habit => {
        if (history[dateStr] && history[dateStr][habit.id]) {
          checkedCount++;
        }
      });

      const rate = totalHabits > 0 ? (checkedCount / totalHabits) * 100 : 0;
      points.push({ day, val: rate });
    }
    return points;
  };

  const points = getChartPoints();

  // Re-draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = 140;

    const padLeft = 40;
    const padRight = 20;
    const padTop = 15;
    const padBottom = 25;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    ctx.clearRect(0, 0, width, height);

    // Draw horizontal grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(138, 150, 193, 0.4)";
    ctx.font = "9px Inter";
    ctx.textAlign = "right";

    const yLines = [0, 25, 50, 75, 100];
    yLines.forEach(lineVal => {
      const y = padTop + chartH - (lineVal / 100) * chartH;
      
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      
      ctx.fillText(`${lineVal}%`, padLeft - 8, y + 3);
    });

    if (habits.length === 0) {
      ctx.textAlign = "center";
      ctx.fillText("No routines defined. Please add one to see completion trend.", width / 2, height / 2);
      return;
    }

    const mappedPoints = points.map(pt => {
      const x = padLeft + ((pt.day - 1) / (totalDays - 1)) * chartW;
      const y = padTop + chartH - (pt.val / 100) * chartH;
      return { x, y, day: pt.day, val: Math.round(pt.val) };
    });

    // Draw Gradient Area under Curve
    const fillGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    fillGrad.addColorStop(0, "rgba(0, 229, 255, 0.22)");
    fillGrad.addColorStop(1, "rgba(0, 229, 255, 0.0)");
    
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);

    for (let i = 0; i < mappedPoints.length; i++) {
      if (i === 0) {
        ctx.lineTo(mappedPoints[i].x, mappedPoints[i].y);
      } else {
        const prev = mappedPoints[i - 1];
        const curr = mappedPoints[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.y;
        ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, curr.x, curr.y);
      }
    }
    ctx.lineTo(mappedPoints[mappedPoints.length - 1].x, padTop + chartH);
    ctx.closePath();
    ctx.fill();

    // Resolve CSS custom properties for Canvas drawing
    const getCSSColor = (varName, fallback) => {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
    };
    const colorCyan = getCSSColor('--cyan-accent', '#00e5ff');
    const colorGreen = getCSSColor('--green-accent', '#00e676');
    const colorPurple = getCSSColor('--purple-accent', '#d500f9');

    // Draw Main Line Path
    const strokeGrad = ctx.createLinearGradient(padLeft, 0, width - padRight, 0);
    strokeGrad.addColorStop(0, colorCyan);
    strokeGrad.addColorStop(0.5, colorGreen);
    strokeGrad.addColorStop(1, colorPurple);
    
    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(0, 229, 255, 0.35)";
    
    ctx.beginPath();
    for (let i = 0; i < mappedPoints.length; i++) {
      if (i === 0) {
        ctx.moveTo(mappedPoints[i].x, mappedPoints[i].y);
      } else {
        const prev = mappedPoints[i - 1];
        const curr = mappedPoints[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.y;
        ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, curr.x, curr.y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw X-axis Day markers
    ctx.fillStyle = "rgba(138, 150, 193, 0.5)";
    ctx.textAlign = "center";
    mappedPoints.forEach(pt => {
      if (pt.day === 1 || pt.day === totalDays || pt.day % 3 === 0) {
        ctx.fillText(pt.day, pt.x, padTop + chartH + 15);
      }
    });

    // Draw vertical pointer guide line & hovering dot
    if (tooltip.visible && tooltip.day <= totalDays) {
      const activePt = mappedPoints[tooltip.day - 1];
      if (activePt) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(activePt.x, padTop);
        ctx.lineTo(activePt.x, padTop + chartH);
        ctx.stroke();

        ctx.fillStyle = colorCyan;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = colorCyan;
        ctx.beginPath();
        ctx.arc(activePt.x, activePt.y, 4.5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw dynamic tooltip box on canvas
        const boxW = 55;
        const boxH = 25;
        let boxX = activePt.x - boxW / 2;
        let boxY = activePt.y - boxH - 8;
        
        if (boxX < padLeft) boxX = padLeft;
        if (boxX + boxW > width - padRight) boxX = width - padRight - boxW;
        if (boxY < 0) boxY = activePt.y + 10;
        
        ctx.fillStyle = "rgba(13, 17, 36, 0.95)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 5);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8.5px Inter";
        ctx.textAlign = "center";
        ctx.fillText(`Day ${activePt.day}`, boxX + boxW/2, boxY + 9);
        
        ctx.fillStyle = colorCyan;
        ctx.font = "8.5px Outfit";
        ctx.fillText(`${activePt.val}%`, boxX + boxW/2, boxY + 19);
      }
    }
  }, [points, tooltip, habits, totalDays]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || habits.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    const padLeft = 40;
    const padRight = 20;
    const chartW = rect.width - padLeft - padRight;
    
    const pctX = (mouseX - padLeft) / chartW;
    const day = Math.round(pctX * (totalDays - 1)) + 1;
    
    if (day >= 1 && day <= totalDays) {
      setTooltip({
        visible: true,
        day,
        val: points[day - 1] ? Math.round(points[day - 1].val) : 0
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <section 
      className="analytics-and-tabs glass-card tilt-effect"
      ref={containerRef}
      onMouseMove={(e) => handleTiltMove(e, containerRef.current, 0.5)}
      onMouseLeave={() => handleTiltLeave(containerRef.current)}
    >
      <div className="analytics-header">
        <h3>
          <TrendingUp size={16} className="section-icon" /> 
          Completion Velocity (Live 3D Trend)
        </h3>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-color cyan"></span> 
            Progress Rate %
          </span>
        </div>
      </div>
      <div className="chart-container">
        <canvas 
          ref={canvasRef} 
          className="chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </section>
  );
}
