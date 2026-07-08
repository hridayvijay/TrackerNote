const fs = require('fs');
let content = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

content = content.replace(
  '<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">',
  '<div className="fixed bottom-6 right-6 z-40">'
);

fs.writeFileSync('src/components/NotesDashboard.tsx', content);
