const fs = require('fs');

let orb = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');
orb = orb.replace(
  /function drawParse\(cx: number, cy: number, r: number, t: number\) \{[\s\S]*?function renderV\(\) \{/,
  `function drawParse(cx: number, cy: number, r: number, t: number) {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      
      // Fluid pulsing orb for parsing
      const pulse = Math.sin(t * 3) * 0.1 + 0.9;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * pulse);
      g.addColorStop(0, hexToRgba(safeColors[0], 0.6));
      g.addColorStop(0.5, hexToRgba(safeColors[1], 0.3));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

      // Spinning ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 2);
      const ring = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 0.9);
      ring.addColorStop(0, 'rgba(0,0,0,0)');
      ring.addColorStop(0.5, hexToRgba(safeColors[2], 0.8));
      ring.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fillStyle = ring; ctx.fill();
      ctx.restore();
    }

    function renderV() {`
);
fs.writeFileSync('src/components/VoiceOrb.tsx', orb);
