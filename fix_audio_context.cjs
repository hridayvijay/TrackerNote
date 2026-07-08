const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

// Add analyser to state
if (!content.includes('const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);')) {
  content = content.replace(
    'const [audioStream, setAudioStream] = useState<MediaStream | null>(null);',
    'const [audioStream, setAudioStream] = useState<MediaStream | null>(null);\n  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);'
  );
}

// In handleMicClick, setup AudioContext
const setupCode = `      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyserNode);
        setAnalyser(analyserNode);
      } catch(e) {
        console.error("AudioContext error", e);
      }`;

content = content.replace(
  /const mediaRecorder = new MediaRecorder\(stream, options\);\s+mediaRecorderRef\.current = mediaRecorder;\s+audioChunksRef\.current = \[\];/,
  setupCode
);

content = content.replace(
  'audioStream={audioStream}',
  'analyser={analyser}'
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', content);

let orbContent = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');
orbContent = orbContent.replace(
  'audioStream?: MediaStream | null;',
  'analyser?: AnalyserNode | null;'
);
orbContent = orbContent.replace(
  'export default function VoiceOrb({ state, onClick, audioStream }: VoiceOrbProps) {',
  'export default function VoiceOrb({ state, onClick, analyser }: VoiceOrbProps) {'
);
orbContent = orbContent.replace(
  'analyserRef.current = analyser;',
  '// no-op'
);

// We should replace the useEffect for audioStream entirely
orbContent = orbContent.replace(
  /useEffect\(\(\) => \{\s*if \(state === "recording" && audioStream\) \{[\s\S]*?\}, \[state, audioStream\]\);/,
  `useEffect(() => {
    if (analyser) {
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      analyserRef.current = null;
      dataArrayRef.current = null;
    }
  }, [analyser]);`
);

fs.writeFileSync('src/components/VoiceOrb.tsx', orbContent);
