const fs = require('fs');
let content = fs.readFileSync('api/gemini.ts', 'utf8');

content = content.replace(
  'const { uid, audioBase64, mimeType, displayName, geminiApiKey } = req.body;',
  'const { uid, audioBase64, mimeType, displayName, geminiApiKey, transcript } = req.body;'
);

content = content.replace(
  'const systemInstruction = `${displayNameContext}${todayContext} You are a task parser.',
  'const systemInstruction = `${displayNameContext}${todayContext} You are a task parser. If the user provided a transcript of their speech, prioritize using that transcript for parsing the task, as the audio might be corrupted or silent. ${transcript ? "\\n\\nUSER TRANSCRIPT:\\n" + transcript : ""}\\n\\nExtract and return ONLY a valid JSON object'
);

fs.writeFileSync('api/gemini.ts', content);
