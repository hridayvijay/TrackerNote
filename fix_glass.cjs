const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// fix mt-card
css = css.replace(
  /\.mt-card \{[\s\S]*?\}/,
  `.mt-card {
  background: var(--theme-bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}`
);

// fix proj-card
css = css.replace(
  /\.proj-card \{[\s\S]*?\}/,
  `.proj-card {
  background: var(--theme-bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  padding: 9px 10px;
  margin-bottom: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}`
);

// fix note-item
css = css.replace(
  /\.note-item \{[\s\S]*?\}/,
  `.note-item {
  background: var(--theme-bg-secondary);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}`
);

// remove hardcoded fallback colors from col-header, col-name, col-count, note-status, etc
css = css.replace(/var\(--theme-border, [^\)]+\)/g, 'var(--theme-border)');
css = css.replace(/var\(--theme-accent, [^\)]+\)/g, 'var(--theme-accent)');
css = css.replace(/var\(--theme-text-primary, [^\)]+\)/g, 'var(--theme-text-primary)');
css = css.replace(/var\(--theme-text-secondary, [^\)]+\)/g, 'var(--theme-text-secondary)');
css = css.replace(/var\(--theme-text-muted, [^\)]+\)/g, 'var(--theme-text-muted)');
css = css.replace(/var\(--theme-badge-bg, [^\)]+\)/g, 'var(--theme-bg-primary)'); // Using primary for badge bg to contrast with card
css = css.replace(/var\(--theme-badge-border, [^\)]+\)/g, 'var(--theme-border)');

fs.writeFileSync('src/index.css', css);
