const fs = require('fs');

let vo = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

vo = vo.replace(
  /function drawParse\(cx: number, cy: number, r: number, t: number\) \{[\s\S]*?function renderV\(\) \{/,
  `function drawParse(cx: number, cy: number, r: number, t: number) {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      
      const pulse = Math.sin(t * 4) * 0.15 + 0.85; // Breathes more prominently
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * pulse);
      g.addColorStop(0, hexToRgba(safeColors[0], 0.7));
      g.addColorStop(0.6, hexToRgba(safeColors[1], 0.4));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

      // Tumble in a loading circle
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        const speed = 2 + i * 0.5;
        ctx.rotate(t * speed + (i * Math.PI * 2) / 3);
        const wobble = Math.sin(t * 2 + i) * 10;
        const dotR = r * 0.2 + Math.sin(t * 5 + i) * 5;
        
        ctx.beginPath();
        ctx.arc(r * 0.5 + wobble, 0, dotR, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(safeColors[i % safeColors.length], 0.8);
        ctx.fill();
        ctx.restore();
      }
    }

    function renderV() {`
);

fs.writeFileSync('src/components/VoiceOrb.tsx', vo);
