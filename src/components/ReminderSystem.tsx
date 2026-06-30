import React, { useEffect, useRef, useState } from "react";
import { SyncNote } from "../types";
import { updateSyncNote, onToggleStatus } from "../services";
import { motion, AnimatePresence } from "motion/react";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { addMinutes, isFuture, isPast } from "date-fns";

export default function ReminderSystem({ notes }: { notes: SyncNote[] }) {
  const [activeReminder, setActiveReminder] = useState<SyncNote | null>(null);
  const timeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    const handleInteraction = () => {
      hasInteractedRef.current = true;
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const playBeep = () => {
    if (!hasInteractedRef.current) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
      gain.gain.setValueAtTime(0.5, startTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(440, now, 0.15); // A4
    playTone(880, now + 0.2, 0.2); // A5
  };

  const startTitleFlash = (reminderText: string) => {
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
    const originalTitle = "TrackerNote";
    let isOriginal = false;
    flashIntervalRef.current = setInterval(() => {
      if (document.hasFocus()) {
        stopTitleFlash();
        return;
      }
      document.title = isOriginal ? originalTitle : `🔔 ${reminderText}`;
      isOriginal = !isOriginal;
    }, 1500);
  };

  const stopTitleFlash = () => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    document.title = "TrackerNote";
  };

  useEffect(() => {
    const handleFocus = () => stopTitleFlash();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    // Clear existing timeouts
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};

    const now = new Date();
    const next24Hours = addMinutes(now, 24 * 60);

    notes.forEach((note) => {
      if (note.status !== "Pending" || !note.reminderTime) return;
      
      const remDate = new Date(note.reminderTime);
      
      // If reminder is in the past, maybe they just missed it or just logged in.
      // But prompt says: "check all notes... where reminder is within the next 24 hours".
      // Let's also include ones that are due now or slightly past but pending.
      // For precision, let's schedule if it's strictly in the future within 24h.
      if (isFuture(remDate) && remDate <= next24Hours) {
        const timeUntil = remDate.getTime() - Date.now();
        
        timeoutsRef.current[note.id] = setTimeout(() => {
          triggerReminder(note);
        }, timeUntil);
      }
    });

    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, [notes]);

  const triggerReminder = (note: SyncNote) => {
    setActiveReminder(note);
    playBeep();
    const titleText = note.reminderText || "Reminder";
    if (!document.hasFocus()) {
      startTitleFlash(titleText);
    }
  };

  const handleSnooze = () => {
    if (activeReminder) {
      const newReminderTime = addMinutes(new Date(), 10).getTime();
      updateSyncNote(activeReminder.id, { reminderTime: newReminderTime });
      setActiveReminder(null);
      stopTitleFlash();
    }
  };

  const handleMarkDone = async () => {
    if (activeReminder) {
      await onToggleStatus(activeReminder);
      setActiveReminder(null);
      stopTitleFlash();
    }
  };

  return (
    <AnimatePresence>
      {activeReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            // No onClick close!
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.2)] rounded-3xl p-8"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center animate-pulse">
                <AlertCircle className="w-8 h-8 text-indigo-400" />
              </div>
              
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                  {activeReminder.reminderText || "Reminder"}
                </h2>
                <p className="text-slate-300 text-lg">
                  {activeReminder.content.replace("[AI Extracted] ", "")}
                </p>
              </div>

              {activeReminder.priority && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  activeReminder.priority === "High" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                  activeReminder.priority === "Medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                  "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {activeReminder.priority} Priority
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button
                  onClick={handleSnooze}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700 flex items-center justify-center"
                >
                  <Clock className="w-5 h-5 mr-2 text-slate-400" />
                  Snooze 10 min
                </button>
                <button
                  onClick={handleMarkDone}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
