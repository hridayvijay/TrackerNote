export type NoteStatus = "Pending" | "Done";
export type Frequency = "Never" | "Once" | "Daily" | "Weekly" | "Multiple Times Daily" | "Specific Days" | "Multiple Times Weekly" | string;
export type NotePriority = "Low" | "Medium" | "High";

export interface SyncProject {
  id: string;
  userId: string;
  title: string;
  assignee: string;
  createdAt: number;
  updatedAt: number;
  priority?: NotePriority;
  status?: NoteStatus;
  dueDate?: number | null;
}

export interface SyncNote {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  reminderTime: number | string | null; // Unix timestamp or ISO string
  reminderText?: string;
  dueDate?: number | string | null;
  priority?: NotePriority;
  frequency: Frequency;
  timesPerDay?: number;
  daysOfWeek?: string[];
  nextReminders?: number[];
  lastNotifiedAt: number | null;
  status: NoteStatus;
  audioData?: string;
  createdAt: number;
  updatedAt: number;
}
