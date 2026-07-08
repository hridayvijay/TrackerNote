const fs = require('fs');
let pc = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');

pc = pc.replace(
  /<div\s*className="proj-title cursor-pointer group"[\s\S]*?\{project\.title\}\s*<div className="proj-actions opacity-0 group-hover:opacity-100 transition-opacity">[\s\S]*?<\/div>\s*<\/div>/,
  `<div
        className="proj-title cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("projectId", project.id)}
      >
        <div className="flex-1 min-w-0 pr-2">
          <div className="truncate">{project.title}</div>
          <div className="flex gap-2 text-[9px] opacity-70 mt-1 font-normal">
            {project.dueDate && <span>{format(new Date(project.dueDate), "MMM d")}</span>}
            {project.priority && <span>{project.priority}</span>}
          </div>
        </div>
        <div className="proj-actions opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
          <span className="proj-action cursor-pointer hover:text-green-400 p-1" onClick={(e) => { e.stopPropagation(); onAddNote(project.id); }} title="Add Note">➕</span>
          <span className="proj-action cursor-pointer hover:text-blue-400 p-1" onClick={(e) => { e.stopPropagation(); onEditProject(project); }} title="Edit Project">✎</span>
          <span className="proj-action cursor-pointer hover:text-red-400 p-1" onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} title="Delete Project">⋯</span>
        </div>
      </div>`
);

fs.writeFileSync('src/components/ProjectCard.tsx', pc);

