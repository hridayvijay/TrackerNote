const fs = require('fs');

let pf = fs.readFileSync('src/components/ProjectForm.tsx', 'utf8');

pf = pf.replace(
  /border-b border-white\/20 border-\[var\(--theme-border\)\]\/50/g,
  'border-b border-[var(--theme-border-strong)]'
);

pf = pf.replace(
  /border border-white\/40 dark:border-\[var\(--theme-border\)\]\/50/g,
  'border border-[var(--theme-border-strong)]'
);

pf = pf.replace(
  /border border-white\/50/g,
  'border border-[var(--theme-border-strong)]'
);

pf = pf.replace(
  /focus:border-blue-500\/50 focus:ring-4 focus:ring-blue-500\/10/g,
  'focus:border-[var(--theme-accent)] focus:ring-4 focus:ring-[var(--theme-accent)]/20'
);

pf = pf.replace(
  /focus:ring-4 focus:ring-blue-500\/10/g,
  'focus:ring-4 focus:ring-[var(--theme-accent)]/20'
);

pf = pf.replace(
  /"bg-\[var\(--theme-bg-card\)\] dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"/g,
  '"bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-secondary)] text-[var(--theme-accent-text)] shadow-sm border border-[var(--theme-border-strong)]"'
);

pf = pf.replace(
  /shadow-lg shadow-blue-500\/30 text-sm font-bold rounded-xl text-\[var\(--theme-text-primary\)\] bg-blue-600 hover:bg-blue-700/g,
  'shadow-lg shadow-[var(--theme-accent)]/30 text-sm font-bold rounded-xl text-white bg-[var(--theme-accent)] hover:bg-[var(--theme-accentHover)]'
);

pf = pf.replace(
  /text-blue-600 dark:text-blue-400/g,
  'text-[var(--theme-accent-text)]'
);

pf = pf.replace(
  /bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400/,
  'text-[var(--theme-accent-text)]'
);

fs.writeFileSync('src/components/ProjectForm.tsx', pf);
