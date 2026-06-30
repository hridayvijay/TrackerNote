import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

export interface ParsedNoteData {
  stakeholder: string;
  project: string;
  noteContent: string;
  reminderText: string;
  timesPerDay: number;
  daysOfWeek: string[];
  priority: string;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Siri animation refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      stopSiriAnimation();
    };
  }, []);

  const checkGeminiKey = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'integrations');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().geminiApiKey) {
        return true;
      }
    } catch (e) {
      console.error("Error checking key", e);
    }
    return false;
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

  const stopSiriAnimation = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close().catch(() => {});
    }
  };

  const setupSiriAnimation = (stream: MediaStream) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const drawWave = (offset: number, scale: number, color: string) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          let x = 0;
          const slice = width / bufferLength;
          for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 255.0; // 0 to 1
              const centerDist = 1 - Math.abs(i - bufferLength / 2) / (bufferLength / 2);
              const amplitude = (v * height * scale * centerDist) / 2;
              
              const y = centerY + Math.sin(i * 0.1 + offset) * amplitude;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
              
              x += slice;
          }
          ctx.stroke();
      };

      const time = Date.now() / 150;
      drawWave(time, 0.8, "rgba(59,130,246, 0.8)");
      drawWave(time + 2, 0.6, "rgba(139,92,246, 0.8)");
      drawWave(time + 4, 0.7, "rgba(236,72,153, 0.8)");
    };
    
    draw();
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

    const hasKey = await checkGeminiKey();
    if (!hasKey) {
      setErrorType("no-key");
      setErrorMessage("No Gemini key configured.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options;
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm')) options = { mimeType: 'audio/webm' };
        else if (MediaRecorder.isTypeSupported('audio/mp4')) options = { mimeType: 'audio/mp4' };
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      setupSiriAnimation(stream);

      // Start SpeechRecognition for live text
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        let finalTranscript = '';
        
        recognition.onresult = (event: any) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }
          const display = (finalTranscript + ' ' + currentInterim).trim();
          setInterimText(display);
        };
        recognition.onerror = (event: any) => {
          console.error("SpeechRecognition error:", event.error);
        };
        // Restart if it stops automatically
        recognition.onend = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && recognitionRef.current) {
             try { recognition.start(); } catch(e){}
          }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
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
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error("Recording error:", err);
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
    stopSiriAnimation();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const processAudio = async (base64data: string, mimeType: string = 'audio/webm') => {
    try {
      const authUser = auth.currentUser;
      if (!authUser) throw new Error("Not authenticated");

      const b64 = base64data.split(',')[1] || base64data;
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: authUser.uid,
          audioBase64: b64,
          mimeType: mimeType
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
            className="mb-4 bg-slate-800/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg max-w-sm text-center"
          >
            <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-slate-200 text-sm mb-3">Set up your Gemini key in Account Settings to use Voice Notes.</p>
            {onGoToSettings && (
              <button onClick={onGoToSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Go to Settings
              </button>
            )}
          </motion.div>
        )}
        
        {errorType === "permission" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-slate-800/80 backdrop-blur-md border border-red-500/30 p-4 rounded-xl shadow-lg max-w-sm text-center"
          >
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-slate-200 text-sm mb-3">Microphone access is needed to record voice notes.</p>
            <button onClick={() => setErrorType("none")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Dismiss
            </button>
          </motion.div>
        )}

        {errorType === "api" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-slate-800/80 backdrop-blur-md border border-red-500/30 p-4 rounded-xl shadow-lg max-w-sm text-center"
          >
            <p className="text-red-400 text-sm mb-3 font-medium">{errorMessage}</p>
            <button onClick={() => setErrorType("none")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Try again
            </button>
          </motion.div>
        )}
        
        {errorType === "size" && (
           <motion.div
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
           className="mb-4 bg-slate-800/80 backdrop-blur-md border border-red-500/30 p-4 rounded-xl shadow-lg max-w-sm text-center"
         >
           <p className="text-red-400 text-sm mb-3 font-medium">{errorMessage}</p>
           <button onClick={() => setErrorType("none")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
             Dismiss
           </button>
         </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mic Button / Recorder UI */}
      {errorType === "none" && (
        <div className="relative flex flex-col items-center">
          
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full mb-6 flex flex-col items-center bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl w-[260px]"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Recording</span>
                  </div>
                  <span className="font-mono text-sm font-medium text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded">
                    {formatTime(recordingSeconds)}
                  </span>
                </div>
                
                <canvas ref={canvasRef} width="220" height="60" className="w-full h-14" />
                {interimText && (
                  <div className="mt-4 px-4 w-full">
                    <p className="text-sm text-slate-300 italic text-center w-full max-h-16 overflow-y-auto leading-relaxed">
                      "{interimText}"
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isParsing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full mb-6 flex flex-col items-center bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl w-[200px]"
              >
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-3" />
                <span className="text-xs text-slate-300 font-medium tracking-wide">Parsing your note...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            {/* Pulsing ring when recording */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: [0.5, 0], scale: [1, 1.8] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-red-500 z-0 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMicClick}
              disabled={isParsing}
              className={`relative z-10 flex items-center justify-center w-20 h-20 rounded-full shadow-2xl transition-all duration-300 overflow-hidden group ${
                isRecording 
                  ? "shadow-red-500/30 ring-4 ring-red-500/20" 
                  : isParsing
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]"
              }`}
            >
              {!isParsing && (
                <>
                  {/* Deep translucent background */}
                  <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md" />
                  
                  {/* Swirling animated gradients (Cyan, Magenta, Blue) */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="absolute -inset-[50%] opacity-90 mix-blend-screen"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 0%, rgba(6, 182, 212, 0.8) 25%, transparent 50%, rgba(236, 72, 153, 0.8) 75%, transparent 100%)',
                      filter: 'blur(15px)'
                    }}
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute -inset-[50%] opacity-80 mix-blend-screen"
                    style={{
                      background: 'conic-gradient(from 90deg, transparent 0%, rgba(59, 130, 246, 0.9) 30%, transparent 60%, rgba(6, 182, 212, 0.6) 90%, transparent 100%)',
                      filter: 'blur(15px)'
                    }}
                  />

                  {/* Inner glow and glassy border */}
                  <div className="absolute inset-0 rounded-full border-[2px] border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)] pointer-events-none" />
                  
                  {/* Specular highlights for 3D bubble effect */}
                  <div className="absolute top-[5%] left-[20%] right-[20%] h-[30%] bg-gradient-to-b from-white/60 to-transparent rounded-[100%] blur-[2px] pointer-events-none opacity-80" />
                  <div className="absolute bottom-[5%] left-[15%] right-[15%] h-[20%] bg-gradient-to-t from-white/30 to-transparent rounded-[100%] blur-[2px] pointer-events-none opacity-60" />
                </>
              )}

              <div className="relative z-30 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {isRecording ? <Square className="w-7 h-7 fill-current text-white" /> : <Mic className="w-8 h-8" />}
              </div>
            </motion.button>
          </div>
          
        </div>
      )}
    </div>
  );
}
