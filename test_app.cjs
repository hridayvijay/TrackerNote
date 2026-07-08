const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.app-bg')) {
  css += `
.app-bg {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 25% 0%, var(--theme-bg-gradient-1, rgba(68,1,84,0.8)), transparent 55%),
              radial-gradient(ellipse at 80% 80%, var(--theme-bg-gradient-2, rgba(49,104,142,0.3)), transparent 50%);
  pointer-events: none;
  z-index: -1;
}

.synced-badge {
  background: var(--theme-badge-bg, rgba(53,183,121,0.12));
  border: 0.5px solid var(--theme-badge-border, rgba(53,183,121,0.35));
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
  color: var(--theme-accent);
  display: flex;
  align-items: center;
  gap: 5px;
}

.synced-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-accent);
}

.my-tasks-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mt-badge {
  background: var(--theme-badge-bg, rgba(53,183,121,0.15));
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
  color: var(--theme-accent);
}

.mt-card {
  background: var(--theme-bg-card, rgba(53,183,121,0.08));
  border: 0.5px solid var(--theme-border, rgba(53,183,121,0.2));
  border-radius: 8px;
  padding: 8px 10px;
  flex: 1;
  min-width: 0;
}

.proj-card {
  background: var(--theme-bg-card, rgba(68,1,84,0.35));
  border: 0.5px solid var(--theme-border, rgba(53,183,121,0.18));
  border-radius: 9px;
  padding: 9px 10px;
  margin-bottom: 8px;
}

.note-item {
  background: var(--theme-bg-secondary, rgba(49,104,142,0.18));
  border: 0.5px solid var(--theme-border, rgba(49,104,142,0.3));
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
`;
  fs.writeFileSync('src/index.css', css);
}

