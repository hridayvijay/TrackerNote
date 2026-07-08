const fs = require('fs');

const content = `import React, { useState } from "react";
import { format } from "date-fns";
import {
  Trash2,
  Edit2
} from "lucide-react";
import { cn } from "../lib/utils";
import { SyncProject, SyncNote } from "../services";
import { motion, AnimatePresence } from "motion/react";

interface ProjectCardProps {
  project: SyncProject;
  notes: SyncNote[];
  index: number;
  currentUserDisplayName: string;
  onEditProject: (p: SyncProject) => void;
  onDeleteProject: (id: string) => void;
  onToggleNoteStatus: (n: SyncNote) => void;
  onEditNote: (n: SyncNote) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (noteId: string, projectId: string) => void;
}

export default function ProjectCard({
  project,
  notes,
  index,
  currentUserDisplayName,
  onEditProject,
  onDeleteProject,
  onToggleNoteStatus,
  onEditNote,
  onDeleteNote,
  onMoveNote,
}: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const noteId = e.dataTransfer.getData("noteId");
    if (noteId) {
      onMoveNote(noteId, project.id);
    }
  };

  const pendingNotes = notes.filter((n) => n.status !== "Done");
  const doneNotes = notes.filter((n) => n.status === "Done");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className={cn("proj-card", isDragOver ? "ring-2 ring-[var(--theme-accent)]" : "")}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={() => setIsDragOver(false)}
    >
      <div
        className="proj-title cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("projectId", project.id)}
      >
        {project.title}
        <div className="proj-actions opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="proj-action cursor-pointer hover:text-blue-400" onClick={(e) => { e.stopPropagation(); onEditProject(project); }}>✎</span>
          <span className="proj-action cursor-pointer hover:text-red-400" onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}>⋯</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <AnimatePresence mode="popLayout">
                {pendingNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onToggleStatus={() => onToggleNoteStatus(note)}
                    onEditNote={() => onEditNote(note)}
                    onDeleteNote={() => onDeleteNote(note.id)}
                  />
                ))}
                {doneNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onToggleStatus={() => onToggleNoteStatus(note)}
                    onEditNote={() => onEditNote(note)}
                    onDeleteNote={() => onDeleteNote(note.id)}
                  />
                ))}
              </AnimatePresence>
              
              {notes.length === 0 && (
                <div className="text-center py-4 text-[var(--theme-text-muted)] text-[11px]">
                  No tasks. Drag tasks here.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const NoteItem = ({
  note,
  onToggleStatus,
  onEditNote,
  onDeleteNote,
}: {
  note: SyncNote;
  onToggleStatus: () => void;
  onEditNote: () => void;
  onDeleteNote: () => void;
}) => {
  const isDone = note.status === "Done";
  
  let priorityClass = "pri-med";
  if (note.priority === "High") priorityClass = "pri-high";
  if (note.priority === "Low") priorityClass = "pri-low";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.2 }}
      className="note-item group"
      draggable
      onDragStart={(e: any) => {
        e.stopPropagation();
        e.dataTransfer.setData("noteId", note.id);
      }}
    >
      <div 
        className={\`note-status \${isDone ? 'done' : 'pending'} cursor-pointer\`}
        onClick={onToggleStatus}
      >
        {isDone ? "✓" : ""}
      </div>
      <div className="note-body">
        <div className={\`note-text \${isDone ? 'done-text' : ''}\`}>
          {note.content}
        </div>
        <div className="note-meta mt-1">
          {note.priority && <span className={\`pri-badge \${priorityClass}\`}>{note.priority}</span>}
          {note.dueDate && (
            <span className="due-tag">
              ⏰ {format(new Date(note.dueDate), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 self-start mt-1">
        <button onClick={onEditNote} className="text-[var(--theme-text-muted)] hover:text-blue-400">
          <Edit2 className="w-3 h-3" />
        </button>
        <button onClick={onDeleteNote} className="text-[var(--theme-text-muted)] hover:text-red-400">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};
`;

fs.writeFileSync('src/components/ProjectCard.tsx', content);

