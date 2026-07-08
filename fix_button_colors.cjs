const fs = require('fs');

function replaceTextWhite(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/text-white/g, 'text-[var(--theme-bg-primary)]');
  fs.writeFileSync(filePath, content);
}

replaceTextWhite('src/components/NoteForm.tsx');
replaceTextWhite('src/components/ProjectForm.tsx');
replaceTextWhite('src/components/NotesDashboard.tsx');

// The user also mentioned "remove 'add stakeholder' button from the main page"
let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');
nd = nd.replace(/<div className="col shrink-0 flex items-start pt-1 opacity-40 hover:opacity-100 transition-opacity bg-\[var\(--theme-bg-card\)\] backdrop-blur-lg border border-\[var\(--theme-border-strong\)\] rounded-3xl p-4" style={{ minWidth: '60px' }}>[\s\S]*?<\/div>/, '');
fs.writeFileSync('src/components/NotesDashboard.tsx', nd);

