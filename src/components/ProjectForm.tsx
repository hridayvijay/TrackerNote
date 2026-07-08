import { useState, FormEvent, useEffect } from "react";
import { SyncProject, NotePriority, NoteStatus } from "../types";
import { addProject, updateProject } from "../services";
import { X, Save, Building2, Calendar, Clock, BarChart } from "lucide-react";
import { format } from "date-fns";

interface ProjectFormProps {
  onClose: () => void;
  project?: SyncProject | null;
  defaultAssignee?: string;
}

export default function ProjectForm({ onClose, project, defaultAssignee }: ProjectFormProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [createdAtStr, setCreatedAtStr] = useState("");
  const [dueDateStr, setDueDateStr] = useState("");
  const [priority, setPriority] = useState<NotePriority>("Medium");
  const [status, setStatus] = useState<NoteStatus>("Pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setAssignee(project.assignee);
      setPriority(project.priority || "Medium");
      setStatus(project.status || "Pending");
      if (project.createdAt) {
        setCreatedAtStr(format(new Date(project.createdAt), "yyyy-MM-dd"));
      }
      if (project.dueDate) {
        setDueDateStr(format(new Date(project.dueDate), "yyyy-MM-dd"));
      }
    } else {
      setCreatedAtStr(format(new Date(), "yyyy-MM-dd"));
      if (defaultAssignee && defaultAssignee !== 'Unassigned') {
        setAssignee(defaultAssignee);
      }
    }
  }, [project]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignee.trim()) {
      setError("Title and Assignee are required");
      return;
    }

    setLoading(true);
    setError("");

    const startTimestamp = createdAtStr
      ? new Date(createdAtStr).getTime()
      : Date.now();
      
    const dueTimestamp = dueDateStr ? new Date(dueDateStr).getTime() : null;

    try {
      if (project) {
        await updateProject(project.id, {
          title: title.trim(),
          assignee: assignee.trim(),
          createdAt: startTimestamp,
          dueDate: dueTimestamp,
          priority,
          status,
        });
      } else {
        await addProject({
          title: title.trim(),
          assignee: assignee.trim(),
          createdAt: startTimestamp,
          dueDate: dueTimestamp,
          priority,
          status,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/40">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
          {project ? "Edit Project" : "New Project"}
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--theme-text-secondary)] hover:text-slate-800 dark:hover:text-slate-100 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-6 bg-red-50/80 dark:bg-red-900/40 border border-red-200/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-2">
              Project Name
            </label>
            <input
              type="text"
              className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-[var(--theme-border-strong)] rounded-xl px-4 py-2.5 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-accent)]/20 focus:border-[var(--theme-accent)]/50 placeholder:text-[var(--theme-text-muted)] transition-all font-medium"
              placeholder="e.g. Website Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-2 flex items-center">
              <Building2 className="w-4 h-4 mr-2 opacity-70" />
              Assignee / Main Stakeholder
            </label>
            <input
              type="text"
              className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-[var(--theme-border-strong)] rounded-xl px-4 py-2.5 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-accent)]/20 focus:border-[var(--theme-accent)]/50 placeholder:text-[var(--theme-text-muted)] transition-all font-medium"
              placeholder="e.g. Design Team or John Doe"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 opacity-70" />
                Start / Creation Date
              </label>
              <input
                type="date"
                className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-[var(--theme-border-strong)] rounded-xl px-3 py-2 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-accent)]/20 transition-all font-medium text-sm"
                value={createdAtStr}
                onChange={(e) => setCreatedAtStr(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 opacity-70" />
                Due Date
              </label>
              <input
                type="date"
                className="w-full bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-[var(--theme-border-strong)] rounded-xl px-3 py-2 text-[var(--theme-text-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-accent)]/20 transition-all font-medium text-sm"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                <BarChart className="w-3.5 h-3.5 mr-1 opacity-70" />
                Priority
              </label>
              <div className="flex bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-[var(--theme-border-strong)] rounded-xl p-1">
                {(["Low", "Medium", "High"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      priority === p
                        ? "bg-[var(--theme-bg-card)] dark:bg-slate-700 text-[var(--theme-accent-text)] text-[var(--theme-accent-text)] shadow-sm"
                        : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] dark:hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-secondary)]/50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-primary)] text-[var(--theme-text-secondary)] mb-1.5">
                Status
              </label>
              <div className="flex bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/50 backdrop-blur-md border border-[var(--theme-border-strong)] rounded-xl p-1">
                {(["Pending", "Done"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      status === s
                        ? s === "Done"
                          ? "bg-emerald-100 text-[var(--theme-accent-text)] dark:text-[var(--theme-accent-text)] shadow-sm"
                          : "bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-secondary)] text-[var(--theme-accent-text)] shadow-sm border border-[var(--theme-border-strong)]"
                        : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] dark:hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-secondary)]/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold rounded-xl text-[var(--theme-text-secondary)] text-[var(--theme-text-secondary)] bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-card)] dark:hover:bg-[var(--theme-bg-card-hover)]/50 border border-[var(--theme-border-strong)] transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 shadow-lg shadow-[var(--theme-accent)]/30 text-sm font-bold rounded-xl text-[var(--theme-bg-primary)] bg-[var(--theme-accent)] hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {project ? "Save changes" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
