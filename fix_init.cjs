const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /if \(isSafari && transcriptionSupported && recognitionRef\.current\) \{\s*finalTranscriptRef\.current = '';\s*try \{\s*recognitionRef\.current\.start\(\);\s*\} catch\(e\) \{\}\s*\}/,
  `if (isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try {
          recognitionRef.current.start();
        } catch(e) {}
      } else if (!isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try {
          recognitionRef.current.start();
        } catch(e) {}
      }`
);

vn = vn.replace(
  /if \(!isSafari && transcriptionSupported && recognitionRef\.current\) \{\s*finalTranscriptRef\.current = '';\s*try \{ recognitionRef\.current\.start\(\); \} catch\(e\)\{\}\s*\}/,
  ``
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
