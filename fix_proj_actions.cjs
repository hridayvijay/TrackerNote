const fs = require('fs');

let pc = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');

pc = pc.replace(
  /<div className="proj-actions opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">[\s\S]*?<\/div>/,
  `<div className="proj-actions opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0 gap-1">
          <span className="proj-action cursor-pointer hover:text-[var(--theme-accent-text)] p-1" onClick={(e) => { e.stopPropagation(); onAddNote(project.id); }} title="Add Note"><Plus className="w-3.5 h-3.5" /></span>
          <span className="proj-action cursor-pointer hover:text-[var(--theme-accent-text)] p-1" onClick={(e) => { e.stopPropagation(); onEditProject(project); }} title="Edit Project"><Edit2 className="w-3 h-3" /></span>
          <span className="proj-action cursor-pointer hover:text-red-400 p-1" onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} title="Delete Project"><Trash2 className="w-3.5 h-3.5" /></span>
        </div>`
);

fs.writeFileSync('src/components/ProjectCard.tsx', pc);
