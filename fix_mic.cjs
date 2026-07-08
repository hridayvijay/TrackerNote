const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

// remove the redundant start at the end of handleMicClick
vn = vn.replace(
  /\/\/ Just in case it died and didn't restart\s*if \(transcriptionSupported && recognitionRef\.current\) \{\s*try \{ recognitionRef\.current\.start\(\); \} catch\(e\)\{\}\s*\}/,
  ''
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
