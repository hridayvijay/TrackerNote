const fs = require('fs');
let vn = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

// add isInitializingMicRef
vn = vn.replace(
  /const isRecordingRef = useRef\(false\);/,
  'const isRecordingRef = useRef(false);\n  const isInitializingMicRef = useRef(false);'
);

// update onend
vn = vn.replace(
  /recognition\.onend = \(\) => \{\s*console\.log\("SpeechRecognition onend fired"\);\s*if \(isRecordingRef\.current\) \{\s*try \{ recognition\.start\(\); \} catch\(e\)\{\}\s*\}\s*\};/,
  `recognition.onend = () => {
      console.log("SpeechRecognition onend fired");
      if (isRecordingRef.current || isInitializingMicRef.current) {
        try { recognition.start(); } catch(e){}
      }
    };`
);

// update handleMicClick
vn = vn.replace(
  /if \(transcriptionSupported && recognitionRef\.current\) \{\s*finalTranscriptRef\.current = '';\s*try \{\s*recognitionRef\.current\.start\(\);\s*\} catch\(e\) \{\s*console\.error\("Failed to start SpeechRecognition:", e\);\s*\}\s*\}/,
  `isInitializingMicRef.current = true;
      if (transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try {
          recognitionRef.current.start();
        } catch(e) {
          console.error("Failed to start SpeechRecognition:", e);
        }
      }`
);

// update after getUserMedia
vn = vn.replace(
  /mediaRecorder\.start\(100\);\s*setIsRecording\(true\);\s*isRecordingRef\.current = true;/,
  `mediaRecorder.start(100);
      setIsRecording(true);
      isRecordingRef.current = true;
      isInitializingMicRef.current = false;
      // Just in case it died and didn't restart
      if (transcriptionSupported && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(e){}
      }`
);

// catch permission denied
vn = vn.replace(
  /setErrorType\("mic"\);\s*setErrorMessage\("Microphone permission denied\."\);\s*return;/,
  `isInitializingMicRef.current = false;
        setErrorType("mic");
        setErrorMessage("Microphone permission denied.");
        return;`
);

// catch general errors
vn = vn.replace(
  /setErrorType\("permission"\);\s*setErrorMessage\(err\.message \|\| "Microphone access denied\."\);/,
  `isInitializingMicRef.current = false;
      setErrorType("permission");
      setErrorMessage(err.message || "Microphone access denied.");`
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vn);
