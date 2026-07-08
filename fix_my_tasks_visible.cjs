const fs = require('fs');
let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /\{myTasks\.length > 0 && \(\s*(<div className="my-tasks-section mb-6">[\s\S]*?<\/div>\s*<\/div>)\s*\)\}/,
  `$1`
);
fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
