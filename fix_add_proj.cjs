const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /<\/AnimatePresence>\s*<\/div>\s*<\/motion\.div>/g,
  `</AnimatePresence>
                  <button 
                    onClick={() => setProjectFormProps({ open: true, project: null, defaultAssignee: assignee })} 
                    className="w-full mt-2 py-3 rounded-2xl border border-dashed border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/5 hover:bg-[var(--theme-accent)]/15 hover:border-[var(--theme-accent)]/60 text-[var(--theme-accent-text)] flex items-center justify-center opacity-70 hover:opacity-100 transition-all group"
                  >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </motion.div>`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
