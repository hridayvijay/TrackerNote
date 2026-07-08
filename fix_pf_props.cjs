const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /const \[projectFormProps, setProjectFormProps\] = useState<\{\s*open: boolean;\s*project\?: SyncProject \| null;\s*\}>/g,
  `const [projectFormProps, setProjectFormProps] = useState<{
    open: boolean;
    project?: SyncProject | null;
    defaultAssignee?: string;
  }>`
);

// fix projectform rendering
nd = nd.replace(
  /<ProjectForm\s*project=\{projectFormProps.project\}\s*onClose=\{\(\) => setProjectFormProps\(\{ open: false, project: null \}\)\}\s*\/>/,
  `<ProjectForm
            project={projectFormProps.project}
            defaultAssignee={projectFormProps.defaultAssignee}
            onClose={() => setProjectFormProps({ open: false, project: null })}
          />`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);

let pf = fs.readFileSync('src/components/ProjectForm.tsx', 'utf8');

pf = pf.replace(
  /interface ProjectFormProps \{\s*onClose: \(\) => void;\s*project\?: SyncProject \| null;\s*\}/,
  `interface ProjectFormProps {
  onClose: () => void;
  project?: SyncProject | null;
  defaultAssignee?: string;
}`
);

pf = pf.replace(
  /export default function ProjectForm\(\{ onClose, project \}: ProjectFormProps\) \{/,
  `export default function ProjectForm({ onClose, project, defaultAssignee }: ProjectFormProps) {`
);

pf = pf.replace(
  /setCreatedAtStr\(format\(new Date\(\), "yyyy-MM-dd"\)\);\s*}/,
  `setCreatedAtStr(format(new Date(), "yyyy-MM-dd"));
      if (defaultAssignee && defaultAssignee !== 'Unassigned') {
        setAssignee(defaultAssignee);
      }
    }`
);

fs.writeFileSync('src/components/ProjectForm.tsx', pf);
