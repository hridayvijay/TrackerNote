import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Moon, Sun, CheckCircle2 } from "lucide-react";
import { useTheme } from "../themes/ThemeContext";
import { THEMES, ThemeId } from "../themes/themes";

interface ThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemePicker({ isOpen, onClose }: ThemePickerProps) {
  const { themeId, mode, setTheme, toggleMode } = useTheme();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const groupedThemes = Object.entries(THEMES).reduce((acc, [key, theme]) => {
    if (!acc[theme.group]) acc[theme.group] = [];
    acc[theme.group].push({ id: key as ThemeId, ...theme });
    return acc;
  }, {} as Record<string, Array<{ id: ThemeId; name: string; dark: any; light: any }>>);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-sm h-full glass-panel border-l shadow-2xl flex flex-col"
            style={{
              backgroundColor: "var(--theme-bg-primary)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text-primary)",
            }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--theme-border)" }}>
              <h2 className="text-lg font-bold">Appearance</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:opacity-80 transition-opacity"
                style={{ backgroundColor: "var(--theme-bg-secondary)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
              {/* Dark / Light Toggle */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--theme-text-muted)" }}>
                  Mode
                </h3>
                <div 
                  className="flex rounded-xl p-1"
                  style={{ backgroundColor: "var(--theme-bg-secondary)" }}
                >
                  <button
                    onClick={() => mode !== "light" && toggleMode()}
                    className={`flex-1 py-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      mode === "light" ? "shadow-sm" : ""
                    }`}
                    style={{
                      backgroundColor: mode === "light" ? "var(--theme-bg-card)" : "transparent",
                      color: mode === "light" ? "var(--theme-text-primary)" : "var(--theme-text-secondary)"
                    }}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </button>
                  <button
                    onClick={() => mode !== "dark" && toggleMode()}
                    className={`flex-1 py-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      mode === "dark" ? "shadow-sm" : ""
                    }`}
                    style={{
                      backgroundColor: mode === "dark" ? "var(--theme-bg-card)" : "transparent",
                      color: mode === "dark" ? "var(--theme-text-primary)" : "var(--theme-text-secondary)"
                    }}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </button>
                </div>
              </div>

              {/* Theme Groups */}
              {Object.entries(groupedThemes).map(([group, themes]) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--theme-text-muted)" }}>
                    {group}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {themes.map((t) => {
                      const isSelected = themeId === t.id;
                      const orbColors = t[mode].orb;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className="relative flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:scale-105"
                          style={{
                            backgroundColor: "var(--theme-bg-card)",
                            borderColor: isSelected ? "var(--theme-accent)" : "transparent",
                          }}
                        >
                          <div 
                            className="w-full h-8 rounded-lg mb-2 shadow-inner"
                            style={{
                              background: `linear-gradient(90deg, ${orbColors[0]} 0%, ${orbColors[1]} 33%, ${orbColors[2]} 66%, ${orbColors[3]} 100%)`
                            }}
                          />
                          <span className="text-sm font-bold" style={{ color: "var(--theme-text-primary)" }}>
                            {t.name}
                          </span>
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-white rounded-full">
                              <CheckCircle2 className="w-5 h-5" style={{ color: "var(--theme-accent)" }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
