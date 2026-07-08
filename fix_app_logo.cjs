const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldLogo = `<Briefcase className="w-6 h-6 text-[var(--theme-accent-text)] text-[var(--theme-accent-text)]" />`;
const newLogo = `<svg width="26" height="26" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--theme-orb-1)"/>
                  <stop offset="50%" stopColor="var(--theme-orb-2)"/>
                  <stop offset="100%" stopColor="var(--theme-orb-3)"/>
                </linearGradient>
                <radialGradient id="vs" cx="32%" cy="24%" r="58%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/>
                  <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="100" fill="url(#vg)"/>
              <circle cx="100" cy="100" r="100" fill="url(#vs)"/>
              <line x1="25" y1="62" x2="131" y2="62" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="78" y1="62" x2="78" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="131" y1="62" x2="131" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="131" y1="62" x2="172" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <line x1="172" y1="62" x2="172" y2="152" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              <circle cx="131" cy="62" r="8" fill="white"/>
            </svg>`;

content = content.replace(oldLogo, newLogo);
fs.writeFileSync('src/App.tsx', content);
