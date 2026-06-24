import React, { useState, useEffect, useMemo } from "react";
import { User } from "firebase/auth";
import {
  subscribeToProjects,
  subscribeToSyncNotes,
  deleteProject,
  deleteSyncNote,
  updateSyncNote,
  updateProject,
} from "../services";
import { SyncProject, SyncNote } from "../types";
import ProjectForm from "./ProjectForm";
import NoteForm from "./NoteForm";
import ProjectCard from "./ProjectCard";
import { Plus, Users, LayoutDashboard, Clock, AlertCircle, Trash2, Wifi, WifiOff } from "lucide-react";
import { isFuture, format } from "date-fns";

export default function NotesDashboard({ user }: { user: User }) {
  const [projects, setProjects] = useState<SyncProject[]>([]);
  const [notes, setNotes] = useState<SyncNote[]>([]);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [retainedAssignees, setRetainedAssignees] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`retainedAssignees-${user.uid}`) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`retainedAssignees-${user.uid}`, JSON.stringify(retainedAssignees));
  }, [retainedAssignees, user.uid]);

  const [projectFormProps, setProjectFormProps] = useState<{
    open: boolean;
    project?: SyncProject | null;
  }>({ open: false });
  const [noteFormProps, setNoteFormProps] = useState<{
    open: boolean;
    projectId: string;
    note?: SyncNote | null;
  }>({ open: false, projectId: "" });

  useEffect(() => {
    const unsubP = subscribeToProjects(user.uid, setProjects, (err) =>
      setError(err.message),
    );
    const unsubN = subscribeToSyncNotes(user.uid, setNotes, (err) =>
      setError(err.message),
    );
    return () => {
      unsubP();
      unsubN();
    };
  }, [user.uid]);

  // Notifications logic
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      notes.forEach((note) => {
        if (
          note.status === "Pending" &&
          note.reminderTime &&
          note.reminderTime <= now &&
          note.frequency !== "Never"
        ) {
          let shouldNotify = false;
          if (!note.lastNotifiedAt) {
            shouldNotify = true;
          } else {
            const hoursSinceLast =
              (now - note.lastNotifiedAt) / (1000 * 60 * 60);
            if (note.frequency === "Daily" && hoursSinceLast >= 24)
              shouldNotify = true;
            if (note.frequency === "Weekly" && hoursSinceLast >= 168)
              shouldNotify = true;
          }

          if (shouldNotify) {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("TrackerNote Reminder", { body: note.content });
            }
            updateSyncNote(note.id, { lastNotifiedAt: now }).catch(
              console.error,
            );
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [notes]);

  const groupedByAssignee = useMemo(() => {
    const groups: Record<string, SyncProject[]> = {};
    const displayNames: string[] = [...retainedAssignees];
    
    displayNames.forEach(name => {
      groups[name] = [];
    });

    const sortedProjects = [...projects].sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    sortedProjects.forEach((p) => {
      let rawAssignee = p.assignee ? p.assignee.trim() : "Unassigned";
      if (!rawAssignee) rawAssignee = "Unassigned";

      let matchedName = displayNames.find((existing) => {
        const normExisting = existing.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normNew = rawAssignee.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (normExisting === normNew) return true;

        const wordsE = existing
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .trim()
          .split(/\s+/);
        const wordsN = rawAssignee
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .trim()
          .split(/\s+/);

        if (wordsE.length === 1 && wordsN.length > 0 && wordsN[0] === wordsE[0])
          return true;
        if (wordsN.length === 1 && wordsE.length > 0 && wordsE[0] === wordsN[0])
          return true;

        return false;
      });

      if (!matchedName) {
        if (rawAssignee === "Unassigned") {
          matchedName = "Unassigned";
        } else {
          matchedName = rawAssignee
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        }
        displayNames.push(matchedName);
        groups[matchedName] = [];
      }

      groups[matchedName].push(p);
    });

    return { groups, displayNames };
  }, [projects, retainedAssignees]);

  // Synchronize retainedAssignees dynamically
  useEffect(() => {
    const { displayNames } = groupedByAssignee;
    let changed = false;
    const newRetained = [...retainedAssignees];
    for (const name of displayNames) {
      if (name !== "Unassigned" && !newRetained.includes(name)) {
        newRetained.push(name);
        changed = true;
      }
    }
    if (changed) {
      setRetainedAssignees(newRetained);
    }
  }, [groupedByAssignee, retainedAssignees]);

  const groupsToRender = useMemo(() => {
    return Object.entries(groupedByAssignee.groups).sort((a, b) => {
      if (a[0] === "Unassigned") return 1;
      if (b[0] === "Unassigned") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [groupedByAssignee.groups]);

  const allUpcomingReminders = useMemo(() => {
    return notes
      .filter(
        (n) =>
          n.reminderTime &&
          isFuture(new Date(n.reminderTime)) &&
          n.status !== "Done",
      )
      .sort((a, b) => a.reminderTime! - b.reminderTime!);
  }, [notes]);

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    // Cascade delete notes
    notes
      .filter((n) => n.projectId === id)
      .forEach((n) => deleteSyncNote(n.id));
  };

  const handleDropProject = (
    e: React.DragEvent<HTMLDivElement>,
    toAssignee: string,
  ) => {
    const projectId = e.dataTransfer.getData("projectId");
    if (projectId) {
      updateProject(projectId, { assignee: toAssignee });
    }
  };

  const handleDeleteAssigneeCategory = (category: string) => {
    setRetainedAssignees(prev => prev.filter(c => c !== category));
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <h2 className="text-2xl font-bold tracking-tight flex items-center">
            <LayoutDashboard className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            Assignee Dashboard
          </h2>
          
          {isOnline ? (
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full select-none" title="All changes are fully synchronized to the cloud and across devices">
              <Wifi className="w-3.5 h-3.5 mr-1" />
              <span>Synced & Live</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full select-none animate-pulse" title="Offline. Your changes are saved safely in your browser cache and will sync instantly upon connection">
              <WifiOff className="w-3.5 h-3.5 mr-1" />
              <span>Offline Mode (Autosaved)</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setProjectFormProps({ open: true })}
          className="flex items-center justify-center bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          New Project
        </button>
      </div>

      {allUpcomingReminders.length > 0 && (
        <div className="mb-6 bg-slate-900/5 dark:bg-slate-100/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-inner">
          <div className="flex items-center text-amber-600 dark:text-amber-500 font-bold shrink-0">
            <AlertCircle className="w-5 h-5 mr-2" />
            Upcoming Overview
          </div>
          <div className="flex-1 overflow-x-auto flex space-x-3 pb-2 md:pb-0 scrollbar-hide snap-x">
            {allUpcomingReminders.map((rem) => {
              const project = projects.find((p) => p.id === rem.projectId);
              return (
                <div
                  key={rem.id}
                  className="min-w-[200px] shrink-0 snap-end bg-white/70 dark:bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/50 dark:border-slate-700/50 shadow-sm flex flex-col cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-800 text-xs"
                  onClick={() =>
                    setNoteFormProps({
                      open: true,
                      projectId: rem.projectId,
                      note: rem,
                    })
                  }
                >
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    {rem.content}
                  </span>
                  <div className="flex justify-between items-center mt-1.5 space-x-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span className="truncate">
                      {project?.title || "Unknown"}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(rem.reminderTime!), "MMM d, h:mm")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Forms absolute overlay */}
      {projectFormProps.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <ProjectForm
            project={projectFormProps.project}
            onClose={() => setProjectFormProps({ open: false, project: null })}
          />
        </div>
      )}

      {noteFormProps.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <NoteForm
            projectId={noteFormProps.projectId}
            note={noteFormProps.note}
            onClose={() => setNoteFormProps({ open: false, projectId: "" })}
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center glass-panel rounded-3xl mx-auto max-w-lg mt-10 p-10">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
              Create a project to start organizing stakeholder notes and tasks.
            </p>
          </div>
        ) : (
          <div className="flex h-full space-x-6 px-2 snap-x snap-mandatory items-start">
            {groupsToRender.map(([assignee, assigneeProjects]) => (
              <div
                key={assignee}
                className="min-w-[340px] max-w-[340px] shrink-0 snap-center flex flex-col h-full bg-slate-200/30 dark:bg-slate-800/20 backdrop-blur-lg border border-slate-300/40 dark:border-slate-700/50 rounded-3xl p-4 transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropProject(e, assignee)}
              >
                <div className="flex items-center mb-5 px-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md mr-3 shrink-0 text-white font-bold text-sm">
                    {assignee.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between space-x-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                        {assignee}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        {assigneeProjects.length} Projects
                      </p>
                    </div>
                    {assigneeProjects.length === 0 && assignee !== 'Unassigned' && (
                      <button
                        onClick={() => handleDeleteAssigneeCategory(assignee)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 p-2 rounded-xl transition-colors shrink-0"
                        title="Remove category"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 rounded-lg pb-10 space-y-4">
                  {assigneeProjects.map((proj) => (
                    <ProjectCard
                      key={proj.id}
                      project={proj}
                      notes={notes.filter((n) => n.projectId === proj.id)}
                      onEditProject={(p) =>
                        setProjectFormProps({ open: true, project: p })
                      }
                      onDeleteProject={handleDeleteProject}
                      onAddNote={(pId) =>
                        setNoteFormProps({ open: true, projectId: pId })
                      }
                      onEditNote={(n) =>
                        setNoteFormProps({
                          open: true,
                          projectId: n.projectId,
                          note: n,
                        })
                      }
                      onDeleteNote={deleteSyncNote}
                      onToggleNoteStatus={(nId, status) =>
                        updateSyncNote(nId, { status })
                      }
                      onDropNote={(noteId, toProjectId) =>
                        updateSyncNote(noteId, { projectId: toProjectId })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="w-4 shrink-0 h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
