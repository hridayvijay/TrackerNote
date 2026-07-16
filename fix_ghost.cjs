const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /recognition\.onresult = \(event: any\) => \{/,
  `recognition.onresult = (event: any) => {
      if (!isRecordingRef.current) return;`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
