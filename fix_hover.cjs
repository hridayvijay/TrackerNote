const fs = require('fs');

let nf = fs.readFileSync('src/components/NoteForm.tsx', 'utf8');
nf = nf.replace(/hover:bg-\[var\(--theme-accentHover\)/g, 'hover:brightness-110');
fs.writeFileSync('src/components/NoteForm.tsx', nf);

let pf = fs.readFileSync('src/components/ProjectForm.tsx', 'utf8');
pf = pf.replace(/hover:bg-\[var\(--theme-accentHover\)/g, 'hover:brightness-110');
fs.writeFileSync('src/components/ProjectForm.tsx', pf);
