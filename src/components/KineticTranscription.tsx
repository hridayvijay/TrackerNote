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

  useEffect(() => {
    if (!isRecording) {
      if (completedWords.length > 0 || currentWord) {
        if (currentWord) {
          setCompletedWords(prev => [...prev, currentWord]);
          setCurrentWord("");
        }
        const timer1 = setTimeout(() => {
          setIsFadingOut(true);
        }, 800);
        return () => clearTimeout(timer1);
      }
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
        const previousWordRaw = completedWords.length > 0 ? completedWords[completedWords.length - 1] : "";
        let previousWordClean = previousWordRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        const latestWordRaw = currentWord;
        let wordToAdd = latestWordRaw;
        
        if (wordToAdd) {
            let nextWordClean = words[words.length - 1]?.toLowerCase() || "";
            
            // Check if there is a question word in the recent history
            const allWords = [...completedWords, wordToAdd];
            const recentWords = allWords.slice(-6); // look at the last few words
            const hasQuestionWord = recentWords.some(w => questionWords.has(w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()));
            
            // apply punctuation
            if (sentenceEnders.has(wordToAdd.toLowerCase())) {
                wordToAdd += ".";
            } else if (hasQuestionWord && timeSinceLast > 1500) {
                wordToAdd += "?";
            }
            
            setCompletedWords(prev => [...prev, wordToAdd]);
        }
        
        let newCurrent = words[words.length - 1];
        if (conjunctions.has(newCurrent.toLowerCase()) && wordToAdd && !wordToAdd.match(/[.,!?]$/)) {
            newCurrent = "," + newCurrent;
        }
        
        setCurrentWord(newCurrent);
        lastUpdateRef.current = Date.now();
      } else {
        setCurrentWord(words[words.length - 1]);
      }
    } else {
      setCurrentWord("");
    }
    
    lastTranscriptRef.current = transcript;

  }, [transcript, isRecording]);

  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [completedWords, currentWord]);

  if (!isRecording && isFadingOut) {
    return null;
  }

  return (
    <AnimatePresence>
      {(!isFadingOut && (completedWords.length > 0 || currentWord)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-full mb-8 z-50 pointer-events-none"
          style={{ width: "min(280px, 90vw)", left: "50%", transform: "translateX(-50%)" }}
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
