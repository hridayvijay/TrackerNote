const fs = require('fs');

let pc = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');
pc = pc.replace(
  'interface ProjectCardProps {',
  'interface ProjectCardProps {\n  key?: string | number;'
);
fs.writeFileSync('src/components/ProjectCard.tsx', pc);

