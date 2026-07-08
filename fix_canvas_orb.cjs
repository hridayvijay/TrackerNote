const fs = require('fs');

const content = `import React, { useRef, useEffect } from "react";
import { useTheme } from "../themes/ThemeContext";

export interface VoiceOrbProps {
  state: "idle" | "recording" | "parsing";
  onClick: () => void;
  audioStream?: MediaStream | null;
}

export default function VoiceOrb({ state, onClick, audioStream }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { orbColors } = useTheme();
  const safeColors = orbColors?.length === 4 ? orbColors : ['#440154','#31688e','#35b779','#fde725'];

  const reqIdRef = useRef<number>(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const amplitudeRef = useRef<number>(0);

  // Parse CSS var back to rgba (simplified for hex)
  const hexToRgba = (hex: string, alpha: number) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const r = parseInt(hex.substring(0,2), 16) || 0;
    const g = parseInt(hex.substring(2,4), 16) || 0;
    const b = parseInt(hex.substring(4,6), 16) || 0;
    return \`rgba(\${r},\${g},\${b},\${alpha})\`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let vt = 0;
    let baseScale = 1.0;
    
    function glass(cx: number, cy: number, r: number) {
      if (!ctx) return;
      const rim = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
      rim.addColorStop(0, 'rgba(255,255,255,0)');
      rim.addColorStop(1, 'rgba(255,255,255,0.18)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();
      
      const spec = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, 0, cx - r * 0.28, cy - r * 0.28, r * 0.42);
      spec.addColorStop(0, 'rgba(255,255,255,0.5)');
      spec.addColorStop(0.35, 'rgba(255,255,255,0.15)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = spec; ctx.fill();
    }

    function renderV() {
      if (!canvas || !ctx) return;
      
      let targetAmplitude = 0;
      if (stateRef.current === "recording" && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        const limit = Math.min(20, dataArrayRef.current.length);
        for (let i = 0; i < limit; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / limit) / 255.0;
        targetAmplitude = Math.min(targetAmplitude * 4.0, 1.0);
      }
      amplitudeRef.current += (targetAmplitude - amplitudeRef.current) * 0.4;
      
      let speed = 0.007;
      let targetScale = 1.0;
      
      if (stateRef.current === "recording") {
        speed = 0.015 + amplitudeRef.current * 0.03;
        targetScale = 1.0 + amplitudeRef.current * 0.35;
      } else if (stateRef.current === "parsing") {
        speed = 0.012;
        targetScale = Math.sin(Date.now() * 0.003) * 0.1 + 1.05;
      }
      
      baseScale += (targetScale - baseScale) * 0.2;
      vt += speed;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = w / 2 - 2;
      const r = maxR * baseScale;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bg.addColorStop(0, hexToRgba(safeColors[0], 0.5));
      bg.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      
      const orbs = [
        { a: vt * 0.35, ob: r * 0.38, sz: r * 0.52, col: safeColors[0] },
        { a: vt * 0.35 + 2.09, ob: r * 0.34, sz: r * 0.48, col: safeColors[1] },
        { a: vt * 0.35 + 4.19, ob: r * 0.3, sz: r * 0.44, col: safeColors[2] }
      ];
      
      orbs.forEach(b => {
        const x = cx + Math.cos(b.a) * b.ob;
        const y = cy + Math.sin(b.a) * b.ob * 0.7;
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.sz);
        g.addColorStop(0, hexToRgba(b.col, 0.75));
        g.addColorStop(1, hexToRgba(b.col, 0));
        ctx.beginPath(); ctx.arc(x, y, b.sz, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      });
      
      glass(cx, cy, r);
      ctx.restore();
      
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(safeColors[2], 0.3);
      ctx.lineWidth = 1; ctx.stroke();

      reqIdRef.current = requestAnimationFrame(renderV);
    }
    
    renderV();

    return () => {
      cancelAnimationFrame(reqIdRef.current);
    };
  }, [safeColors]);

  useEffect(() => {
    if (state === "recording" && audioStream) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(audioStream);
      source.connect(analyser);
      ctx.resume().catch(()=>{});
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      if (audioCtxRef.current?.state !== "closed") {
        audioCtxRef.current?.close().catch(()=>{});
      }
      audioCtxRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    }
    return () => {
      if (audioCtxRef.current?.state !== "closed") {
        audioCtxRef.current?.close().catch(()=>{});
      }
    };
  }, [state, audioStream]);

  return (
    <div 
      className="cursor-pointer shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95"
      onClick={onClick}
      onTouchStart={onClick}
      style={{
        width: 140,
        height: 140,
        borderRadius: "50%",
        transform: "translateZ(0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <canvas ref={canvasRef} width={140} height={140} style={{ borderRadius: "50%", display: "block" }} />
    </div>
  );
}
`;

fs.writeFileSync('src/components/VoiceOrb.tsx', content);
