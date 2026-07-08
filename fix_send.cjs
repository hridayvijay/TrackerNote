const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

content = content.replace(
  'geminiApiKey: geminiKeyRef.current',
  'geminiApiKey: geminiKeyRef.current,\n          transcript: interimText'
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', content);
