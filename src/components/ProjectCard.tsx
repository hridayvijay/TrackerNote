import { SyncProject, SyncNote, NoteStatus } from "../types";
import {
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  Circle,
  Repeat,
  Mic,
  Plus,
  GripVertical,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { cn } from "../lib/utils";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { substituteYou } from "../utils/youReference";

interface ProjectCardProps {
  key?: string | number;
  index?: number;
  project: SyncProject;
  notes: SyncNote[];
  currentUserDisplayName: string;
  onEditProject: (project: SyncProject) => void;
  onDeleteProject: (projectId: string) => void;
  onAddNote: (projectId: string) => void;
  onEditNote: (note: SyncNote) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleNoteStatus: (note: SyncNote) => void;
  onDropNote: (noteId: string, toProjectId: string) => void;
}

export default function ProjectCard({
  index = 0,
  project,
  notes,
  currentUserDisplayName,
  onEditProject,
  onDeleteProject,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onToggleNoteStatus,
  onDropNote,
}: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    const noteId = e.dataTransfer.getData("noteId");
    if (noteId) {
      onDropNote(noteId, project.id);
    }
  };

  const priorityWeights = { High: 3, Medium: 2, Low: 1 };

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      // Done items go to bottom
      if (a.status === "Done" && b.status !== "Done") return 1;
      if (b.status === "Done" && a.status !== "Done") return -1;

      const pA = priorityWeights[a.priority || "Medium"];
      const pB = priorityWeights[b.priority || "Medium"];
      if (pA !== pB) return pB - pA;
      return b.createdAt - a.createdAt;
    });
  }, [notes]);

  const upcomingReminders = sortedNotes.filter(
    (n) =>
      n.reminderTime &&
      isFuture(new Date(n.reminderTime)) &&
      n.status !== "Done",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="glass-panel rounded-2xl overflow-hidden shadow-md flex flex-col transition-all mb-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--theme-bg-card-hover)] transition-colors",
          isExpanded
            ? "border-b border-[var(--theme-border)] bg-[var(--theme-bg-card)]"
            : "",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("projectId", project.id)}
      >
        <div className="flex items-center space-x-3 pr-2 flex-1 min-w-0">
          <GripVertical className="w-4 h-4 text-[var(--theme-text-muted)] opacity-50 shrink-0 cursor-grab active:cursor-grabbing" />
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[var(--theme-text-primary)] whitespace-normal leading-tight break-words text-[16px]">
              {project.title}
            </h4>
            <div className="flex flex-wrap items-center text-[10px] text-[var(--theme-text-secondary)] font-medium mt-1.5 gap-2">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1 opacity-70" />
                {format(new Date(project.createdAt), "MMM d")}
              </span>
              
              {project.dueDate && (
                <span className="flex items-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3 mr-1" />
                  Due {format(new Date(project.dueDate), "MMM d")}
                </span>
              )}

              {project.priority && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded uppercase tracking-wider font-bold text-[9px]",
                  project.priority === "High" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  project.priority === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {project.priority}
                </span>
              )}

              {project.status && project.status === "Done" && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[var(--theme-accent-text)] dark:text-[var(--theme-accent-text)] uppercase tracking-wider font-bold text-[9px]">
                  Done
                </span>
              )}

              <span className="opacity-50">•</span>
              <span className="text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)]">{notes.length} notes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditProject(project);
            }}
            className="p-1.5 text-[var(--theme-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-[var(--theme-bg-card-hover)] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteProject(project.id);
            }}
            className="p-1.5 text-[var(--theme-text-muted)] hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-[var(--theme-bg-card-hover)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 bg-black/5 dark:bg-black/20 border-t border-[var(--theme-border)] flex flex-col space-y-3">
          {upcomingReminders.length > 0 && (
            <div className="mb-2 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl">
              <h5 className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-2 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Project Reminders
                (Upcoming)
              </h5>
              <div className="space-y-1.5">
                {upcomingReminders.slice(0, 3).map((rem) => (
                  <div
                    key={rem.id}
                    className="text-xs flex items-center justify-between font-medium"
                  >
                    <span className="truncate text-amber-900 dark:text-amber-200 opacity-80 mr-2 max-w-[140px]">
                      {rem.content}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {format(new Date(rem.reminderTime!), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedNotes.length === 0 ? (
            <p className="text-sm text-center py-4 text-[var(--theme-text-secondary)] italic">
              No notes yet. Drag a note here or add one.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {sortedNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  currentUserDisplayName={currentUserDisplayName}
                  onEdit={() => onEditNote(note)}
                  onDelete={() => onDeleteNote(note.id)}
                  onToggleStatus={() => onToggleNoteStatus(note)}
                />
              ))}
            </AnimatePresence>
          )}

          <button
            onClick={() => onAddNote(project.id)}
            className="w-full py-2 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-800/40 border border-blue-200/50 dark:border-blue-800/50 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Note
          </button>
        </div>
      )}
    </motion.div>
  );
}

