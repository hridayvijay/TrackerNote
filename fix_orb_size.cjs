const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

content = content.replace(
  'width: 140,',
  'width: 72,'
);
content = content.replace(
  'height: 140,',
  'height: 72,'
);
content = content.replace(
  '<canvas ref={canvasRef} width={140} height={140}',
  '<canvas ref={canvasRef} width={72} height={72}'
);

// add the ring effect using the style
content = content.replace(
  'className="cursor-pointer shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95"',
  'className="cursor-pointer shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95 orb-ring"'
);

fs.writeFileSync('src/components/VoiceOrb.tsx', content);

let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.orb-ring')) {
  css += `
.orb-ring {
  border-radius: 50%;
  padding: 4px;
  background: var(--theme-bg-card, rgba(53,183,121,0.08));
  border: 0.5px solid var(--theme-border, rgba(53,183,121,0.2));
}
`;
  fs.writeFileSync('src/index.css', css);
}

