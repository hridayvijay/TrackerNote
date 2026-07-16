const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /if \(isRecording\) \{\s*stopRecording\(\);\s*return;\s*\}/,
  `if (isRecording) {
      stopRecording();
      return;
    }
    if (isParsing) {
      return; // prevent starting a new recording while parsing
    }`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
