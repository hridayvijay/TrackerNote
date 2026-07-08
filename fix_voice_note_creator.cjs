const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

if (!content.includes('const geminiKeyRef = useRef<string | null>(null);')) {
  content = content.replace(
    'const [geminiKey, setGeminiKey] = useState<string | null>(null);',
    'const [geminiKey, setGeminiKey] = useState<string | null>(null);\n  const geminiKeyRef = useRef<string | null>(null);\n  useEffect(() => { geminiKeyRef.current = geminiKey; }, [geminiKey]);'
  );
}

content = content.replace(
  'geminiApiKey: geminiKey',
  'geminiApiKey: geminiKeyRef.current'
);

fs.writeFileSync('src/components/VoiceNoteCreator.tsx', content);
