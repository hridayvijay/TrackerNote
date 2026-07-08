const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

content = content.replace(/width: 90/g, 'width: 110');
content = content.replace(/height: 90/g, 'height: 110');

fs.writeFileSync('src/components/VoiceOrb.tsx', content);
