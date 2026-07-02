import React, { createContext, useContext, useEffect, useState } from "react";
import { THEMES, ThemeId, ThemeMode } from "./themes";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export interface ThemeContextType {
  themeId: ThemeId;
  mode: ThemeMode;
  orbColors: [string, string, string, string];
  setTheme: (id: ThemeId) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function injectThemeVars(themeId: ThemeId, mode: ThemeMode) {
  const theme = THEMES[themeId]?.[mode] || THEMES.cosmic.dark;
  console.log("injectThemeVars called! themeId:", themeId, "mode:", mode, "bgPrimary:", theme?.bgPrimary);
  const root = document.documentElement;
  
  console.log(`Injecting theme: ${themeId} (${mode}). bgPrimary: ${theme.bgPrimary}`);
  
  root.style.setProperty("--theme-bg-primary", theme.bgPrimary);
  root.style.setProperty("--theme-bg-secondary", theme.bgSecondary);
  root.style.setProperty("--theme-bg-card", theme.bgCard);
  root.style.setProperty("--theme-bg-card-hover", theme.bgCardHover);
  root.style.setProperty("--theme-text-primary", theme.textPrimary);
  root.style.setProperty("--theme-text-secondary", theme.textSecondary);
  root.style.setProperty("--theme-text-muted", theme.textMuted);
  root.style.setProperty("--theme-accent", theme.accent);
  root.style.setProperty("--theme-accent-hover", theme.accentHover);
  root.style.setProperty("--theme-accent-text", theme.accentText);
  root.style.setProperty("--theme-border", theme.border);
  root.style.setProperty("--theme-border-strong", theme.borderStrong);
  root.style.setProperty("--theme-orb-1", theme.orb[0]);
  root.style.setProperty("--theme-orb-2", theme.orb[1]);
  root.style.setProperty("--theme-orb-3", theme.orb[2]);
  root.style.setProperty("--theme-orb-4", theme.orb[3]);
  root.style.setProperty("--theme-orb-bg", theme.orbBg);

  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [customOrbColors, setCustomOrbColors] = useState<[string, string, string, string] | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserUid(user ? user.uid : null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!userUid) {
      injectThemeVars(themeId, mode);
      return;
    }

    const docRef = doc(db, "users", userUid, "settings", "theme");
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.theme && THEMES[data.theme as ThemeId]) {
          setThemeId(data.theme as ThemeId);
        }
        if (data.themeMode === "light" || data.themeMode === "dark") {
          setMode(data.themeMode as ThemeMode);
        }
        if (data.customOrbColors && Array.isArray(data.customOrbColors) && data.customOrbColors.length === 4) {
          setCustomOrbColors(data.customOrbColors as [string, string, string, string]);
        } else {
          setCustomOrbColors(null);
        }
      } else {
        setCustomOrbColors(null);
      }
    });

    return unsub;
  }, [userUid]);

  useEffect(() => {
    injectThemeVars(themeId, mode);
  }, [themeId, mode]);

  const orbColors = customOrbColors || THEMES[themeId][mode].orb;

  const updateFirestore = async (newThemeId: ThemeId, newMode: ThemeMode) => {
    if (!userUid) return;
    try {
      const docRef = doc(db, "users", userUid, "settings", "theme");
      await setDoc(docRef, { theme: newThemeId, themeMode: newMode }, { merge: true });
    } catch (e) {
      console.error("Failed to save theme settings:", e);
    }
  };

  const handleSetTheme = (id: ThemeId) => {
    setThemeId(id);
    updateFirestore(id, mode);
  };

  const handleToggleMode = () => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
    updateFirestore(themeId, newMode);
  };

  return (
    <ThemeContext.Provider value={{ themeId, mode, orbColors, setTheme: handleSetTheme, toggleMode: handleToggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
