import { AnimatePresence, motion } from "motion/react";

interface KineticTranscriptionProps {
  transcript: string;
  isRecording: boolean;
}

export default function KineticTranscription({ transcript, isRecording }: KineticTranscriptionProps) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);

  return (
    <AnimatePresence>
      {isRecording && (
        <div
          key="live-transcription-position"
          className="pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2"
          aria-live="polite"
          style={{
            bottom: "calc(100% + 1rem)",
            width: "min(560px, calc(100vw - 2rem))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-[3em] flex-wrap content-end items-end justify-center gap-x-[0.25em] pb-1 text-center"
            style={{
              lineHeight: 1.5,
              fontSize: "18px",
              color: "var(--theme-text-primary)",
              textShadow: "0 2px 12px var(--theme-bg-primary)",
            }}
          >
            {words.length === 0 ? (
              <motion.span
                animate={{ opacity: [0.45, 0.9, 0.45] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="whitespace-nowrap italic text-[var(--theme-text-muted)]"
              >
                Listening...
              </motion.span>
            ) : (
              words.map((word, index) => {
                const isLatest = index === words.length - 1;
                return (
                  <motion.span
                    key={`${index}-${word}`}
                    initial={isLatest ? { opacity: 0, y: 5 } : false}
                    animate={{ opacity: isLatest ? 1 : 0.82, y: 0 }}
                    transition={{ duration: 0.12 }}
                    className={isLatest ? "font-semibold" : "font-normal"}
                  >
                    {word}
                  </motion.span>
                );
              })
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
