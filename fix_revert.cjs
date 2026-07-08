const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

content = content.replace(
  'await processAudio(base64data, actualMimeType, key);',
  'await processAudio(base64data, actualMimeType);'
);

content = content.replace(
  'const processAudio = async (base64data: string, mimeType: string = \'audio/webm\', activeKey: string | null = null) => {',
  'const processAudio = async (base64data: string, mimeType: string = \'audio/webm\') => {'
);

content = content.replace(
  'geminiApiKey: activeKey || geminiKey',
  'geminiApiKey: geminiKey'
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', content);
