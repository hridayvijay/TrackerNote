const fs = require('fs');

let pc = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');

pc = pc.replace(/\s*draggable\s*onDragStart=\{\(e: any\) => \{\s*e\.stopPropagation\(\);\s*e\.dataTransfer\.setData\("noteId", note\.id\);\s*\}\}/, '');

fs.writeFileSync('src/components/ProjectCard.tsx', pc);
