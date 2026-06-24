import { useState, FormEvent, useEffect } from "react";
import { SyncProject } from "../types";
import { addProject, updateProject } from "../services";
import { X, Save, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ProjectFormProps {
  onClose: () => void;
  project?: SyncProject | null;
}

export default function ProjectForm({ onClose, project }: ProjectFormProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [createdAtStr, setCreatedAtStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setAssignee(project.assignee);
      if (project.createdAt) {
        setCreatedAtStr(format(new Date(project.createdAt), "yyyy-MM-dd"));
      }
    } else {
      setCreatedAtStr(format(new Date(), "yyyy-MM-dd"));
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

    try {
      if (project) {
        await updateProject(project.id, {
          title: title.trim(),
          assignee: assignee.trim(),
          createdAt: startTimestamp,
        });
      } else {
        await addProject({
          title: title.trim(),
          assignee: assignee.trim(),
          createdAt: startTimestamp,
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
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/20 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/40">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
          {project ? "Edit Project" : "New Project"}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 p-2 rounded-full transition-colors"
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
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 placeholder:text-slate-400 transition-all font-medium"
              placeholder="e.g. Website Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
              <Building2 className="w-4 h-4 mr-2 opacity-70" />
              Assignee / Main Stakeholder
            </label>
            <input
              type="text"
              className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 placeholder:text-slate-400 transition-all font-medium"
              placeholder="e.g. Design Team or John Doe"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2 opacity-70" />
              Start / Creation Date
            </label>
            <input
              type="date"
              className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-medium"
              value={createdAtStr}
              onChange={(e) => setCreatedAtStr(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 border border-white/50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 shadow-lg shadow-indigo-500/30 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {project ? "Save changes" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
