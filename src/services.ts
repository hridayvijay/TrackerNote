import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { addDays, addHours, getDay } from "date-fns";
import { db, auth, handleFirestoreError } from "./firebase";
import { SyncProject, SyncNote } from "./types";

export function subscribeToProjects(
  userId: string,
  callback: (projects: SyncProject[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(
    collection(db, "syncProjects"),
    where("userId", "==", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as SyncProject[];

      items.sort((a, b) => b.createdAt - a.createdAt);

      callback(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, "list" as any, "syncProjects");
      } catch (e) {
        onError(e as Error);
      }
    },
  );
}

export async function addProject(
  project: Omit<SyncProject, "id" | "updatedAt" | "userId"> & {
    createdAt?: number;
  },
) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const docRef = doc(collection(db, "syncProjects"));
  const now = Date.now();
  await setDoc(docRef, {
    ...project,
    userId: auth.currentUser.uid,
    createdAt: project.createdAt || now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<SyncProject, "id" | "userId">>,
) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const docRef = doc(db, "syncProjects", id);
  await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
}

export async function deleteProject(id: string) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await deleteDoc(doc(db, "syncProjects", id));
}

// Notes
export function subscribeToSyncNotes(
  userId: string,
  callback: (notes: SyncNote[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(collection(db, "syncNotes"), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as SyncNote[];

      items.sort((a, b) => b.createdAt - a.createdAt);

      callback(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, "list" as any, "syncNotes");
      } catch (e) {
        onError(e as Error);
      }
    },
  );
}

export async function addSyncNote(
  note: Omit<SyncNote, "id" | "createdAt" | "updatedAt" | "userId">,
) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const docRef = doc(collection(db, "syncNotes"));
  const now = Date.now();
  
  // Convert timestamps to ISO strings if they are numbers
  const dueDateIso = note.dueDate ? (typeof note.dueDate === 'number' ? new Date(note.dueDate).toISOString() : note.dueDate) : null;
  const reminderTimeIso = note.reminderTime ? (typeof note.reminderTime === 'number' ? new Date(note.reminderTime).toISOString() : note.reminderTime) : null;

  // Clean payload
  const { audioUrl, audioBase64, recordingUrl, storageRef, ...cleanNote } = note as any;

  await setDoc(docRef, {
    ...cleanNote,
    dueDate: dueDateIso,
    reminderTime: reminderTimeIso,
    userId: auth.currentUser.uid,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateSyncNote(
  id: string,
  updates: Partial<Omit<SyncNote, "id" | "createdAt" | "userId">>,
) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const docRef = doc(db, "syncNotes", id);
  await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
}

export async function deleteSyncNote(id: string) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await deleteDoc(doc(db, "syncNotes", id));
}

// User Profile and Username Lookup Services
export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  displayName?: string;
  createdAt: number;
  updatedAt?: number;
}

import { getDoc, writeBatch } from "firebase/firestore";

/**
 * Checks if a username is already taken.
 * Returns true if the username is available (not taken), false otherwise.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) return false;
  try {
    const docRef = doc(db, "usernames", cleanUsername);
    const docSnap = await getDoc(docRef);
    return !docSnap.exists();
  } catch (error) {
    handleFirestoreError(error, "get" as any, `usernames/${cleanUsername}`);
    throw error;
  }
}

/**
 * Creates user profile in Firestore and locks the username mapping.
 */
export async function saveFcmToken(uid: string, token: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { fcmToken: token }, { merge: true });
}

export async function saveUsername(uid: string, username: string, email: string, displayName?: string): Promise<void> {
  const cleanUsername = username.trim();
  const lowercaseUsername = cleanUsername.toLowerCase();
  
  const batch = writeBatch(db);
  
  // Set the user profile document
  const userRef = doc(db, "users", uid);
  const userData: any = {
    userId: uid,
    username: cleanUsername,
    email: email || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  if (displayName) {
    userData.displayName = displayName;
  }
  
  batch.set(userRef, userData, { merge: true });
  
  // Set the username-to-uid lock document
  const usernameRef = doc(db, "usernames", lowercaseUsername);
  batch.set(usernameRef, {
    uid: uid,
  });
  
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, "write" as any, `users/${uid} & usernames/${lowercaseUsername}`);
  }
}

/**
 * Updates user profile username and updates username lock.
 */
