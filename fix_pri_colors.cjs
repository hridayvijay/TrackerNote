const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  /\.pri-high \{[\s\S]*?\}/,
  `.pri-high {
  background: rgba(239, 68, 68, 0.15);
  border: 0.5px solid rgba(239, 68, 68, 0.4);
  color: rgba(239, 68, 68, 0.9);
}`
);

css = css.replace(
  /\.pri-med \{[\s\S]*?\}/,
  `.pri-med {
  background: rgba(245, 158, 11, 0.15);
  border: 0.5px solid rgba(245, 158, 11, 0.4);
  color: rgba(245, 158, 11, 0.9);
}`
);

css = css.replace(
  /\.pri-low \{[\s\S]*?\}/,
  `.pri-low {
  background: rgba(34, 197, 94, 0.15);
  border: 0.5px solid rgba(34, 197, 94, 0.4);
  color: rgba(34, 197, 94, 0.9);
}`
);

css = css.replace(
  /\.due-tag \{[\s\S]*?\}/,
  `.due-tag {
  font-size: 9px;
  background: rgba(217, 119, 6, 0.15);
  border: 0.5px solid rgba(217, 119, 6, 0.3);
  color: rgba(217, 119, 6, 0.9);
  padding: 1px 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 500;
}`
);

fs.writeFileSync('src/index.css', css);
