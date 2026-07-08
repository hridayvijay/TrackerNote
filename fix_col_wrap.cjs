const fs = require('fs');
let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /className="col min-w-\[280px\] w-\[280px\] shrink-0 flex flex-col h-full bg-\[var\(--theme-bg-card\)\] backdrop-blur-lg border border-\[var\(--theme-border-strong\)\] rounded-3xl p-4 transition-colors"/g,
  'className="col min-w-[280px] w-[280px] shrink-0 flex flex-col bg-[var(--theme-bg-card)] backdrop-blur-lg border border-[var(--theme-border-strong)] rounded-3xl p-4 transition-colors"'
);
// remove the h-full from kanban
nd = nd.replace(
  /<div className="kanban flex flex-wrap h-auto gap-4 px-2 items-start">/,
  '<div className="kanban flex flex-wrap gap-4 px-2 items-start">'
);

// remove the overflow-y-auto from the list inside the column, since we want the whole page to scroll downwards
nd = nd.replace(
  /<div className="flex-1 overflow-y-auto pr-2 pb-10">/g,
  '<div className="flex-1 pr-2 pb-2">'
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
