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
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import VoiceNoteCreator, { ParsedNoteData } from "./VoiceNoteCreator";
import ParsedNoteConfirmation from "./ParsedNoteConfirmation";
import ReminderSystem from "./ReminderSystem";
import { Plus, Users, LayoutDashboard, Clock, AlertCircle, Trash2, Wifi, WifiOff } from "lucide-react";
import { isFuture, format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

function getMyTaskPreview(note: SyncNote): string {
  const reminder = note.reminderText?.trim();
  if (reminder) return reminder;

  const content = note.content
    .replace(/^\[AI Extracted\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (content.length <= 88) return content;

  const firstSentence = content.match(/^(.{24,110}?[.!?])(?:\s|$)/)?.[1];
  if (firstSentence) return firstSentence;

  const shortened = content.slice(0, 88);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 56 ? lastSpace : 88).trimEnd()}…`;
}

export default function NotesDashboard({ user }: { user: User }) {
  const [projects, setProjects] = useState<SyncProject[]>([]);
  const [notes, setNotes] = useState<SyncNote[]>([]);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [allAppUsers, setAllAppUsers] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        setAllAppUsers(snapshot.docs.map(d => d.data()));
      } catch (e) {
        console.error("Failed to fetch users", e);
      }
    };
    fetchUsers();
  }, []);

  const renderDisplayName = (name: string) => {
    const matchingUsers = allAppUsers.filter(u => u.displayName === name);
    if (matchingUsers.length > 1) {
      // Conflict exists, append @username for the first matched user (as a heuristic)
      return (
        <span className="flex items-center space-x-1">
          <span>{name}</span>
          <span className="text-[var(--theme-text-muted)] font-normal text-sm lowercase">@{matchingUsers[0].username}</span>
        </span>
      );
    }
    return <span>{name}</span>;
  };

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
    defaultAssignee?: string;
  }>({ open: false });
  const [noteFormProps, setNoteFormProps] = useState<{
    open: boolean;
    projectId: string;
    note?: SyncNote | null;
  }>({ open: false, projectId: "" });
  const [deleteModalProps, setDeleteModalProps] = useState<{
    open: boolean;
    itemName: string;
    onConfirm: () => void;
  }>({ open: false, itemName: "", onConfirm: () => {} });
  const [parsedNoteData, setParsedNoteData] = useState<ParsedNoteData | null>(null);

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

  // FCM Web Push initialization is handled in App.tsx

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

  const myTasks = useMemo(() => {
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
  }, [notes, projects, user]);

  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    const name = project?.title || "project";
    setDeleteModalProps({
      open: true,
      itemName: `Project "${name}"`,
      onConfirm: () => {
        deleteProject(id);
        // Cascade delete notes
        notes
          .filter((n) => n.projectId === id)
          .forEach((n) => deleteSyncNote(n.id));
      }
    });
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
    setDeleteModalProps({
      open: true,
      itemName: `Category "${category}"`,
      onConfirm: () => {
        setRetainedAssignees(prev => prev.filter(c => c !== category));
        setDeleteModalProps({ open: false, itemName: "", onConfirm: () => {} });
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="dash-title-row">
            <span className="dash-title flex items-center"><LayoutDashboard className="w-6 h-6 mr-2 text-[var(--theme-accent-text)]" /> Assignee Dashboard</span>
            {isOnline ? (
              <div className="synced-badge" title="All changes are fully synchronized to the cloud and across devices">
                <div className="synced-dot"></div>
                Synced & Live
              </div>
            ) : (
              <div className="synced-badge border-amber-500/25 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse" title="Offline. Your changes are saved safely in your browser cache and will sync instantly upon connection">
                <div className="synced-dot bg-amber-500"></div>
                Offline Mode (Autosaved)
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setProjectFormProps({ open: true })}
          className="flex items-center justify-center bg-[var(--theme-accent)] text-[var(--theme-bg-primary)] px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 shadow-lg shadow-[var(--theme-accent)]/30 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          New Project
        </button>
      </div>

      <div className="my-tasks-section mb-6">
          <div className="my-tasks-label">
            My Tasks
            <span className="mt-badge">{myTasks.length}</span>
          </div>
          <div className="my-tasks-row flex-1 overflow-x-auto flex space-x-3 pb-2 scrollbar-hide snap-x">
            {myTasks.length === 0 && (
              <div className="text-[10px] text-[var(--theme-text-muted)] italic py-2">
                No tasks assigned to you.
              </div>
            )}
            {myTasks.map((rem) => {
              const project = projects.find((p) => p.id === rem.projectId);
              return (
                <div
                  key={rem.id}
                  className="mt-card shrink-0 snap-end cursor-pointer transition-colors hover:bg-[var(--theme-bg-card-hover)]"
                  onClick={() =>
                    setNoteFormProps({
                      open: true,
                      projectId: rem.projectId,
                      note: rem,
                    })
                  }
                >
                  <span className="font-bold text-slate-800 text-[var(--theme-text-primary)] truncate text-xs uppercase tracking-wide opacity-80">
                    {project?.title || "Unknown Project"}
                  </span>
                  <span className="font-medium text-[var(--theme-text-primary)] truncate mt-0.5">
                    {getMyTaskPreview(rem)}
                  </span>
                  <div className="flex justify-between items-center mt-1.5 space-x-2 text-[10px] text-[var(--theme-text-secondary)] font-bold uppercase tracking-wider">
                    {rem.reminderTime ? (
                      <>
                        <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(rem.reminderTime), "MMM d, h:mm")}
                        </span>
                        <span className="truncate opacity-70">
                           {isFuture(new Date(rem.reminderTime)) ? `In ${formatDistanceToNow(new Date(rem.reminderTime))}` : `${formatDistanceToNow(new Date(rem.reminderTime))} ago`}
                        </span>
                      </>
                    ) : (
                      <span className="opacity-50">No deadline</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {error && (
        <div className="mb-6 bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Forms absolute overlay */}
      {projectFormProps.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-bg-primary)]/50 backdrop-blur-sm p-4">
          <ProjectForm
            project={projectFormProps.project}
            defaultAssignee={projectFormProps.defaultAssignee}
            onClose={() => setProjectFormProps({ open: false, project: null })}
          />
        </div>
      )}

      {noteFormProps.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-bg-primary)]/50 backdrop-blur-sm p-4">
          <NoteForm
            projectId={noteFormProps.projectId}
            note={noteFormProps.note}
            onClose={() => setNoteFormProps({ open: false, projectId: "" })}
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center glass-panel rounded-3xl mx-auto max-w-lg mt-10 p-10">
            <div className="w-20 h-20 bg-[var(--theme-accent)] dark:bg-[var(--theme-accent)]/50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-[var(--theme-accent-text)]" />
            </div>
            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
            <p className="text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] font-medium mb-6">
              Create a project to start organizing stakeholder notes and tasks.
            </p>
          </div>
        ) : (
          <div className="kanban flex flex-wrap gap-4 px-2 items-start">
            <AnimatePresence>
            {groupsToRender.map(([assignee, assigneeProjects], colIndex) => (
              <motion.div
                layout
                initial={{ opacity: 0, x: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, delay: colIndex * 0.08, ease: "easeOut" }}
                key={assignee}
                className="col min-w-[280px] w-[280px] shrink-0 flex flex-col bg-[var(--theme-bg-card)] backdrop-blur-lg border border-[var(--theme-border-strong)] rounded-3xl p-4 transition-colors"
                onDragOver={(e: any) => e.preventDefault()}
                onDrop={(e: any) => handleDropProject(e, assignee)}
              >
                <div className="flex items-center mb-5 px-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md mr-3 shrink-0 text-[var(--theme-text-primary)] font-bold text-sm">
                    {assignee.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between space-x-2">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--theme-accent-text)] truncate tracking-tight flex items-center gap-1">
                        {renderDisplayName(assignee)}
                      </h3>
                      <p className="text-xs text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] font-bold uppercase tracking-wider">
                        {assigneeProjects.length} Projects
                      </p>
                    </div>
                    {assigneeProjects.length === 0 && assignee !== 'Unassigned' && (
                      <button
                        onClick={() => handleDeleteAssigneeCategory(assignee)}
                        className="text-[var(--theme-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 p-2 rounded-xl transition-colors shrink-0"
                        title="Remove category"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 pr-2 pb-2">
                  <AnimatePresence>
                  {assigneeProjects.map((proj, projIndex) => (
                    <ProjectCard
                      key={proj.id}
                      index={projIndex}
                      project={proj}
                      notes={notes.filter((n) => n.projectId === proj.id)}
                      currentUserDisplayName={user.displayName || ""}
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
                      onDeleteNote={(nId) => {
                        setDeleteModalProps({
                          open: true,
                          itemName: "Note",
                          onConfirm: () => deleteSyncNote(nId)
                        });
                      }}
                      onToggleNoteStatus={async (note) => {
                        const { onToggleStatus } = await import("../services");
                        await onToggleStatus(note);
                      }}
                      onMoveNote={(noteId, toProjectId) =>
                        updateSyncNote(noteId, { projectId: toProjectId })
                      }
                    />
                  ))}
                  </AnimatePresence>
                  <button 
                    onClick={() => setProjectFormProps({ open: true, project: null, defaultAssignee: assignee })} 
                    className="w-full mt-2 py-3 rounded-2xl border border-dashed border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/5 hover:bg-[var(--theme-accent)]/15 hover:border-[var(--theme-accent)]/60 text-[var(--theme-accent-text)] flex items-center justify-center opacity-70 hover:opacity-100 transition-all group"
                  >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
            <div className="w-4 shrink-0 h-1" />
          </div>
        )}
      </div>

      {projectFormProps.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--theme-bg-primary)]/40 backdrop-blur-sm" onClick={() => setProjectFormProps({ open: false, project: null })} />
          <div className="relative w-full max-w-xl">
            <ProjectForm
              project={projectFormProps.project}
              onClose={() => setProjectFormProps({ open: false, project: null })}
            />
          </div>
        </div>
      )}

      {noteFormProps.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--theme-bg-primary)]/40 backdrop-blur-sm" onClick={() => setNoteFormProps({ open: false, projectId: "" })} />
          <div className="relative w-full max-w-xl">
            <NoteForm
              projectId={noteFormProps.projectId}
              note={noteFormProps.note}
              onClose={() => setNoteFormProps({ open: false, projectId: "" })}
            />
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalProps.open}
        itemName={deleteModalProps.itemName}
        onConfirm={deleteModalProps.onConfirm}
        onCancel={() => setDeleteModalProps({ ...deleteModalProps, open: false })}
      />
      
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <VoiceNoteCreator
          existingStakeholders={Array.from(new Set(projects.map(p => p.assignee).filter((a): a is string => Boolean(a))))}
          onParsed={(parsedData) => {
            setParsedNoteData(parsedData);
          }}
        />
      </div>

      <AnimatePresence>
        {parsedNoteData && (
          <ParsedNoteConfirmation
            parsedData={parsedNoteData}
            existingStakeholders={Array.from(new Set(projects.map(p => p.assignee).filter((a): a is string => Boolean(a))))}
            existingProjects={projects.map(p => ({ id: p.id, name: p.title, assignee: p.assignee }))}
            onClose={() => setParsedNoteData(null)}
          />
        )}
      </AnimatePresence>
      <ReminderSystem notes={notes} />
    </div>
  );
}
