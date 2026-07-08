const fs = require('fs');

let nd = fs.readFileSync('src/components/NotesDashboard.tsx', 'utf8');

nd = nd.replace(
  /const allUpcomingReminders = useMemo\(\(\) => \{[\s\S]*?\}, \[notes\]\);/,
  `const myTasks = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.status === "Done") return false;
        const p = projects.find(proj => proj.id === n.projectId);
        if (p?.assignee === user?.displayName) return true;
        if (n.reminderTime && isFuture(new Date(n.reminderTime))) return true;
        return false;
      })
      .sort((a, b) => {
        const timeA = a.reminderTime ? new Date(a.reminderTime).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.reminderTime ? new Date(b.reminderTime).getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      });
  }, [notes, projects, user]);`
);

// We must also replace references to allUpcomingReminders with myTasks
nd = nd.replace(/allUpcomingReminders/g, 'myTasks');

fs.writeFileSync('src/components/NotesDashboard.tsx', nd);
