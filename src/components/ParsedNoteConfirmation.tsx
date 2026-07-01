import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle, Loader2, Save, RefreshCw } from "lucide-react";
import { ParsedNoteData } from "./VoiceNoteCreator";
import { normalizeStakeholder } from "../utils/stakeholderNormalizer";
import { addProject, addSyncNote } from "../services";
import { NotePriority, Frequency, NoteStatus } from "../types";

interface ParsedNoteConfirmationProps {
  parsedData: ParsedNoteData;
  existingStakeholders: string[];
  existingProjects: { id: string; name: string; assignee: string }[];
  onClose: () => void;
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ParsedNoteConfirmation({
  parsedData,
  existingStakeholders,
  existingProjects,
  onClose,
}: ParsedNoteConfirmationProps) {
  const [stakeholder, setStakeholder] = useState("");
  const [originalStakeholder, setOriginalStakeholder] = useState("");
  const [showMatchWarning, setShowMatchWarning] = useState(false);

  const [project, setProject] = useState(parsedData.project || "General");
  const [noteContent, setNoteContent] = useState(parsedData.noteContent || "");
  const [reminderText, setReminderText] = useState(parsedData.reminderText || "");
  const [timesPerDay, setTimesPerDay] = useState(parsedData.timesPerDay || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(parsedData.daysOfWeek || []);
  const [priority, setPriority] = useState<NotePriority>((parsedData.priority as NotePriority) || "Medium");

  const formatDatetimeLocal = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const defaultReminder = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      d.setMinutes(d.getMinutes() - 30);
      return d.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const [dueDateStr, setDueDateStr] = useState(formatDatetimeLocal(parsedData.dueDate));
  const [reminderStr, setReminderStr] = useState(defaultReminder(parsedData.dueDate));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  let calculatedFrequency: Frequency = "Once";
  if (timesPerDay > 1 || daysOfWeek.length > 0) {
    calculatedFrequency = "Daily";
  }

  let summaryBanner = `Reminding you to ${reminderText || "follow up"} with ${stakeholder} about ${project}`;
  if (dueDateStr) {
    try {
      const summaryDate = new Date(dueDateStr).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
      summaryBanner += `, due ${summaryDate}`;
    } catch (e) {}
  }
  if (calculatedFrequency !== "Once") {
    summaryBanner += `, repeating ${calculatedFrequency.toLowerCase()}`;
  }

  useEffect(() => {
    const raw = parsedData.stakeholder || "Me";
    const normalized = normalizeStakeholder(raw, existingStakeholders);
    
    setOriginalStakeholder(raw);
    
    if (normalized.toLowerCase() !== raw.toLowerCase() && existingStakeholders.includes(normalized)) {
      setStakeholder(normalized);
      setShowMatchWarning(true);
    } else {
      setStakeholder(normalized);
    }
  }, [parsedData, existingStakeholders]);

  const toggleDay = (day: string) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleConfirmSave = async () => {
    try {
      setIsSaving(true);
      setError("");

      let pId = "";
      const existingProject = existingProjects.find(
        (p) =>
          p.name.toLowerCase() === project.toLowerCase() &&
          p.assignee.toLowerCase() === stakeholder.toLowerCase()
      );

      if (existingProject) {
        pId = existingProject.id;
      } else {
        pId = await addProject({
          title: project,
          assignee: stakeholder,
          priority: priority,
          status: "Pending",
        } as any);
      }

      const dueTimestamp = dueDateStr ? new Date(dueDateStr).toISOString() : null;
      const remTimestamp = reminderStr ? new Date(reminderStr).toISOString() : null;

      await addSyncNote({
        projectId: pId,
        content: `[AI Extracted] ${noteContent}`,
        reminderText: reminderText,
        priority: priority,
        frequency: calculatedFrequency,
        timesPerDay: timesPerDay,
        daysOfWeek: daysOfWeek,
        status: "Pending",
        reminderTime: remTimestamp,
        dueDate: dueTimestamp,
      } as any);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-slate-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Review AI Note</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium text-sm leading-relaxed">
          {summaryBanner}
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-xl flex items-center justify-center font-medium">
            Saved successfully!
          </div>
        )}

        {showMatchWarning && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
            <div className="flex items-start text-yellow-400 text-sm mb-3">
              <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
              <p>We matched your voice input to <strong>"{stakeholder}"</strong>. Is that right?</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowMatchWarning(false)}
                className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                Yes, use {stakeholder}
              </button>
              <button
                onClick={() => {
                  setStakeholder(originalStakeholder);
                  setShowMatchWarning(false);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors border border-slate-700"
              >
                No, use new stakeholder
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Stakeholder
            </label>
            <input
              type="text"
              value={stakeholder}
              onChange={(e) => setStakeholder(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Project
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Note Content
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none scrollbar-thin"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Reminder Date
              </label>
              <input
                type="datetime-local"
                value={reminderStr}
                onChange={(e) => setReminderStr(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotePriority)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <div className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-400 flex items-center cursor-not-allowed">
                <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2" />
                Pending
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Reminder Text
            </label>
            <input
              type="text"
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Times Per Day
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={timesPerDay}
                onChange={(e) => setTimesPerDay(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    daysOfWeek.includes(day)
                      ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Leave empty to select every day.
            </p>
          </div>
        </div>

        <div className="mt-8 flex space-x-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-dictate
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Confirm & Save
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
