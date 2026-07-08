const fs = require('fs');

// Fix ProjectCard
let pc = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');
pc = pc.replace(
  'import { SyncProject, SyncNote } from "../services";',
  'import { SyncProject, SyncNote } from "../types";'
);
pc = pc.replace(
  'currentUserDisplayName: string;',
  'currentUserDisplayName: string;\n  onAddNote: (projectId: string) => void;'
);
pc = pc.replace(
  'currentUserDisplayName,',
  'currentUserDisplayName,\n  onAddNote,'
);
// noteItem key is handled by adding key to NoteItem, wait, let's see. In NoteItem signature:
// It's defined as `const NoteItem = ({ note...})` but React requires `key` to be a prop if it's not a generic `key`? No, `key` is intrinsic. Let's see what the error was:
// Type '{ key: any; note: SyncNote; ...}' is not assignable to type '{ note: SyncNote... }'.
// It happens if it's just a functional component... wait, React 18 type definitions? Sometimes if you define it as just a function taking an object, it complains if you pass a key unless you type it as `React.FC<{...}>`.
pc = pc.replace(
  'const NoteItem = ({',
  'const NoteItem: React.FC<{\n  note: SyncNote;\n  onToggleStatus: () => void;\n  onEditNote: () => void;\n  onDeleteNote: () => void;\n}> = ({'
);
pc = pc.replace(
  /}: {\s*note: SyncNote;\s*onToggleStatus: \(\) => void;\s*onEditNote: \(\) => void;\s*onDeleteNote: \(\) => void;\s*}\) => {/,
  '}) => {'
);
fs.writeFileSync('src/components/ProjectCard.tsx', pc);

// Fix VoiceNoteCreator
let vnc = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');
vnc = vnc.replace(
  'const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;',
  'const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;'
);
fs.writeFileSync('src/components/VoiceNoteCreator.tsx', vnc);

