const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /mediaRecorderRef\.current\?\.stop\(\);/,
  `if (audioStream) {\n      audioStream.getTracks().forEach(track => track.stop());\n      setAudioStream(null);\n    }\n    mediaRecorderRef.current?.stop();`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
