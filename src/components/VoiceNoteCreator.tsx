import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import VoiceOrb from "./VoiceOrb";
import KineticTranscription from "./KineticTranscription";

export interface ParsedNoteData {
  stakeholder: string;
  project: string;
  noteContent: string;
  reminderText: string;
  timesPerDay: number;
  daysOfWeek: string[];
  priority: string;
  dueDate?: string;
  status: string;
}

interface VoiceNoteCreatorProps {
  onParsed: (data: ParsedNoteData) => void;
  existingStakeholders: string[];
  onGoToSettings?: () => void;
}

export default function VoiceNoteCreator({ onParsed, existingStakeholders, onGoToSettings }: VoiceNoteCreatorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorType, setErrorType] = useState<"none" | "no-key" | "permission" | "api" | "size">("none");
  const [errorMessage, setErrorMessage] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [transcriptionSupported, setTranscriptionSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isInitializingMicRef = useRef(false);
  const finalTranscriptRef = useRef('');

  const [geminiKey, setGeminiKey] = useState<string | null>(null);
  const geminiKeyRef = useRef<string | null>(null);
  useEffect(() => { geminiKeyRef.current = geminiKey; }, [geminiKey]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      console.log('3. onresult fired, transcript:', event.results[event.resultIndex][0].transcript);
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + ' ';
        } else {
          interim += t;
        }
      }
      const combined = (finalTranscriptRef.current + interim).trim();
      console.log('4. setLiveTranscript called with:', combined);
      setInterimText(combined);
    };

    recognition.onerror = (event: any) => {
      console.error("SpeechRecognition error:", event.error);
    };

    recognition.onend = () => {
      console.log("SpeechRecognition onend fired");
      if (isRecordingRef.current || isInitializingMicRef.current) {
        try { recognition.start(); } catch(e){}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      stopTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const checkGeminiKey = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'integrations');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().geminiApiKey) {
        return docSnap.data().geminiApiKey;
      }
    } catch (e) {
      console.error("Error checking key", e);
    }
    return null;
  };

  const startTimer = () => {
    setRecordingSeconds(0);
    timerRef.current = window.setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMicClick = async () => {
    console.log('1. startRecording called');
    if (isRecording) {
      stopRecording();
      return;
    }

    // Reset errors
    setErrorType("none");
    setErrorMessage("");
    setInterimText("");

    const key = await checkGeminiKey();
    if (!key) {
      setErrorType("no-key");
      setErrorMessage("No Gemini key configured.");
      return;
    }
    setGeminiKey(key);
    geminiKeyRef.current = key;

    try {
            isInitializingMicRef.current = true;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try {
          recognitionRef.current.start();
        } catch(e) {}
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('2. getUserMedia resolved');
      } catch (e) {
        isInitializingMicRef.current = false;
        setErrorType("mic");
        setErrorMessage("Microphone permission denied.");
        return;
      }

      if (!isSafari && transcriptionSupported && recognitionRef.current) {
        finalTranscriptRef.current = '';
        try { recognitionRef.current.start(); } catch(e){}
      }
      
      let options: any = { audioBitsPerSecond: 32000 };
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm')) options.mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) options.mimeType = 'audio/mp4';
      }
            const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyserNode);
        setAnalyser(analyserNode);
      } catch(e) {
        console.error("AudioContext error", e);
      }

      setAudioStream(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        if (audioBlob.size > 3 * 1024 * 1024) {
          setErrorType("size");
          setErrorMessage("Recording is too long — please keep voice notes under 60 seconds");
          setIsParsing(false);
          stream.getTracks().forEach((track) => track.stop());
          setAudioStream(null);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          if (base64data.length > 800000) {
            setErrorType("size");
            setErrorMessage("Audio too large to process.");
            setIsParsing(false);
            return;
          }
          await processAudio(base64data, actualMimeType);
        };
        stream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      isRecordingRef.current = true;
      isInitializingMicRef.current = false;
      
      startTimer();
    } catch (err: any) {
      console.error("Recording error:", err);
      isInitializingMicRef.current = false;
      setErrorType("permission");
      setErrorMessage(err.message || "Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsParsing(true);
    stopTimer();
    mediaRecorderRef.current?.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const processAudio = async (base64data: string, mimeType: string = 'audio/webm') => {
    try {
      const authUser = auth.currentUser;
      if (!authUser) throw new Error("Not authenticated");

      let displayName = "";
      try {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().displayName) {
          displayName = userDocSnap.data().displayName;
        }
      } catch(e) {
        console.error("Error fetching displayName", e);
      }

      const b64 = base64data.split(',')[1] || base64data;
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: authUser.uid,
          audioBase64: b64,
          mimeType: mimeType,
          displayName: displayName,
          geminiApiKey: geminiKeyRef.current,
          transcript: interimText
        })
      });

      if (!res.ok) {
        if (res.status === 400) {
          setErrorType("no-key");
          setErrorMessage("Gemini API key missing in settings.");
        } else {
          setErrorType("api");
          setErrorMessage("Failed to parse via Gemini.");
        }
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        if (text.includes("Action required to load your app")) {
          throw new Error("Browser blocked the request. Please open the app in a new tab (top right icon) to use voice notes.");
        }
        throw new Error("Received invalid response from server.");
      }

      const data = await res.json();
      if (!data) {
        setErrorType("api");
        setErrorMessage("Empty response from AI.");
        return;
      }

      // Success
      setErrorType("none");
      onParsed(data as ParsedNoteData);

    } catch (e: any) {
      console.error(e);
      setErrorType("api");
      setErrorMessage(e.message || "An error occurred.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Messages */}
      <AnimatePresence mode="wait">
        {errorType === "no-key" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-[var(--theme-bg-secondary)]/80 backdrop-blur-md border border-[var(--theme-border)] p-4 rounded-xl shadow-lg max-w-sm text-center"
          >
            <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-slate-200 text-sm mb-3">Set up your Gemini key in Account Settings to use Voice Notes.</p>
            {onGoToSettings && (
              <button onClick={onGoToSettings} className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)] text-[var(--theme-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Go to Settings
              </button>
            )}
          </motion.div>
        )}
        
        {errorType === "permission" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-[var(--theme-bg-secondary)]/80 backdrop-blur-md border border-red-500/30 p-4 rounded-xl shadow-lg max-w-sm text-center"
          >
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-slate-200 text-sm mb-3">Microphone access is needed to record voice notes.</p>
            <button onClick={() => setErrorType("none")} className="bg-slate-700 hover:bg-slate-600 text-[var(--theme-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Dismiss
            </button>
          </motion.div>
        )}

        {errorType === "api" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-[var(--theme-bg-secondary)]/80 backdrop-blur-md border border-red-500/30 p-4 rounded-xl shadow-lg max-w-sm text-center"
          >
            <p className="text-red-400 text-sm mb-3 font-medium">{errorMessage}</p>
            <button onClick={() => setErrorType("none")} className="bg-slate-700 hover:bg-slate-600 text-[var(--theme-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Try again
            </button>
          </motion.div>
        )}
        
        {errorType === "size" && (
           <motion.div
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
           className="mb-4 bg-[var(--theme-bg-secondary)]/80 backdrop-blur-md border border-red-500/30 p-4 rounded-xl shadow-lg max-w-sm text-center"
         >
           <p className="text-red-400 text-sm mb-3 font-medium">{errorMessage}</p>
           <button onClick={() => setErrorType("none")} className="bg-slate-700 hover:bg-slate-600 text-[var(--theme-text-primary)] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
             Dismiss
           </button>
         </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mic Button / Recorder UI */}
      {errorType === "none" && (
        <div className="relative flex flex-col items-center justify-center w-full" style={{ position: 'relative' }}>
          
          <KineticTranscription transcript={interimText} isRecording={isRecording} />

          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full mb-[5.5rem] flex flex-col items-center bg-[var(--theme-bg-primary)]/90 backdrop-blur-xl border border-[var(--theme-border)]/50 rounded-2xl p-4 shadow-2xl w-[260px]"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-semibold tracking-wider text-[var(--theme-text-primary)] uppercase">Recording</span>
                  </div>
                  <span className="font-mono text-sm font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)]/50 px-2 py-0.5 rounded">
                    {formatTime(recordingSeconds)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isParsing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full mb-6 flex flex-col items-center bg-[var(--theme-bg-primary)]/90 backdrop-blur-xl border border-[var(--theme-border)]/50 rounded-2xl p-4 shadow-2xl w-[260px]"
              >
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 text-[var(--theme-accent-text)] animate-spin" />
                  <span className="text-xs text-[var(--theme-text-primary)] font-medium tracking-wide">Parsing your note...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex justify-center w-full">
            <VoiceOrb 
              state={isParsing ? "parsing" : isRecording ? "recording" : "idle"}
              onClick={handleMicClick}
              analyser={analyser}
            />
          </div>
          
          {!transcriptionSupported && (
            <div className="mt-4 text-xs font-medium text-[var(--theme-text-muted)] text-center px-4">
              Live preview unavailable in this browser — your note will still be transcribed after recording.
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
