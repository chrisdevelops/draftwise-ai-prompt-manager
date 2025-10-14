import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  actions: {
    label: string;
    onClick: () => void;
    className?: string;
  }[];
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, title, message, actions }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900 bg-opacity-70 z-50 flex items-center justify-center transition-opacity" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-slate-700 transform transition-all" 
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-slate-300 mb-6">{message}</div>
        <div className="flex justify-end space-x-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${action.className || 'bg-slate-600 hover:bg-slate-500 text-slate-200'}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
