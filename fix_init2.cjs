const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /\} else if \(\!isSafari && transcriptionSupported && recognitionRef\.current\) \{\s*finalTranscriptRef\.current = '';\s*try \{\s*recognitionRef\.current\.start\(\);\s*\} catch\(e\) \{\}\s*\}/,
  ``
);

vn = vn.replace(
  /const mediaRecorder = new MediaRecorder\(stream, options\);/,
  `if (!isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try { recognitionRef.current.start(); } catch(e){}
      }\n      const mediaRecorder = new MediaRecorder(stream, options);`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
