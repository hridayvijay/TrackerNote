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
  await setDoc(docRef, {
    ...note,
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
export async function saveUsername(uid: string, username: string, email: string): Promise<void> {
  const cleanUsername = username.trim();
  const lowercaseUsername = cleanUsername.toLowerCase();
  
  const batch = writeBatch(db);
  
  // Set the user profile document
  const userRef = doc(db, "users", uid);
  batch.set(userRef, {
    userId: uid,
    username: cleanUsername,
    email: email || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
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

