const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<div className="app-bg" />',
  `<div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none z-0" style={{ background: 'var(--theme-orb-1)', opacity: 0.15 }} />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-0" style={{ background: 'var(--theme-orb-2)', opacity: 0.15 }} />`
);

fs.writeFileSync('src/App.tsx', code);
