const fs = require('fs');

let pf = fs.readFileSync('src/components/ProjectForm.tsx', 'utf8');

pf = pf.replace(
  /focus:border-blue-500\/50/g,
  'focus:border-[var(--theme-accent)]/50'
);

fs.writeFileSync('src/components/ProjectForm.tsx', pf);
