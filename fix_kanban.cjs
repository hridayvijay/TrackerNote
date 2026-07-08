const fs = require('fs');
let content = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

// Replace kanban wrapper
content = content.replace(
  '<div className="flex h-full space-x-6 px-2 snap-x snap-mandatory items-start">',
  '<div className="kanban flex h-full gap-4 px-2 items-start">'
);

// Replace col wrapper
content = content.replace(
  /className="min-w-\[340px\] max-w-\[340px\] shrink-0 snap-center flex flex-col h-full bg-\[var\(--theme-bg-card\)\] backdrop-blur-lg border border-\[var\(--theme-border\)\] rounded-3xl p-4 transition-colors hover:bg-\[var\(--theme-bg-card-hover\)\]"/g,
  'className="col min-w-[280px] w-[280px] shrink-0 flex flex-col"'
);

// Replace col header
content = content.replace(
  /<div className="flex items-center mb-5 px-1">\s*<div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md mr-3 shrink-0 text-\[var\(--theme-text-primary\)\] font-bold text-sm">\s*\{assignee\.charAt\(0\)\.toUpperCase\(\)\}\s*<\/div>\s*<div className="min-w-0 flex-1 flex items-center justify-between space-x-2">\s*<h3 className="font-black text-xl text-\[var\(--theme-text-primary\)\] truncate">[\s\S]*?\{assignee\}\s*<\/h3>\s*<span className="bg-\[var\(--theme-bg-primary\)\] text-\[var\(--theme-text-secondary\)\] text-xs font-bold px-2\.5 py-1 rounded-full border border-\[var\(--theme-border\)\] shrink-0 shadow-sm">\s*\{assigneeProjects.length\}\s*<\/span>\s*<\/div>\s*<\/div>/g,
  `<div className="col-header">
                  <div className="col-name">
                    {assignee} <span className="col-count">{assigneeProjects.length} projects</span>
                  </div>
                </div>`
);

// add the + add stakeholder column at the end of the groupsToRender mapping
content = content.replace(
  /<\/AnimatePresence>\s*<\/div>\s*\)\}\s*<\/div>\s*\{!isOnline/g,
  `
              <div className="col shrink-0 flex items-start pt-1 opacity-40 hover:opacity-100 transition-opacity" style={{ minWidth: '60px' }}>
                <div className="text-[var(--theme-accent)] text-xs mt-5 cursor-pointer font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  + ADD STAKEHOLDER
                </div>
              </div>
            </AnimatePresence>
          </div>
        )}
      </div>
      {!isOnline`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', content);

