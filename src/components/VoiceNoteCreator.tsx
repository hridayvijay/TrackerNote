import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import VoiceOrb, { OrbStyle } from "./VoiceOrb";
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
  const [livePreviewError, setLivePreviewError] = useState<string | null>(null);
  const [orbStyle, setOrbStyle] = useState<OrbStyle>("3d");

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
  const startRecognitionRef = useRef<(audioTrack?: MediaStreamTrack) => void>(() => {});
  const stopRecognitionRef = useRef<(immediate?: boolean) => void>(() => {});

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
    // Phrase-sized sessions are more consistent across desktop and Android
    // Chromium. onend restarts while recording, preserving a continuous UI.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let recognitionActive = false;
    let recognitionStarting = false;
    let recognitionAudioTrack: MediaStreamTrack | null = null;
    let intentionalStop = false;

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
        if (recognitionAudioTrack) recognition.start(recognitionAudioTrack);
        else recognition.start();
      } catch (error) {
        recognitionStarting = false;
        if (recognitionAudioTrack && error instanceof TypeError) {
          // Safari currently exposes only start(). Keep its previously working
          // path while Chromium uses the shared-track overload.
          recognitionAudioTrack = null;
          try {
            recognitionStarting = true;
            recognition.start();
            return;
          } catch (fallbackError) {
            recognitionStarting = false;
            console.error("Failed to start SpeechRecognition fallback:", fallbackError);
          }
        }
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
    startRecognitionRef.current = (audioTrack?: MediaStreamTrack) => {
      intentionalStop = false;
      recognitionAudioTrack = audioTrack ?? null;
      startRecognitionNow();
    };
    stopRecognitionRef.current = (immediate = false) => {
      shouldRestartRecognitionRef.current = false;
      clearRecognitionRestart();
      intentionalStop = true;
      if (recognitionActive || recognitionStarting) {
        if (immediate) recognition.abort();
        else recognition.stop();
      }
      recognitionStarting = false;
      recognitionAudioTrack = null;
    };

    recognition.onstart = () => {
      recognitionStarting = false;
      recognitionActive = true;
      setLivePreviewError(null);
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
      if (event.error === "aborted" && intentionalStop) return;
      if (event.error === "no-speech") {
        setLivePreviewError(null);
        return;
      }
      setLivePreviewError(event.error || "unknown error");
      if (["not-allowed", "service-not-allowed", "audio-capture", "network"].includes(event.error)) {
        shouldRestartRecognitionRef.current = false;
        clearRecognitionRestart();
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
      intentionalStop = true;
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
    setLivePreviewError(null);
    latestTranscriptRef.current = '';
    finalTranscriptRef.current = '';

    const key = await checkGeminiKey();
    if (!key) {
      stopRecognitionRef.current(true);
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
        stopRecognitionRef.current(true);
        setErrorType("permission");
        setErrorMessage("Microphone permission denied.");
        return;
      }
      audioStreamRef.current = stream;

      if (transcriptionSupported && recognitionRef.current) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          // Chromium can consume the existing MediaStreamTrack. Sharing it with
          // MediaRecorder avoids a second Windows microphone capture session.
          shouldRestartRecognitionRef.current = true;
          startRecognitionRef.current(audioTrack);
        }
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
      stopRecognitionRef.current(true);
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
    stopRecognitionRef.current();
    mediaRecorderRef.current?.stop();
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
          <div
            className="relative z-20 mb-2 flex min-h-7 items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg-card)]/85 p-0.5 shadow-lg backdrop-blur-md"
            aria-label={isRecording ? "Recording status" : "Voice orb style"}
          >
            {isRecording ? (
              <div className="flex items-center gap-2 px-2.5 py-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--theme-text-primary)]">
                  {formatTime(recordingSeconds)}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                  {orbStyle}
                </span>
              </div>
            ) : (
              (["2d", "3d"] as OrbStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  disabled={isParsing}
                  onClick={() => setOrbStyle(style)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    orbStyle === style
                      ? "bg-[var(--theme-accent)] text-[var(--theme-bg-primary)]"
                      : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                  }`}
                >
                  {style}
                </button>
              ))
            )}
          </div>

          <KineticTranscription transcript={interimText} isRecording={isRecording} />

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
              orbStyle={orbStyle}
            />
          </div>
          
          {(!transcriptionSupported || livePreviewError) && (
            <div className="mt-4 text-xs font-medium text-[var(--theme-text-muted)] text-center px-4">
              Live preview unavailable{livePreviewError ? ` (${livePreviewError})` : " in this browser"} — your note will still be transcribed after recording.
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
