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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm glass-panel bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-500/20 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
                Delete {itemName}?
              </h3>
              <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                This action cannot be undone. Are you sure you want to permanently delete this {itemName.toLowerCase()}?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onCancel();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 transition-colors"
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
