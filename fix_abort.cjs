const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(/recognitionRef\.current\.stop\(\)/g, 'recognitionRef.current.abort()');

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
