const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /\} catch\(e\) \{\}\s*let stream: MediaStream;/g,
  `} catch(e) {}\n      }\n\n      let stream: MediaStream;`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
