import { useState, FormEvent, useEffect, useRef } from "react";
import { SyncNote, NoteStatus, Frequency, NotePriority } from "../types";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addSyncNote, updateSyncNote } from "../services";
import { X, Save, Clock, Mic, Square, CircleSlash, Music } from "lucide-react";
import { format } from "date-fns";

interface NoteFormProps {
  onClose: () => void;
  projectId: string;
  note?: SyncNote | null;
}

export default function NoteForm({ onClose, projectId, note }: NoteFormProps) {
  const [content, setContent] = useState("");
  const [reminderStr, setReminderStr] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Once");
  const [status, setStatus] = useState<NoteStatus>("Pending");
  const [priority, setPriority] = useState<NotePriority>("Medium");
  const [dueDateStr, setDueDateStr] = useState("");
  const [audioData, setAudioData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setStatus(note.status);
      setFrequency(note.frequency || "Once");
      setPriority(note.priority || "Medium");
      setAudioData(note.audioData || null);
      if (note.reminderTime) {
        setReminderStr(
          format(new Date(note.reminderTime), "yyyy-MM-dd'T'HH:mm"),
        );
      }
      if (note.dueDate) {
        setDueDateStr(format(new Date(note.dueDate), "yyyy-MM-dd'T'HH:mm"));
      }
    }
  }, [note]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscription(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== "no-speech") {
          stopRecording();
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = async () => {
    setError("");
    const hasKey = await checkGeminiKey();
    if (!hasKey) {
      setError("No Gemini API key configured. Set it in Account Settings.");
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

      // Siri Waveform setup
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
        // We can get CSS vars using getComputedStyle
        const styles = getComputedStyle(document.documentElement);
        const c1 = styles.getPropertyValue('--theme-orb-1') || 'rgba(59,130,246,0.8)';
        const c2 = styles.getPropertyValue('--theme-orb-2') || 'rgba(139,92,246,0.8)';
        const c3 = styles.getPropertyValue('--theme-orb-3') || 'rgba(236,72,153,0.8)';
        
        drawWave(time, 0.8, c1);
        drawWave(time + 2, 0.6, c2);
        drawWave(time + 4, 0.7, c3);
      };
      
      draw();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          if (base64data.length > 800000) {
            alert(
              "Recorded audio is too large to save to database. Transcription will be saved instead.",
            );
            setAudioData(null);
          } else {
            setAudioData(base64data);
          }
          
          setLoading(true);
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
                mimeType: actualMimeType
              })
            });
            
            if (res.ok) {
              const contentType = res.headers.get("content-type");
              if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                if (text.includes("Action required to load your app")) {
                  throw new Error("Browser blocked the request. Please open the app in a new tab (top right icon) to use AI extraction.");
                }
                throw new Error("Received invalid response from server.");
              }
              const data = await res.json();
              if (data) {
                if (data.noteContent) setContent(prev => prev + (prev.trim() ? "\n\n" : "") + "[AI Extracted] " + data.noteContent);
                if (data.priority && ["Low", "Medium", "High"].includes(data.priority)) setPriority(data.priority as NotePriority);
                if (data.status && ["Pending", "Done"].includes(data.status)) setStatus(data.status as NoteStatus);
                
                if (data.timesPerDay !== undefined || (data.daysOfWeek && data.daysOfWeek.length > 0)) {
                    if (data.timesPerDay > 1 || (data.daysOfWeek && data.daysOfWeek.length > 0)) {
                        setFrequency("Daily");
                    }
                }
              }
            } else if (res.status === 400) {
               console.warn("Gemini API key might be missing in account settings");
            }
          } catch (e) {
            console.error("Failed to parse via Gemini", e);
          } finally {
            setLoading(false);
          }
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      recognitionRef.current?.start();
      setIsRecording(true);
      setTranscription("");
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    mediaRecorderRef.current?.stop();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close().catch(() => {});
    }
    recognitionRef.current?.stop();
    setIsRecording(false);

    if (transcription) {
      setContent((prev) => {
        const separator = prev.length > 0 ? "\n\n" : "";
        return prev + separator + "[Transcription] " + transcription;
      });
    }
    setTranscription("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !audioData) {
      setError("Note content or audio cannot be empty");
      return;
    }

    setLoading(true);
    setError("");

    const reminderTimestamp = reminderStr
      ? new Date(reminderStr).getTime()
      : null;
    const dueTimestamp = dueDateStr ? new Date(dueDateStr).getTime() : null;

    try {
      if (note) {
        await updateSyncNote(note.id, {
          content: content.trim(),
          reminderTime: reminderTimestamp,
          dueDate: dueTimestamp,
          frequency,
          status,
          priority,
          ...(audioData !== undefined && { audioData }),
        });
      } else {
        await addSyncNote({
          projectId,
          content: content.trim(),
          reminderTime: reminderTimestamp,
          dueDate: dueTimestamp,
          frequency,
          lastNotifiedAt: null,
          status,
          priority,
          ...(audioData && { audioData }),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-xl mx-auto rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 border-[var(--theme-border)]/50 bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40">
        <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {note ? "Edit Note" : "Add Note to Project"}
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--theme-text-secondary)] hover:text-slate-800 dark:hover:text-slate-100 p-1.5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        {error && (
          <div className="mb-4 bg-red-50/80 border border-red-200/50 text-red-700 px-3 py-2 rounded-xl text-sm backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div className="relative group">
            <textarea
              className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md rounded-2xl border border-white/40 dark:border-[var(--theme-border)]/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--theme-text-muted)] text-[var(--theme-text-primary)] resize-none text-base min-h-[120px] p-4 shadow-inner transition-all hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-secondary)]/70"
              placeholder="Jot down a task or record a voice note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required={!audioData}
              autoFocus
            />
            {isRecording && (
              <div className="absolute inset-x-2 bottom-3 mx-auto max-w-[90%] rounded-xl bg-[var(--theme-bg-primary)]/90 backdrop-blur-xl p-3 border border-[var(--theme-border)] shadow-lg animate-in slide-in-from-bottom-2 flex flex-col items-center">
                <canvas ref={canvasRef} width="200" height="40" className="w-full max-w-[200px] h-10 mb-2" />
                <p className="font-semibold text-blue-400 flex items-center mb-1 text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping" />
                  Listening...
                </p>
                <p className="text-[var(--theme-text-primary)] italic line-clamp-2 text-sm font-medium text-center">
                  "{transcription || "..."}"
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/80 border border-blue-200/50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                >
                  <Mic className="w-3.5 h-3.5 mr-1.5" />
                  Dictate Note
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50/80 border border-red-200/50 hover:bg-red-100 rounded-lg transition-colors shadow-sm animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 mr-1.5" />
                  Stop
                </button>
              )}
            </div>

            {audioData && (
              <div className="flex items-center bg-[var(--theme-bg-secondary)] text-[var(--theme-accent-text)] px-2.5 py-1 rounded-lg border border-emerald-200/50 text-xs font-bold shadow-sm backdrop-blur-md">
                <Music className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                Audio Attached
                <button
                  type="button"
                  onClick={() => setAudioData(null)}
                  className="ml-2 p-0.5 hover:bg-[var(--theme-bg-secondary)] rounded-md transition-colors"
                >
                  <CircleSlash className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {audioData && (
            <div className="animate-in fade-in p-1 rounded-full bg-[var(--theme-bg-card)] border border-white/30 shadow-sm backdrop-blur-md">
              <audio
                src={audioData}
                controls
                className="w-full h-8 rounded-full"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/20 border-[var(--theme-border)]/50">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 opacity-70" />
                Original Date / Due
              </label>
              <input
                type="datetime-local"
                className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-white/40 dark:border-[var(--theme-border)]/50 rounded-xl px-3 py-2 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium shadow-inner transition-colors"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 opacity-70" />
                Reminder
              </label>
              <input
                type="datetime-local"
                className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-white/40 dark:border-[var(--theme-border)]/50 rounded-xl px-3 py-2 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium shadow-inner transition-colors"
                value={reminderStr}
                onChange={(e) => setReminderStr(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5">
                Frequency
              </label>
              <div className="flex bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-white/40 dark:border-[var(--theme-border)]/50 rounded-xl p-1">
                {(["Never", "Once", "Daily", "Weekly"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      frequency === f
                        ? "bg-[var(--theme-bg-card)] dark:bg-slate-700 text-[var(--theme-accent-text)] text-[var(--theme-accent-text)] shadow-sm"
                        : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] dark:hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-secondary)]/50"
                    }`}
                  >
                    {f === "Never" ? "None" : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5">
                Priority
              </label>
              <div className="flex bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-white/40 dark:border-[var(--theme-border)]/50 rounded-xl p-1">
                {(["Low", "Medium", "High"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      priority === p
                        ? "bg-[var(--theme-bg-card)] dark:bg-slate-700 text-[var(--theme-accent-text)] text-[var(--theme-accent-text)] shadow-sm"
                        : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] dark:hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-secondary)]/50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-white/40 dark:border-[var(--theme-border)]/50 rounded-xl p-1 w-40">
            {(["Pending", "Done"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  status === s
                    ? s === "Done"
                      ? "bg-emerald-100 text-[var(--theme-accent-text)] dark:text-[var(--theme-accent-text)] shadow-sm"
                      : "bg-[var(--theme-bg-card)] dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] dark:hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-secondary)]/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-bold rounded-xl text-[var(--theme-text-secondary)] bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-card)] border border-white/50 focus:outline-none transition-colors backdrop-blur-md shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-5 py-1.5 shadow-lg shadow-blue-500/30 text-sm font-bold rounded-xl text-[var(--theme-text-primary)] bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all disabled:opacity-50"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
