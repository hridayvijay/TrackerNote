const fs = require('fs');

let pc = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');

pc = pc.replace(
  /<div className="flex gap-2 text-\[9px\] opacity-70 mt-1 font-normal">[\s\S]*?<\/div>/,
  `<div className="flex gap-2 text-[9px] mt-1.5 font-normal">
            {project.dueDate && <span className="due-tag">⏰ {format(new Date(project.dueDate), "MMM d")}</span>}
            {project.priority && <span className={\`pri-badge \${project.priority === 'High' ? 'pri-high' : project.priority === 'Medium' ? 'pri-med' : 'pri-low'}\`}>{project.priority}</span>}
          </div>`
);

fs.writeFileSync('src/components/ProjectCard.tsx', pc);
