const fs = require('fs');
let content = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');

content = content.replace(
  /className="glass-panel rounded-2xl overflow-hidden shadow-md flex flex-col transition-all mb-4"/g,
  'className="proj-card"'
);

content = content.replace(
  /className={cn\([\s\S]*?"px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-\[var\(--theme-bg-card-hover\)\] transition-colors"[\s\S]*?\)}/g,
  'className="proj-title cursor-pointer group"'
);

content = content.replace(
  /<div className="flex items-center space-x-3 pr-2 flex-1 min-w-0">\s*<GripVertical className="w-4 h-4 text-\[var\(--theme-text-muted\)\] opacity-50 shrink-0 cursor-grab active:cursor-grabbing" \/>\s*<div className="min-w-0 flex-1">\s*<h4 className="font-bold text-\[var\(--theme-text-primary\)\] whitespace-normal leading-tight break-words text-\[16px\]">\s*\{project.title\}\s*<\/h4>[\s\S]*?<\/div>\s*<\/div>/g,
  `{project.title}
        <div className="proj-actions opacity-0 group-hover:opacity-50 transition-opacity">
          <span className="proj-action cursor-pointer" onClick={(e) => { e.stopPropagation(); onEditProject(project); }}>✎</span>
          <span className="proj-action cursor-pointer" onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}>⋯</span>
        </div>`
);

// We need to replace NoteItem inside ProjectCard
let noteItemContent = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');
const regexNoteItem = /const NoteItem = \([\s\S]*?\}\);/g;
const newNoteItem = `
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
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 self-start">
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

content = content.replace(regexNoteItem, newNoteItem);

fs.writeFileSync('src/components/ProjectCard.tsx', content);

