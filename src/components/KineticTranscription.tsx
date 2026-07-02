import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface KineticTranscriptionProps {
  transcript: string;
  isRecording: boolean;
}

const sentenceEnders = new Set(["done", "finished", "okay", "right", "thanks", "please"]);
const questionWords = new Set(["what", "when", "where", "who", "why", "how", "is", "are", "can", "will"]);
const conjunctions = new Set(["and", "but", "so", "because", "then"]);

export default function KineticTranscription({ transcript, isRecording }: KineticTranscriptionProps) {
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const lastTranscriptRef = useRef(transcript);
  const lastUpdateRef = useRef(Date.now());
  const completedWordsRef = useRef<string[]>([]);
  const currentWordRef = useRef<string>("");

  useEffect(() => {
    if (isRecording) {
      setCompletedWords([]);
      setCurrentWord("");
      completedWordsRef.current = [];
      currentWordRef.current = "";
      setIsFadingOut(false);
      lastTranscriptRef.current = "";
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      if (completedWordsRef.current.length > 0 || currentWordRef.current) {
        if (currentWordRef.current) {
          const w = currentWordRef.current;
          setCompletedWords(prev => {
            const next = [...prev, w];
            completedWordsRef.current = next;
            return next;
          });
          setCurrentWord("");
          currentWordRef.current = "";
        }
        const timer1 = setTimeout(() => {
          setIsFadingOut(true);
        }, 800);
        const timer2 = setTimeout(() => {
          setCompletedWords([]);
          setCurrentWord("");
          completedWordsRef.current = [];
          currentWordRef.current = "";
        }, 1200);
        lastTranscriptRef.current = transcript;
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
      }
      lastTranscriptRef.current = transcript;
      return;
    }
    
    setIsFadingOut(false);
    
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    const lastWords = lastTranscriptRef.current.trim().split(/\s+/).filter(w => w.length > 0);
    
    // Process new words
    if (words.length > 0) {
      const isNewWord = words.length > lastWords.length || 
                        (words.length === lastWords.length && transcript.endsWith(' ') && !lastTranscriptRef.current.endsWith(' '));

      if (isNewWord) {
        const timeSinceLast = Date.now() - lastUpdateRef.current;
        const previousWordRaw = completedWordsRef.current.length > 0 ? completedWordsRef.current[completedWordsRef.current.length - 1] : "";
        let previousWordClean = previousWordRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        const latestWordRaw = currentWordRef.current;
        let wordToAdd = latestWordRaw;
        
        if (wordToAdd) {
            let nextWordClean = words[words.length - 1]?.toLowerCase() || "";
            
            // Check if there is a question word in the recent history
            const allWords = [...completedWordsRef.current, wordToAdd];
            const recentWords = allWords.slice(-6); // look at the last few words
            const hasQuestionWord = recentWords.some(w => questionWords.has(w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()));
            
            // apply punctuation
            if (sentenceEnders.has(wordToAdd.toLowerCase())) {
                wordToAdd += ".";
            } else if (hasQuestionWord && timeSinceLast > 1500) {
                wordToAdd += "?";
            }
            
            setCompletedWords(prev => {
              const next = [...prev, wordToAdd];
              completedWordsRef.current = next;
              return next;
            });
        }
        
        let newCurrent = words[words.length - 1];
        if (conjunctions.has(newCurrent.toLowerCase()) && wordToAdd && !wordToAdd.match(/[.,!?]$/)) {
            newCurrent = "," + newCurrent;
        }
        
        setCurrentWord(newCurrent);
        currentWordRef.current = newCurrent;
        lastUpdateRef.current = Date.now();
      } else {
        setCurrentWord(words[words.length - 1]);
        currentWordRef.current = words[words.length - 1];
      }
    } else {
      setCurrentWord("");
      currentWordRef.current = "";
    }
    
    lastTranscriptRef.current = transcript;

  }, [transcript, isRecording]);

  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [completedWords, currentWord]);

  return (
    <AnimatePresence>
      {(!isFadingOut && (isRecording || completedWords.length > 0 || currentWord.length > 0)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-full mb-8 z-50 pointer-events-none"
          style={{ width: "min(280px, 90vw)", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
        >
          <div 
            ref={containerRef}
            className="w-full text-center overflow-y-hidden"
            style={{ 
              maxHeight: "3em", // 2 lines with 1.5 line height
              lineHeight: 1.5,
              fontSize: "18px",
              color: "white"
            }}
          >
            <div className="flex flex-wrap justify-center content-end min-h-full items-end gap-x-[0.25em] pb-1">
                {completedWords.map((word, i) => (
                <span key={i} className="font-normal opacity-90 inline-block whitespace-nowrap">
                    {word}
                </span>
                ))}
                
                {currentWord && (
                <span className="font-medium inline-block whitespace-nowrap">
                    {currentWord.split('').map((char, index) => (
                    <motion.span
                        key={`${completedWords.length}-${index}-${char}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.04, ease: "easeOut", delay: index * 0.03 }}
                        className="inline-block"
                    >
                        {char}
                    </motion.span>
                    ))}
                </span>
                )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
