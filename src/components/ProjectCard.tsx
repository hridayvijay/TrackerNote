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

interface ProjectCardProps {
  key?: string | number;
  project: SyncProject;
  notes: SyncNote[];
  onEditProject: (project: SyncProject) => void;
  onDeleteProject: (projectId: string) => void;
  onAddNote: (projectId: string) => void;
  onEditNote: (note: SyncNote) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleNoteStatus: (noteId: string, status: NoteStatus) => void;
  onDropNote: (noteId: string, toProjectId: string) => void;
}

export default function ProjectCard({
  project,
  notes,
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
    <div
      className="glass-panel rounded-2xl overflow-hidden shadow-md flex flex-col transition-all mb-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors",
          isExpanded
            ? "border-b border-white/20 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40"
            : "",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("projectId", project.id)}
      >
        <div className="flex items-center space-x-3 pr-2 flex-1 min-w-0">
          <GripVertical className="w-4 h-4 text-slate-400 opacity-50 shrink-0 cursor-grab active:cursor-grabbing" />
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 whitespace-normal leading-tight break-words text-[16px]">
              {project.title}
            </h4>
            <div className="flex items-center text-xs text-slate-500 font-medium mt-1">
              <span>{format(new Date(project.createdAt), "MMM d")}</span>
              <span className="mx-2">•</span>
              <span>{notes.length} notes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditProject(project);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete project and all its notes?"))
                onDeleteProject(project.id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col space-y-3">
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
            <p className="text-sm text-center py-4 text-slate-500 dark:text-slate-400 italic">
              No notes yet. Drag a note here or add one.
            </p>
          ) : (
            sortedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onEdit={() => onEditNote(note)}
                onDelete={() => onDeleteNote(note.id)}
                onToggleStatus={() =>
                  onToggleNoteStatus(
                    note.id,
                    note.status === "Pending" ? "Done" : "Pending",
                  )
                }
              />
            ))
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
    </div>
  );
}

function NoteItem({ note, onEdit, onDelete, onToggleStatus }: any) {
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

  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-xl p-3 border border-white/50 dark:border-slate-700/50 shadow-sm group relative cursor-grab active:cursor-grabbing",
        isDone ? "opacity-60" : "",
      )}
      draggable
      onDragStart={(e) => {
        e.stopPropagation(); // prevent project drag
        e.dataTransfer.setData("noteId", note.id);
      }}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={onToggleStatus}
          className={cn(
            "mt-0.5 shrink-0 transition-colors",
            isDone ? "text-blue-500" : "text-slate-300 hover:text-blue-500",
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
                ? "line-through text-slate-500"
                : "text-slate-800 dark:text-slate-100",
            )}
          >
            {note.content}
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
                  "flex items-center px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
                  isDone && "opacity-50",
                )}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(note.dueDate), "MMM d")}
              </div>
            )}
            {note.audioData && (
              <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
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
            onClick={onEdit}
            className="p-1 text-slate-400 hover:text-blue-600 bg-slate-50/50 hover:bg-blue-50 rounded"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm("Delete note?")) onDelete();
            }}
            className="p-1 text-slate-400 hover:text-red-600 bg-slate-50/50 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
