const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

// We will add an AudioContext inside VoiceNoteCreator and pass analyser to VoiceOrb instead of audioStream.
