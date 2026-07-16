const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /if \(recognitionRef\.current\) \{\s*recognitionRef\.current\.stop\(\);\s*\}/g,
  `if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(e){}
    }`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
