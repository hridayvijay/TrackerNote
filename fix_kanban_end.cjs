const fs = require('fs');
let content = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

content = content.replace(
  '</AnimatePresence>\n            <div className="w-4 shrink-0 h-1" />\n          </div>',
  `  <div className="col shrink-0 flex items-start pt-1 opacity-40 hover:opacity-100 transition-opacity" style={{ minWidth: '60px' }}>
                <div className="text-[var(--theme-accent)] text-xs mt-5 cursor-pointer font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  + ADD STAKEHOLDER
                </div>
              </div>
            </AnimatePresence>
            <div className="w-4 shrink-0 h-1" />
          </div>`
);
fs.writeFileSync('src/components/NotesDashboard.tsx', content);
