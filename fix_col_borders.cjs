const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /border-\[var\(--theme-border\)\]/g,
  'border-[var(--theme-border-strong)]'
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
