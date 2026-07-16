import { AnimatePresence, motion } from "motion/react";

interface KineticTranscriptionProps {
  transcript: string;
  isRecording: boolean;
}

const MAX_VISIBLE_WORDS = 14;

export default function KineticTranscription({ transcript, isRecording }: KineticTranscriptionProps) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const visibleWords = words.slice(-MAX_VISIBLE_WORDS);
  const firstVisibleIndex = words.length - visibleWords.length;

  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          key="live-transcription"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none"
          aria-live="polite"
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            width: "min(320px, 90vw)",
            minHeight: "3em",
            marginBottom: "2rem",
            transform: "translateX(-50%)",
            zIndex: 60,
          }}
        >
          <div
            className="flex min-h-[3em] flex-wrap content-end items-end justify-center gap-x-[0.25em] overflow-visible pb-1 text-center"
            style={{
              lineHeight: 1.5,
              fontSize: "18px",
              color: "var(--theme-text-primary)",
              textShadow: "0 2px 12px var(--theme-bg-primary)",
            }}
          >
            {visibleWords.length === 0 ? (
              <motion.span
                animate={{ opacity: [0.45, 0.9, 0.45] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="whitespace-nowrap italic text-[var(--theme-text-muted)]"
              >
                Listening...
              </motion.span>
            ) : (
              visibleWords.map((word, index) => {
                const absoluteIndex = firstVisibleIndex + index;
                const isLatest = index === visibleWords.length - 1;
                return (
                  <motion.span
                    key={`${absoluteIndex}-${word}`}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
