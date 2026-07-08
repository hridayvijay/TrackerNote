const fs = require('fs');
let content = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

content = content.replace(
  /<div className="flex items-center mb-5 px-1">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `<div className="col-header">
                  <div className="col-name">
                    {assignee} <span className="col-count">{assigneeProjects.length} projects</span>
                  </div>
                  {assigneeProjects.length === 0 && assignee !== 'Unassigned' && (
                    <button
                      onClick={() => handleDeleteAssigneeCategory(assignee)}
                      className="text-[var(--theme-text-muted)] hover:text-red-500 transition-colors shrink-0"
                      title="Remove category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>`
);

content = content.replace(
  /className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 rounded-lg pb-10 space-y-4"/g,
  'className="flex-1 overflow-y-auto pr-2 pb-10"' // remove space-y-4 to match the exact mockup
);

// Add the ADD STAKEHOLDER at the bottom of the kanban
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

