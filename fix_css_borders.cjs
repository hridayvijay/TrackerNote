const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  /\.mt-card \{[\s\S]*?\}/,
  `.mt-card {
  background: var(--theme-bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--theme-border-strong);
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}`
);

css = css.replace(
  /\.proj-card \{[\s\S]*?\}/,
  `.proj-card {
  background: var(--theme-bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--theme-border-strong);
  border-radius: 12px;
  padding: 9px 10px;
  margin-bottom: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}`
);

css = css.replace(
  /\.note-item \{[\s\S]*?\}/,
  `.note-item {
  background: var(--theme-bg-secondary);
  border: 1px solid var(--theme-border-strong);
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}`
);

css = css.replace(
  /\.col-header \{[\s\S]*?\}/,
  `.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 8px 0;
  border-bottom: 1px solid var(--theme-border-strong);
  margin-bottom: 8px;
}`
);

fs.writeFileSync('src/index.css', css);
