const fs = require('fs');

let content = fs.readFileSync('src/themes/ThemeContext.tsx', 'utf8');
content = content.replace(
  'const [themeId, setThemeId] = useState<ThemeId>("viridis");',
  'const [themeId, setThemeId] = useState<ThemeId>("cosmic");'
);
fs.writeFileSync('src/themes/ThemeContext.tsx', content);

