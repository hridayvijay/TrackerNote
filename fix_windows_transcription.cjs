const fs = require('fs');

let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

vn = vn.replace(
  /let stream: MediaStream;\s*try \{\s*stream = await navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\);\s*console\.log\('2\. getUserMedia resolved, starting recognition'\);\s*\} catch \(e\) \{\s*setErrorType\("mic"\);\s*setErrorMessage\("Microphone permission denied\."\);\s*return;\s*\}\s*if \(transcriptionSupported && recognitionRef\.current\) \{\s*finalTranscriptRef\.current = '';\s*try \{\s*recognitionRef\.current\.start\(\);\s*\} catch\(e\) \{\s*console\.error\("Failed to start SpeechRecognition:", e\);\s*\}\s*\}/,
  `      if (transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try {
          recognitionRef.current.start();
        } catch(e) {
          console.error("Failed to start SpeechRecognition:", e);
        }
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('2. getUserMedia resolved');
      } catch (e) {
        setErrorType("mic");
        setErrorMessage("Microphone permission denied.");
        return;
      }`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
