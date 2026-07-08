const fs = require('fs');

let vo = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

vo = vo.replace(
  /const orbitR = r \* \(0\.08 \+ amp \* 0\.62\);[\s\S]*?const blobs = \[[\s\S]*?\];/,
  `const orbitR = r * (0.05 + amp * 0.4);
      const blobs = [
        { a: t * 0.18, sz: r * (0.4 + amp * 0.3), col: safeColors[0] },
        { a: t * 0.18 + 1.57, sz: r * (0.35 + amp * 0.3), col: safeColors[1] },
        { a: t * 0.18 + 3.14, sz: r * (0.4 + amp * 0.25), col: safeColors[2] },
        { a: t * 0.18 + 4.71, sz: r * (0.3 + amp * 0.35), col: safeColors[3] }
      ];`
);

vo = vo.replace(
  /if \(amp > 0\.72\) \{[\s\S]*?fill\(\);\s*\}/,
  `if (amp > 0.8) {
        const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.8);
        burst.addColorStop(0, hexToRgba(safeColors[3], (amp - 0.8) * 0.2));
        burst.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = burst; ctx.fill();
      }`
);

fs.writeFileSync('src/components/VoiceOrb.tsx', vo);
