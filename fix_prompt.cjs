const fs = require('fs');

let gem = fs.readFileSync('api/gemini.ts', 'utf8');
gem = gem.replace(
  /priority \(High Medium or Low inferred from urgency language\)/,
  "priority (High, Medium, or Low inferred from urgency language. IMPORTANT: If the due date resolves to tomorrow or earlier, you MUST automatically assign 'High' priority regardless of urgency language)"
);

fs.writeFileSync('api/gemini.ts', gem);
