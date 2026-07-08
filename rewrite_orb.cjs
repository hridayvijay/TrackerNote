const fs = require('fs');

const content = `import React, { useRef, useEffect } from "react";
import { useTheme } from "../themes/ThemeContext";

export interface VoiceOrbProps {
  state: "idle" | "recording" | "parsing";
  onClick: () => void;
  analyser?: AnalyserNode | null;
}

export default function VoiceOrb({ state, onClick, analyser }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { orbColors } = useTheme();
  const safeColors = orbColors?.length === 4 ? orbColors : ['#440154','#31688e','#35b779','#fde725'];

  const reqIdRef = useRef<number>(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  
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

    let vt = { idle: 0, record: 0, parse: 0 };
    let baseScale = 1.0;
    
    function glass(cx: number, cy: number, r: number) {
      if (!ctx) return;
      const rim = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
      rim.addColorStop(0, 'rgba(255,255,255,0)');
      rim.addColorStop(1, 'rgba(255,255,255,0.18)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();
      
      const spec = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, 0, cx - r * 0.28, cy - r * 0.28, r * 0.45);
      spec.addColorStop(0, 'rgba(255,255,255,0.52)');
      spec.addColorStop(0.35, 'rgba(255,255,255,0.18)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = spec; ctx.fill();

      const bot = ctx.createRadialGradient(cx + r * 0.15, cy + r * 0.28, 0, cx + r * 0.15, cy + r * 0.28, r * 0.55);
      bot.addColorStop(0, 'rgba(0,0,0,0.28)');
      bot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bot; ctx.fill();
    }

    function drawIdle(cx: number, cy: number, r: number, t: number) {
      if (!ctx) return;
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bg.addColorStop(0, hexToRgba(safeColors[1], 0.35));
      bg.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      
      const blobs = [
        { a: t * 0.35, ob: r * 0.40, sz: r * 0.58, col: safeColors[0] },
        { a: t * 0.35 + 2.09, ob: r * 0.36, sz: r * 0.52, col: safeColors[1] },
        { a: t * 0.35 + 4.19, ob: r * 0.32, sz: r * 0.46, col: safeColors[2] }
      ];
      blobs.forEach(b => {
        const x = cx + Math.cos(b.a) * b.ob;
        const y = cy + Math.sin(b.a) * b.ob * 0.68;
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.sz);
        g.addColorStop(0, hexToRgba(b.col, 0.72));
        g.addColorStop(1, hexToRgba(b.col, 0));
        ctx.beginPath(); ctx.arc(x, y, b.sz, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      });
    }

    function drawRecord(cx: number, cy: number, r: number, t: number, amp: number) {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      const orbitR = r * (0.08 + amp * 0.62);
      const blobs = [
        { a: t * 0.18, sz: r * (0.52 + amp * 0.38), col: safeColors[0] },
        { a: t * 0.18 + 1.57, sz: r * (0.48 + amp * 0.42), col: safeColors[1] },
        { a: t * 0.18 + 3.14, sz: r * (0.52 + amp * 0.35), col: safeColors[2] },
        { a: t * 0.18 + 4.71, sz: r * (0.44 + amp * 0.46), col: safeColors[3] }
      ];
      blobs.forEach(b => {
        const x = cx + Math.cos(b.a) * orbitR;
        const y = cy + Math.sin(b.a) * orbitR;
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.sz);
        g.addColorStop(0, hexToRgba(b.col, 0.78 + amp * 0.2));
        g.addColorStop(1, hexToRgba(b.col, 0));
        ctx.beginPath(); ctx.arc(x, y, b.sz, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      });
      if (amp > 0.72) {
        const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (amp - 0.3));
        burst.addColorStop(0, hexToRgba(safeColors[3], (amp - 0.72) * 1.8 * 0.35));
        burst.addColorStop(1, hexToRgba(safeColors[3], 0));
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = burst; ctx.fill();
      }
    }

    function drawParse(cx: number, cy: number, r: number, t: number) {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      for (let i = 0; i < 4; i++) {
        const yOff = Math.sin(t * 1.4 + i * Math.PI / 2) * r * 0.55;
        const y = cy + yOff;
        const h = r * 0.52;
        const g = ctx.createLinearGradient(cx - r, y - h / 2, cx + r, y + h / 2);
        g.addColorStop(0, hexToRgba(safeColors[i], 0));
        g.addColorStop(0.28, hexToRgba(safeColors[i], 0.48));
        g.addColorStop(0.72, hexToRgba(safeColors[(i + 1) % 4], 0.48));
        g.addColorStop(1, hexToRgba(safeColors[(i + 1) % 4], 0));
        ctx.fillStyle = g; ctx.fillRect(cx - r, y - h / 2, r * 2, h);
      }
      const breathe = Math.sin(t * 1.7) * 0.08 + 0.92;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.58 * breathe);
      cg.addColorStop(0, hexToRgba(safeColors[1], 0.28));
      cg.addColorStop(1, hexToRgba(safeColors[1], 0));
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
      const sa = t * 2.4;
      const sx = cx + Math.cos(sa) * r * 0.82;
      const sy = cy + Math.sin(sa) * r * 0.82;
      const scan = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.22);
      scan.addColorStop(0, 'rgba(255,255,255,0.75)');
      scan.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.22, 0, Math.PI * 2); ctx.fillStyle = scan; ctx.fill();
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
        targetAmplitude = Math.min(targetAmplitude * 3.0, 1.0);
      } else if (stateRef.current === "recording") {
        // Fallback fake amplitude if mic isn't hooked up correctly
        const t = vt.record;
        targetAmplitude = Math.max(0, Math.min(1,
          (Math.sin(t*7.3)*0.38+Math.sin(t*4.9)*0.28+Math.sin(t*13.1)*0.2+Math.sin(t*19.7)*0.14)*0.5+0.58
        ));
      }
      amplitudeRef.current += (targetAmplitude - amplitudeRef.current) * 0.25;
      
      let targetScale = 1.0;
      if (stateRef.current === "recording") {
        targetScale = 1.0 + amplitudeRef.current * 0.15;
      } else if (stateRef.current === "parsing") {
        targetScale = Math.sin(Date.now() * 0.003) * 0.05 + 1.02;
      }
      
      baseScale += (targetScale - baseScale) * 0.2;
      vt.idle += 0.007;
      vt.record += 0.018;
      vt.parse += 0.011;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = w / 2 - 2;
      const r = maxR * baseScale;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      
      if (stateRef.current === "idle") {
        drawIdle(cx, cy, r, vt.idle);
      } else if (stateRef.current === "recording") {
        drawRecord(cx, cy, r, vt.record, amplitudeRef.current);
      } else if (stateRef.current === "parsing") {
        drawParse(cx, cy, r, vt.parse);
      }
      
      glass(cx, cy, r);
      ctx.restore();
      
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1; ctx.stroke();

      reqIdRef.current = requestAnimationFrame(renderV);
    }
    
    renderV();

    return () => {
      cancelAnimationFrame(reqIdRef.current);
    };
  }, [safeColors]);

  useEffect(() => {
    if (analyser) {
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      analyserRef.current = null;
      dataArrayRef.current = null;
    }
  }, [analyser]);

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
