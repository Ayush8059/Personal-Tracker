import React, { useEffect, useRef } from 'react';
import { startParticleBackground } from '../utils/effects';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const cleanup = startParticleBackground(canvasRef.current);
      return cleanup;
    }
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" id="particles-canvas" />;
}