function NoteItem({ note, currentUserDisplayName, onEdit, onDelete, onToggleStatus }: any) {
  const isDone = note.status === "Done";

  const priorityColors = {
    High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
    Medium:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
    Low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
  };

  const priorityClass =
    priorityColors[note.priority as keyof typeof priorityColors] ||
    priorityColors.Medium;

  const displayContent = substituteYou(note.content, currentUserDisplayName);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-[var(--theme-bg-card)] backdrop-blur-md rounded-xl p-3 border border-[var(--theme-border)] shadow-sm group relative cursor-grab active:cursor-grabbing",
        isDone ? "opacity-60" : "",
      )}
      draggable
      onDragStart={(e: any) => {
        e.stopPropagation(); // prevent project drag
        e.dataTransfer.setData("noteId", note.id);
      }}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={onToggleStatus}
          className={cn(
            "mt-0.5 shrink-0 transition-colors",
            isDone ? "text-blue-500" : "text-[var(--theme-text-primary)] hover:text-blue-500",
          )}
        >
          {isDone ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0 pb-1">
          <p
            className={cn(
              "text-sm font-medium whitespace-pre-wrap leading-snug",
              isDone
                ? "line-through text-[var(--theme-text-secondary)]"
                : "text-[var(--theme-text-primary)]",
            )}
          >
            {displayContent}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div
              className={cn(
                "text-[10px] items-center flex px-1.5 py-0.5 uppercase font-bold tracking-wider rounded border",
                priorityClass,
                isDone && "opacity-50 grayscale",
              )}
            >
              {note.priority || "Medium"}
            </div>
            {note.dueDate && (
              <div
                className={cn(
                  "flex items-center px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-bold bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border-[var(--theme-border)]",
                  isDone && "opacity-50",
                )}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(note.dueDate), "MMM d")}
              </div>
            )}
            {note.audioData && (
              <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-[var(--theme-accent-text)] dark:text-[var(--theme-accent-text)] bg-emerald-50 px-1.5 py-0.5 rounded">
                <Mic className="w-3 h-3 mr-1" /> Audio
              </div>
            )}
            {note.reminderTime && (
              <div
                className={cn(
                  "flex items-center px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-bold",
                  isPast(new Date(note.reminderTime)) && !isDone
                    ? "bg-red-50/80 text-red-700 border-red-200/50"
                    : "bg-blue-50/80 text-blue-700 border-blue-200/50",
                )}
              >
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(note.reminderTime), "MMM d, h:mm a")}
                {note.frequency && note.frequency !== "Once" && (
                  <span className="flex items-center ml-1.5 pl-1.5 border-l border-current opacity-80">
                    <Repeat className="w-2.5 h-2.5 mr-0.5" /> {note.frequency}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-[var(--theme-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 bg-[var(--theme-bg-secondary)] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-[var(--theme-text-muted)] hover:text-red-600 dark:hover:text-red-400 bg-[var(--theme-bg-secondary)] hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
