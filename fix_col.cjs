const fs = require('fs');
let code = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

code = code.replace(
  /className="col min-w-\[280px\] w-\[280px\] shrink-0 flex flex-col"/g,
  'className="col min-w-[280px] w-[280px] shrink-0 flex flex-col h-full bg-[var(--theme-bg-card)] backdrop-blur-lg border border-[var(--theme-border)] rounded-3xl p-4 transition-colors"'
);

// We should also replace the add stakeholder column's style slightly
code = code.replace(
  /className="col shrink-0 flex items-start pt-1 opacity-40 hover:opacity-100 transition-opacity"/g,
  'className="col shrink-0 flex items-start pt-1 opacity-40 hover:opacity-100 transition-opacity bg-[var(--theme-bg-card)] backdrop-blur-lg border border-[var(--theme-border)] rounded-3xl p-4"'
);


fs.writeFileSync('src/components/NotesDashboard.tsx', code);
