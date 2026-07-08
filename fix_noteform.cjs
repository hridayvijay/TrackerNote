const fs = require('fs');

let nf = fs.readFileSync('src/components/NoteForm.tsx', 'utf8');

nf = nf.replace(
  /border-b border-white\/20 border-\[var\(--theme-border\)\]\/50/g,
  'border-b border-[var(--theme-border-strong)]'
);

nf = nf.replace(
  /bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400/,
  'text-[var(--theme-accent-text)]'
);

nf = nf.replace(
  /border border-white\/40 dark:border-\[var\(--theme-border\)\]\/50/g,
  'border border-[var(--theme-border-strong)]'
);

nf = nf.replace(
  /border border-white\/50/g,
  'border border-[var(--theme-border-strong)]'
);

nf = nf.replace(
  /focus:border-blue-500\/50 focus:ring-4 focus:ring-blue-500\/10/g,
  'focus:border-[var(--theme-accent)] focus:ring-4 focus:ring-[var(--theme-accent)]/20'
);

nf = nf.replace(
  /focus:ring-4 focus:ring-blue-500\/10/g,
  'focus:ring-4 focus:ring-[var(--theme-accent)]/20'
);

nf = nf.replace(
  /text-blue-700 bg-blue-50\/80 border border-blue-200\/50 hover:bg-blue-100/g,
  'text-[var(--theme-accent-text)] bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] hover:border-[var(--theme-accent)] hover:bg-[var(--theme-bg-secondary)]'
);

nf = nf.replace(
  /text-red-700 bg-red-50\/80 border border-red-200\/50 hover:bg-red-100/g,
  'text-red-600 bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] hover:border-red-500 hover:bg-[var(--theme-bg-secondary)]'
);

nf = nf.replace(
  /border-t border-white\/20 border-\[var\(--theme-border\)\]\/50/g,
  'border-t border-[var(--theme-border-strong)]'
);

nf = nf.replace(
  /"bg-emerald-100 text-\[var\(--theme-accent-text\)\] dark:text-\[var\(--theme-accent-text\)\] shadow-sm"/g,
  '"bg-[var(--theme-accent)]/20 text-[var(--theme-accent-text)] shadow-sm"'
);

nf = nf.replace(
  /"bg-\[var\(--theme-bg-card\)\] dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"/g,
  '"bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-secondary)] text-[var(--theme-accent-text)] shadow-sm border border-[var(--theme-border-strong)]"'
);

nf = nf.replace(
  /shadow-lg shadow-blue-500\/30 text-sm font-bold rounded-xl text-\[var\(--theme-text-primary\)\] bg-blue-600 hover:bg-blue-700/g,
  'shadow-lg shadow-[var(--theme-accent)]/30 text-sm font-bold rounded-xl text-white bg-[var(--theme-accent)] hover:bg-[var(--theme-accentHover)]'
);

nf = nf.replace(
  /text-blue-400 flex items-center mb-1/g,
  'text-[var(--theme-accent-text)] flex items-center mb-1'
);

fs.writeFileSync('src/components/NoteForm.tsx', nf);
