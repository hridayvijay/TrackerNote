const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /<\/motion\.div>\s*\)\)\}\s*<\/div>\s*<\/AnimatePresence>/,
  `</motion.div>
            ))}
            </AnimatePresence>`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);

