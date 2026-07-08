const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /<div className="relative flex flex-col items-center" style=\{\{ position: 'relative' \}\}>/,
  '<div className="relative flex flex-col items-center justify-center w-full" style={{ position: \'relative\' }}>'
);

vn = vn.replace(
  /<div className="relative z-10">/,
  '<div className="relative z-10 flex justify-center w-full">'
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
