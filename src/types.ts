export type NoteStatus = "Pending" | "Done";
export type Frequency = "Never" | "Once" | "Daily" | "Weekly";
export type NotePriority = "Low" | "Medium" | "High";

export interface SyncProject {
  id: string;
  userId: string;
  title: string;
  assignee: string;
  createdAt: number;
  updatedAt: number;
}

export interface SyncNote {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  reminderTime: number | null; // Unix timestamp
  dueDate?: number | null;
  priority?: NotePriority;
  frequency: Frequency;
  lastNotifiedAt: number | null;
  status: NoteStatus;
  audioData?: string;
  createdAt: number;
  updatedAt: number;
}
