const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /<div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">/,
  '<div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">'
);

nd = nd.replace(
  /<div className="kanban flex h-full gap-4 px-2 items-start">/,
  '<div className="kanban flex flex-wrap h-auto gap-4 px-2 items-start">'
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
