const fs = require('fs');
let content = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

// replace the title and sync badge
content = content.replace(
  /<h2 className="text-2xl font-bold tracking-tight flex items-center">[\s\S]*?Assignee Dashboard\s*<\/h2>\s*\{isOnline \? \(\s*<div className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-\[var\(--theme-accent-text\)\] dark:text-\[var\(--theme-accent-text\)\] bg-\[var\(--theme-bg-secondary\)\] border border-emerald-500\/25 rounded-full select-none" title="All changes are fully synchronized to the cloud and across devices">\s*<Wifi className="w-3.5 h-3.5 mr-1" \/>\s*<span>Synced & Live<\/span>\s*<\/div>\s*\) : \(\s*<div className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500\/10 border border-amber-500\/25 rounded-full select-none animate-pulse" title="Offline. Your changes are saved safely in your browser cache and will sync instantly upon connection">\s*<WifiOff className="w-3.5 h-3.5 mr-1" \/>\s*<span>Offline Mode \(Autosaved\)<\/span>\s*<\/div>\s*\)\}/,
  `<div className="dash-title-row">
            <span className="dash-title">Assignee Dashboard</span>
            {isOnline ? (
              <div className="synced-badge" title="All changes are fully synchronized to the cloud and across devices">
                <div className="synced-dot"></div>
                Synced & Live
              </div>
            ) : (
              <div className="synced-badge border-amber-500/25 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse" title="Offline. Your changes are saved safely in your browser cache and will sync instantly upon connection">
                <div className="synced-dot bg-amber-500"></div>
                Offline Mode (Autosaved)
              </div>
            )}
          </div>`
);

// upcoming reminders -> my tasks
content = content.replace(
  /<div className="mb-6 bg-\[var\(--theme-bg-primary\)\]\/5 dark:bg-slate-100\/5 border border-\[var\(--theme-border\)\] border-\[var\(--theme-border\)\] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-inner">[\s\S]*?<AlertCircle className="w-5 h-5 mr-2" \/>\s*Upcoming Overview\s*<\/div>\s*<div className="flex-1 overflow-x-auto flex space-x-3 pb-2 md:pb-0 scrollbar-hide snap-x">/,
  `<div className="my-tasks-section mb-6">
          <div className="my-tasks-label">
            My Tasks
            <span className="mt-badge">{allUpcomingReminders.length}</span>
          </div>
          <div className="my-tasks-row flex-1 overflow-x-auto flex space-x-3 pb-2 scrollbar-hide snap-x">`
);
content = content.replace(
  /className="min-w-\[200px\] shrink-0 snap-end bg-\[var\(--theme-bg-card\)\] bg-\[var\(--theme-bg-card\)\] backdrop-blur-md px-3 py-2 rounded-xl border border-\[var\(--theme-border\)\] border-\[var\(--theme-border\)\] shadow-sm flex flex-col cursor-pointer transition-colors hover:bg-\[var\(--theme-bg-card-hover\)\] text-xs"/g,
  'className="mt-card shrink-0 snap-end cursor-pointer transition-colors hover:bg-[var(--theme-bg-card-hover)]"'
);

// fix closing tags for upcoming reminders section
content = content.replace(
  /<\/div>\s*<\/div>\s*\)\}/,
  `</div>
        </div>
      )}`
);

// Now kanban board
content = content.replace(
  /<div className="flex-1 overflow-x-auto flex space-x-4 md:space-x-6 pb-6">/,
  `<div className="kanban flex-1 overflow-x-auto flex space-x-4 md:space-x-6 pb-6 scrollbar-hide">`
);

// Column
content = content.replace(
  /<div\s*key=\{assignee\}\s*className="flex flex-col w-72 shrink-0"\s*>/g,
  `<div key={assignee} className="col flex flex-col w-72 shrink-0">`
);

// Col header
content = content.replace(
  /<div className="flex items-center justify-between mb-3">\s*<h3 className="font-black text-lg text-\[var\(--theme-text-primary\)\] flex items-center shadow-sm">[\s\S]*?\{assignee\}\s*<\/h3>\s*<span className="bg-\[var\(--theme-bg-secondary\)\] text-\[var\(--theme-text-secondary\)\] text-xs font-bold px-2 py-1 rounded-full border border-\[var\(--theme-border\)\]">[\s\S]*?\{assigneeProjects.length\}\s*<\/span>\s*<\/div>/g,
  `<div className="col-header mb-3">
                <div className="col-name text-[var(--theme-text-primary)] shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-[var(--theme-accent)] mr-2 opacity-80" />
                  {assignee}
                  <span className="col-count ml-2">{assigneeProjects.length} projects</span>
                </div>
              </div>`
);

// project card
content = content.replace(
  /className="bg-\[var\(--theme-bg-card\)\] backdrop-blur-md border border-\[var\(--theme-border\)\] border-\[var\(--theme-border\)\] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm hover:shadow-md transition-shadow relative group"/g,
  `className="proj-card relative group"`
);

// note item
content = content.replace(
  /className={`group flex items-start p-2.5 rounded-lg border \$\{[\s\S]*?\}`}/g,
  `className="note-item group cursor-pointer transition-colors hover:bg-[var(--theme-bg-card-hover)]"`
);

// checkboxes
content = content.replace(
  /<button\s*onClick=\{\(e\) => \{\s*e.stopPropagation\(\);\s*toggleNoteStatus\(note\);\s*\}\}\s*className={`shrink-0 mt-0.5 mr-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors \$\{[\s\S]*?\}`}\s*>\s*\{note.status === "Done" && <Check className="w-3.5 h-3.5 text-white" \/>\}\s*<\/button>/g,
  `<button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNoteStatus(note);
                                }}
                                className={\`note-status \${note.status === "Done" ? "done" : "pending"} shrink-0 mt-0.5 mr-3\`}
                              >
                                {note.status === "Done" && "✓"}
                              </button>`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', content);

