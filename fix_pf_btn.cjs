const fs = require('fs');
let pf = fs.readFileSync('src/components/ProjectForm.tsx', 'utf8');

pf = pf.replace(
  /className="inline-flex items-center px-6 py-2 shadow-lg shadow-indigo-500\/30 text-sm font-bold rounded-xl text-\[var\(--theme-text-primary\)\] bg-\[var\(--theme-accent\)\] hover:bg-\[var\(--theme-accent\)\] transition-all disabled:opacity-50"/,
  'className="inline-flex items-center px-6 py-2 shadow-lg shadow-[var(--theme-accent)]/30 text-sm font-bold rounded-xl text-[var(--theme-bg-primary)] bg-[var(--theme-accent)] hover:brightness-110 transition-all disabled:opacity-50"'
);

fs.writeFileSync('src/components/ProjectForm.tsx', pf);