export async function updateUsername(uid: string, newUsername: string, oldUsername?: string): Promise<void> {
  const cleanNew = newUsername.trim();
  const newLower = cleanNew.toLowerCase();
  const oldLower = oldUsername?.trim().toLowerCase();
  
  if (oldLower === newLower) return;
  
  const batch = writeBatch(db);
  
  // Update username field in users document
  const userRef = doc(db, "users", uid);
  batch.set(userRef, {
    username: cleanNew,
    updatedAt: Date.now(),
  }, { merge: true });
  
  // Lock new username
  const newLookupRef = doc(db, "usernames", newLower);
  batch.set(newLookupRef, {
    uid: uid,
  });
  
  // Remove old username lock if specified
  if (oldLower) {
    const oldLookupRef = doc(db, "usernames", oldLower);
    batch.delete(oldLookupRef);
  }
  
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, "write" as any, `users/${uid} & usernames/${newLower}`);
  }
}

/**
 * Retrieves the user profile from Firestore by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, "get" as any, `users/${uid}`);
    throw error;
  }
}

export function calculateNextReminders(dueDate: Date, timesPerDay: number): Date[] {
  const reminders: Date[] = [];
  const startHour = 8;
  const endHour = 21;
  const totalHours = endHour - startHour;
  
  if (timesPerDay <= 1) {
    const d = new Date(dueDate);
    d.setHours(14, 30, 0, 0);
    reminders.push(d);
  } else {
    const interval = totalHours / (timesPerDay - 1);
    for (let i = 0; i < timesPerDay; i++) {
      const d = new Date(dueDate);
      const hoursToAdd = startHour + (interval * i);
      const h = Math.floor(hoursToAdd);
      const m = Math.round((hoursToAdd - h) * 60);
      d.setHours(h, m, 0, 0);
      reminders.push(d);
    }
  }
  
  return reminders;
}

export async function onToggleStatus(note: SyncNote) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const isCurrentlyPending = note.status === "Pending";
  if (!isCurrentlyPending) {
    // If it's Done, toggle to Pending
    return updateSyncNote(note.id, { status: "Pending" });
  }

  // It's Pending, we're marking it Done
  const frequency = note.frequency || "Once";
  const now = new Date();
  
  if (frequency === "Once" || frequency === "Never") {
    return updateSyncNote(note.id, { status: "Done" });
  }
  
  let newDueDate: Date = note.dueDate ? new Date(note.dueDate) : new Date();
  let nextReminders: Date[] = [];
  
  if (frequency === "Daily") {
    newDueDate = addDays(newDueDate, 1);
    nextReminders = calculateNextReminders(newDueDate, note.timesPerDay || 1);
  } else if (frequency === "Multiple Times Daily") {
    const timesPerDay = note.timesPerDay || 1;
    const intervalHours = 24 / timesPerDay;
    newDueDate = addHours(newDueDate, intervalHours);
    nextReminders = [newDueDate];
  } else if (frequency === "Specific Days" || frequency === "Multiple Times Weekly") {
    const daysMap: Record<string, number> = {
      "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
    };
    
    if (note.daysOfWeek && note.daysOfWeek.length > 0) {
      const currentDayNum = getDay(now);
      const targetDays = note.daysOfWeek.map(d => daysMap[d]).filter(d => d !== undefined).sort((a, b) => a - b);
      
      if (targetDays.length > 0) {
        let nextDayNum = targetDays.find(d => d > currentDayNum);
        let daysToAdd = 0;
        
        if (nextDayNum !== undefined) {
          daysToAdd = nextDayNum - currentDayNum;
        } else {
          nextDayNum = targetDays[0];
          daysToAdd = 7 - currentDayNum + nextDayNum;
        }
        
        newDueDate = addDays(now, daysToAdd);
        if (note.dueDate) {
          const oldDate = new Date(note.dueDate);
          newDueDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
        } else {
          newDueDate.setHours(14, 30, 0, 0);
        }
        
        nextReminders = calculateNextReminders(newDueDate, note.timesPerDay || 1);
      } else {
        return updateSyncNote(note.id, { status: "Done" });
      }
    } else {
       return updateSyncNote(note.id, { status: "Done" });
    }
  }

  const updates: Partial<Omit<SyncNote, "id" | "createdAt" | "userId">> = {
    status: "Pending", // Because it was recurring, it resets to Pending
    dueDate: newDueDate.getTime(),
  };

  if (nextReminders.length > 0) {
    updates.reminderTime = nextReminders[0].getTime();
    updates.nextReminders = nextReminders.map(r => r.getTime());
  }

  return updateSyncNote(note.id, updates);
}