const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  /\.app-bg \{[\s\S]*?\}/,
  `.app-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 25% 0%, var(--theme-orb-1) 0%, transparent 55%),
              radial-gradient(ellipse at 80% 80%, var(--theme-orb-2) 0%, transparent 50%);
  opacity: 0.25;
  pointer-events: none;
  z-index: 0;
}`
);

fs.writeFileSync('src/index.css', css);

