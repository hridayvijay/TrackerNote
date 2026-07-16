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
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const latestTranscriptRef = useRef('');
  const shouldRestartRecognitionRef = useRef(false);
  const recognitionRestartTimerRef = useRef<number | null>(null);
  const startRecognitionRef = useRef<() => void>(() => {});
  const stopRecognitionRef = useRef<() => void>(() => {});

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

    let recognitionActive = false;
    let recognitionStarting = false;

    const clearRecognitionRestart = () => {
      if (recognitionRestartTimerRef.current !== null) {
        window.clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
      }
    };

    const startRecognitionNow = (): void => {
      clearRecognitionRestart();
      if (!shouldRestartRecognitionRef.current || recognitionActive || recognitionStarting) return;
      try {
        recognitionStarting = true;
        recognition.start();
      } catch (error) {
        recognitionStarting = false;
        console.error("Failed to start SpeechRecognition:", error);
        if (shouldRestartRecognitionRef.current) scheduleRecognitionStart(300);
      }
    };

    const scheduleRecognitionStart = (delay = 250): void => {
      clearRecognitionRestart();
      recognitionRestartTimerRef.current = window.setTimeout(() => {
        recognitionRestartTimerRef.current = null;
        startRecognitionNow();
      }, delay);
    };

    // The first start must run in the original click task. Restarts use the
    // delayed scheduler only after Chrome has fully ended the previous session.
    startRecognitionRef.current = startRecognitionNow;
    stopRecognitionRef.current = () => {
      shouldRestartRecognitionRef.current = false;
      clearRecognitionRestart();
      if (recognitionActive || recognitionStarting) recognition.abort();
      recognitionStarting = false;
    };

    recognition.onstart = () => {
      recognitionStarting = false;
      recognitionActive = true;
    };

    recognition.onaudiostart = () => console.info("SpeechRecognition audio capture started");
    recognition.onspeechstart = () => console.info("SpeechRecognition detected speech");

    recognition.onresult = (event: any) => {
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
      latestTranscriptRef.current = combined;
      setInterimText(combined);
    };

    recognition.onerror = (event: any) => {
      recognitionStarting = false;
      console.error("SpeechRecognition error:", event.error);
      if (["not-allowed", "service-not-allowed", "audio-capture", "network"].includes(event.error)) {
        shouldRestartRecognitionRef.current = false;
        clearRecognitionRestart();
        setTranscriptionSupported(false);
      }
    };

    recognition.onend = () => {
      recognitionStarting = false;
      recognitionActive = false;
      // Chromium often ignores continuous=true and ends after a phrase. Waiting
      // for teardown avoids InvalidStateError on Windows and Android.
      if (shouldRestartRecognitionRef.current) scheduleRecognitionStart();
    };

    recognitionRef.current = recognition;

    return () => {
      stopTimer();
      shouldRestartRecognitionRef.current = false;
      clearRecognitionRestart();
      if (recognitionActive) recognition.abort();
      recognitionRef.current = null;
      startRecognitionRef.current = () => {};
      stopRecognitionRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close().catch(() => {});
      }
      audioChunksRef.current = [];
      audioStreamRef.current = null;
      audioContextRef.current = null;
      mediaRecorderRef.current = null;
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
    if (isRecording) {
      stopRecording();
      return;
    }

    // Reset errors
    setErrorType("none");
    setErrorMessage("");
    setInterimText("");
    latestTranscriptRef.current = '';
    finalTranscriptRef.current = '';

    // Chrome's recognizer is intentionally started before any await and before
    // MediaRecorder claims the microphone. This preserves the click activation
    // and avoids the Windows capture-order race.
    if (transcriptionSupported && recognitionRef.current) {
      shouldRestartRecognitionRef.current = true;
      startRecognitionRef.current();
    }

    const key = await checkGeminiKey();
    if (!key) {
      stopRecognitionRef.current();
      setErrorType("no-key");
      setErrorMessage("No Gemini key configured.");
      return;
    }
    setGeminiKey(key);
    geminiKeyRef.current = key;

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        stopRecognitionRef.current();
        setErrorType("permission");
        setErrorMessage("Microphone permission denied.");
        return;
      }
      audioStreamRef.current = stream;

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
        audioContextRef.current = audioCtx;
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

        // The Blob now owns the bytes needed by FileReader; release capture
        // resources immediately and never retain audio in component state.
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        audioStreamRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current?.state !== "closed") {
          audioContextRef.current?.close().catch(() => {});
        }
        audioContextRef.current = null;
        setAnalyser(null);
        setAudioStream(null);
        
        if (audioBlob.size > 3 * 1024 * 1024) {
          setErrorType("size");
          setErrorMessage("Recording is too long — please keep voice notes under 60 seconds");
          setIsParsing(false);
          return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64data = reader.result as string;
            if (base64data.length > 800000) {
              setErrorType("size");
              setErrorMessage("Audio too large to process.");
              setIsParsing(false);
              return;
            }
            await processAudio(base64data, actualMimeType);
          } finally {
            reader.onload = null;
            reader.onerror = null;
          }
        };
        reader.onerror = () => {
          reader.onload = null;
          reader.onerror = null;
          setErrorType("api");
          setErrorMessage("Could not read the recorded audio.");
          setIsParsing(false);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      
      startTimer();
    } catch (err: any) {
      console.error("Recording error:", err);
      shouldRestartRecognitionRef.current = false;
      stopRecognitionRef.current();
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close().catch(() => {});
      }
      audioChunksRef.current = [];
      audioStreamRef.current = null;
      audioContextRef.current = null;
      mediaRecorderRef.current = null;
      setAudioStream(null);
      setAnalyser(null);
      setErrorType("permission");
      setErrorMessage(err.message || "Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsParsing(true);
    stopTimer();
    mediaRecorderRef.current?.stop();
    stopRecognitionRef.current();
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
          transcript: latestTranscriptRef.current
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
      audioChunksRef.current = [];
      latestTranscriptRef.current = '';
      finalTranscriptRef.current = '';
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
