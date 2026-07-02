import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemName: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  itemName,
}: ConfirmDeleteModalProps) {
  const applyTheme = localStorage.getItem("applyThemeToDeleteUi") === "true";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--theme-bg-primary)]/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm glass-panel bg-[var(--theme-bg-card)] dark:bg-[var(--theme-bg-primary)]/90 rounded-2xl shadow-xl border border-[var(--theme-border)]/50 dark:border-[var(--theme-border)]/50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-500/20 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-center text-[var(--theme-text-primary)] mb-2">
                Delete {itemName}?
              </h3>
              <p className="text-sm text-center text-[var(--theme-text-secondary)] mb-6">
                This action cannot be undone. Are you sure you want to permanently delete this {itemName.toLowerCase()}?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-[var(--theme-text-primary)] dark:bg-[var(--theme-bg-secondary)] dark:hover:bg-[var(--theme-bg-card-hover)] text-[var(--theme-text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onCancel();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-[var(--theme-text-primary)] shadow-lg shadow-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
