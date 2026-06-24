import { useState, FormEvent, useEffect, useRef } from "react";
import { SyncNote, NoteStatus, Frequency, NotePriority } from "../types";
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (base64data.length > 800000) {
            alert(
              "Recorded audio is too large to save to database. Transcription will be saved instead.",
            );
            setAudioData(null);
          } else {
            setAudioData(base64data);
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/40">
        <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {note ? "Edit Note" : "Add Note to Project"}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 p-1.5 rounded-full transition-colors"
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
              className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/40 dark:border-slate-700/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:text-slate-100 resize-none text-base min-h-[120px] p-4 shadow-inner transition-all hover:bg-white/70 dark:hover:bg-slate-800/70"
              placeholder="Jot down a task or record a voice note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required={!audioData}
              autoFocus
            />
            {isRecording && (
              <div className="absolute inset-x-2 bottom-3 mx-auto max-w-[90%] rounded-xl bg-blue-100/90 dark:bg-blue-900/90 backdrop-blur-xl p-3 border border-white/50 shadow-lg animate-in slide-in-from-bottom-2">
                <p className="font-semibold text-blue-800 flex items-center mb-1 text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping" />
                  Listening...
                </p>
                <p className="text-blue-900 italic line-clamp-2 text-sm font-medium">
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
              <div className="flex items-center bg-emerald-50/80 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200/50 text-xs font-bold shadow-sm backdrop-blur-md">
                <Music className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                Audio Attached
                <button
                  type="button"
                  onClick={() => setAudioData(null)}
                  className="ml-2 p-0.5 hover:bg-emerald-200/50 rounded-md transition-colors"
                >
                  <CircleSlash className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {audioData && (
            <div className="animate-in fade-in p-1 rounded-full bg-white/50 border border-white/30 shadow-sm backdrop-blur-md">
              <audio
                src={audioData}
                controls
                className="w-full h-8 rounded-full"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/20 dark:border-slate-800/50">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 opacity-70" />
                Original Date / Due
              </label>
              <input
                type="datetime-local"
                className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium shadow-inner transition-colors"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 opacity-70" />
                Reminder
              </label>
              <input
                type="datetime-local"
                className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium shadow-inner transition-colors"
                value={reminderStr}
                onChange={(e) => setReminderStr(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Frequency
              </label>
              <select
                className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold shadow-inner transition-colors"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                <option value="Never">None</option>
                <option value="Once">Once</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold shadow-inner transition-colors"
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotePriority)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <select
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-3 py-1.5 font-bold text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            value={status}
            onChange={(e) => setStatus(e.target.value as NoteStatus)}
          >
            <option value="Pending">Pending</option>
            <option value="Done">Done</option>
          </select>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-bold rounded-xl text-slate-600 bg-white/50 hover:bg-white/80 border border-white/50 focus:outline-none transition-colors backdrop-blur-md shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-5 py-1.5 shadow-lg shadow-blue-500/30 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all disabled:opacity-50"
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
