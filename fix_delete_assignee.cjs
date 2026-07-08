const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /const handleDeleteAssigneeCategory = \(category: string\) => \{\s*setRetainedAssignees\(prev => prev\.filter\(c => c !== category\)\);\s*\};/,
  `const handleDeleteAssigneeCategory = (category: string) => {
    setDeleteModalProps({
      open: true,
      itemName: \`Category "\${category}"\`,
      onConfirm: () => {
        setRetainedAssignees(prev => prev.filter(c => c !== category));
        setDeleteModalProps({ open: false, itemName: "", onConfirm: () => {} });
      }
    });
  };`
);

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
