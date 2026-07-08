const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /className="flex items-center justify-center bg-\[var\(--theme-accent\)\] text-\[var\(--theme-text-primary\)\] px-5 py-2\.5 rounded-xl text-sm font-bold hover:bg-\[var\(--theme-accent\)\] shadow-lg shadow-indigo-500\/30 transition-all active:scale-95"/,
  'className="flex items-center justify-center bg-[var(--theme-accent)] text-[var(--theme-bg-primary)] px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 shadow-lg shadow-[var(--theme-accent)]/30 transition-all active:scale-95"'
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);

