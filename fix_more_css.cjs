const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');
css += `
.dash-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dash-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--theme-text-primary, rgba(255,255,255,0.92));
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 8px 0;
  border-bottom: 0.5px solid var(--theme-border, rgba(53,183,121,0.25));
  margin-bottom: 8px;
}
.col-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--theme-accent, #35b779);
  display: flex;
  align-items: center;
  gap: 6px;
}
.col-count {
  background: var(--theme-badge-bg, rgba(53,183,121,0.12));
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
  color: var(--theme-accent, rgba(53,183,121,0.8));
}

.proj-title {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--theme-text-primary, rgba(255,255,255,0.85));
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.proj-actions {
  display: flex;
  gap: 6px;
  opacity: 0.5;
}
.proj-action {
  font-size: 10px;
  color: var(--theme-text-secondary, rgba(255,255,255,0.5));
}

.note-status {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid;
  flex-shrink: 0;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
}
.note-status.pending {
  border-color: rgba(253,183,0,0.5);
}
.note-status.done {
  border-color: var(--theme-accent, #35b779);
  background: var(--theme-badge-bg, rgba(53,183,121,0.2));
  color: var(--theme-accent, #35b779);
}
.note-body {
  flex: 1;
  min-width: 0;
}
.note-text {
  font-size: 10.5px;
  color: var(--theme-text-secondary, rgba(255,255,255,0.72));
  line-height: 1.45;
  margin-bottom: 3px;
}
.note-text.done-text {
  text-decoration: line-through;
  opacity: 0.45;
}
.note-meta {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}
.pri-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
}
.pri-high {
  background: rgba(253,231,37,0.1);
  border: 0.5px solid rgba(253,231,37,0.35);
  color: rgba(253,231,37,0.9);
}
.pri-med {
  background: var(--theme-badge-bg, rgba(53,183,121,0.1));
  border: 0.5px solid var(--theme-border, rgba(53,183,121,0.3));
  color: var(--theme-accent, #35b779);
}
.pri-low {
  background: rgba(49,104,142,0.15);
  border: 0.5px solid rgba(49,104,142,0.35);
  color: rgba(49,104,142,0.9);
}
.due-tag {
  font-size: 9px;
  color: var(--theme-text-muted, rgba(255,255,255,0.35));
  display: flex;
  align-items: center;
  gap: 2px;
}
`;

fs.writeFileSync('src/index.css', css);
