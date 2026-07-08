const fs = require('fs');

let content = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');
content = content.replace(
  'onDropNote={(noteId, toProjectId) =>',
  'onMoveNote={(noteId, toProjectId) =>'
);
fs.writeFileSync('src/components/NotesDashboard.tsx', content);

