const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /const mediaRecorderRef = useRef<MediaRecorder \| null>\(null\);/,
  'const mediaRecorderRef = useRef<MediaRecorder | null>(null);\n  const audioCtxRef = useRef<AudioContext | null>(null);'
);

vn = vn.replace(
  /const audioCtx = new \(window\.AudioContext \|\| \(window as any\)\.webkitAudioContext\)\(\);/,
  `const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();\n        audioCtxRef.current = audioCtx;`
);

vn = vn.replace(
  /mediaRecorderRef\.current\?\.stop\(\);/,
  `mediaRecorderRef.current?.stop();\n    if (audioCtxRef.current) {\n      audioCtxRef.current.close().catch(e => console.error(e));\n      audioCtxRef.current = null;\n    }`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
