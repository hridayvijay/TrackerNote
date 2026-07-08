const fs = require('fs');
let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /import \{ isFuture, format \} from "date-fns";/,
  'import { isFuture, format, formatDistanceToNow } from "date-fns";'
);

nd = nd.replace(
  /<span className="font-bold text-slate-800 text-\[var\(--theme-text-primary\)\] truncate">\s*\{rem\.content\}\s*<\/span>\s*<div className="flex justify-between items-center mt-1\.5 space-x-2 text-\[10px\] text-\[var\(--theme-text-secondary\)\] font-bold uppercase tracking-wider">\s*<span className="truncate">\s*\{project\?\.title \|\| "Unknown"\}\s*<\/span>\s*\{rem\.reminderTime && \(\s*<span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900\/30 px-1\.5 py-0\.5 rounded flex items-center shrink-0">\s*<Clock className="w-3 h-3 mr-1" \/>\s*\{format\(new Date\(rem\.reminderTime\), "MMM d, h:mm"\)\}\s*<\/span>\s*\)\}\s*<\/div>/,
  `<span className="font-bold text-slate-800 text-[var(--theme-text-primary)] truncate text-xs uppercase tracking-wide opacity-80">
                    {project?.title || "Unknown Project"}
                  </span>
                  <span className="font-medium text-[var(--theme-text-primary)] truncate mt-0.5">
                    {rem.content}
                  </span>
                  <div className="flex justify-between items-center mt-1.5 space-x-2 text-[10px] text-[var(--theme-text-secondary)] font-bold uppercase tracking-wider">
                    {rem.reminderTime ? (
                      <>
                        <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(rem.reminderTime), "MMM d, h:mm")}
                        </span>
                        <span className="truncate opacity-70">
                           {isFuture(new Date(rem.reminderTime)) ? \`In \${formatDistanceToNow(new Date(rem.reminderTime))}\` : \`\${formatDistanceToNow(new Date(rem.reminderTime))} ago\`}
                        </span>
                      </>
                    ) : (
                      <span className="opacity-50">No deadline</span>
                    )}
                  </div>`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
