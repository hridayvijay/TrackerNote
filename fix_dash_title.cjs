const fs = require('fs');
let code = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

code = code.replace(
  '<span className="dash-title">Assignee Dashboard</span>',
  '<span className="dash-title flex items-center"><LayoutDashboard className="w-6 h-6 mr-2 text-[var(--theme-accent-text)]" /> Assignee Dashboard</span>'
);

fs.writeFileSync('src/components/NotesDashboard.tsx', code);
