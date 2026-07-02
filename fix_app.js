const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/<div className="absolute inset-0 bg-gradient-to-br[^>]+ \/>/g, '');
fs.writeFileSync('src/App.tsx', content, 'utf-8');
