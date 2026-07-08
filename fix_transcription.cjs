const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /isInitializingMicRef\.current = true;\s*if \(transcriptionSupported && recognitionRef\.current\) \{\s*finalTranscriptRef\.current = '';\s*try \{\s*recognitionRef\.current\.start\(\);\s*\} catch\(e\) \{\s*console\.error\("Failed to start SpeechRecognition:", e\);\s*\}\s*\}/,
  `isInitializingMicRef.current = true;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try {
          recognitionRef.current.start();
        } catch(e) {}
      }`
);

vn = vn.replace(
  /let options: any = \{ audioBitsPerSecond: 32000 \};/,
  `if (!isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try { recognitionRef.current.start(); } catch(e){}
      }
      
      let options: any = { audioBitsPerSecond: 32000 };`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
