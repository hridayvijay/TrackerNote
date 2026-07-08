const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  'background: var(--theme-bg-card, rgba(53,183,121,0.08);',
  'background: var(--theme-bg-card, rgba(53,183,121,0.08));'
);

fs.writeFileSync('src/index.css', css);
