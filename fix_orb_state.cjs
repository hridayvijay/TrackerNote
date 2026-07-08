const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

// Add stateRef
const importLine = `import React, { useRef, useEffect } from "react";`;
if (!content.includes('const stateRef = useRef(state);')) {
  content = content.replace(
    'const reqIdRef = useRef<number>(0);',
    'const reqIdRef = useRef<number>(0);\n  const stateRef = useRef(state);\n  useEffect(() => { stateRef.current = state; }, [state]);'
  );
}

// Replace state usage in updateLoop
content = content.replace(
  'if (state === "idle") activeStateId = 0;',
  'if (stateRef.current === "idle") activeStateId = 0;'
);
content = content.replace(
  'else if (state === "recording") activeStateId = 1;',
  'else if (stateRef.current === "recording") activeStateId = 1;'
);
content = content.replace(
  'else if (state === "parsing") activeStateId = 2;',
  'else if (stateRef.current === "parsing") activeStateId = 2;'
);

content = content.replace(
  'if (state === "recording" && analyserRef.current && dataArrayRef.current) {',
  'if (stateRef.current === "recording" && analyserRef.current && dataArrayRef.current) {'
);

content = content.replace(
  'if (state === "idle") {',
  'if (stateRef.current === "idle") {'
);
content = content.replace(
  'else if (state === "recording") {',
  'else if (stateRef.current === "recording") {'
);
content = content.replace(
  'else if (state === "parsing") {',
  'else if (stateRef.current === "parsing") {'
);

fs.writeFileSync('src/components/VoiceOrb.tsx', content);
