const fs = require('fs');
console.log(fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8').substring(0, 100));
