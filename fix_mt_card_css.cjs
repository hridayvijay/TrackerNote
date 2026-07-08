const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(
  /\.mt-card \{[\s\S]*?\}/,
  `.mt-card {
  background: var(--theme-bg-card, rgba(53,183,121,0.08));
  border: 0.5px solid var(--theme-border, rgba(53,183,121,0.2));
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}`
);
fs.writeFileSync('src/index.css', css);
