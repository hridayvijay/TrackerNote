const fs = require('fs');

let kin = fs.readFileSync('src/components/KineticTranscription.tsx', 'utf8');

kin = kin.replace(
  /<div className="flex flex-wrap justify-center content-end min-h-full items-end gap-x-\[0\.25em\] pb-1">/,
  `<div className="flex flex-wrap justify-center content-end min-h-full items-end gap-x-[0.25em] pb-1">
                {isRecording && completedWords.length === 0 && !currentWord && (
                <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                    className="font-normal italic text-[var(--theme-text-muted)] opacity-60 inline-block whitespace-nowrap"
                >
                    Listening...
                </motion.span>
                )}`
);

fs.writeFileSync('src/components/KineticTranscription.tsx', kin);
