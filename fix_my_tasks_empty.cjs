const fs = require('fs');
let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /<div className="my-tasks-row flex-1 overflow-x-auto flex space-x-3 pb-2 scrollbar-hide snap-x">[\s\S]*?<\/div>\s*<\/div>/,
  `<div className="my-tasks-row flex-1 overflow-x-auto flex space-x-3 pb-2 scrollbar-hide snap-x">
            {myTasks.length === 0 && (
              <div className="text-[10px] text-[var(--theme-text-muted)] italic py-2">
                No tasks assigned to you.
              </div>
            )}
            {myTasks.map((rem) => {
              const project = projects.find((p) => p.id === rem.projectId);
              return (
                <div
                  key={rem.id}
                  className="mt-card shrink-0 snap-end cursor-pointer transition-colors hover:bg-[var(--theme-bg-card-hover)]"
                  onClick={() =>
                    setNoteFormProps({
                      open: true,
                      projectId: rem.projectId,
                      note: rem,
                    })
                  }
                >
                  <span className="font-bold text-slate-800 text-[var(--theme-text-primary)] truncate">
                    {rem.content}
                  </span>
                  <div className="flex justify-between items-center mt-1.5 space-x-2 text-[10px] text-[var(--theme-text-secondary)] font-bold uppercase tracking-wider">
                    <span className="truncate">
                      {project?.title || "Unknown"}
                    </span>
                    {rem.reminderTime && (
                      <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(rem.reminderTime), "MMM d, h:mm")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>`
);
fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
