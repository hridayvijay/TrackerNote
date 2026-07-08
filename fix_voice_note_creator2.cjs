const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

content = content.replace(
  'setGeminiKey(key);',
  'setGeminiKey(key);\n    geminiKeyRef.current = key;'
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', content);
