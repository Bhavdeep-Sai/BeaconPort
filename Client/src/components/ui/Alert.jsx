import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const variants = {
  success: {
    container: 'bg-green-900/20 border-green-700/40 text-green-300',
    icon: <CheckCircle className="w-4 h-4 shrink-0" />,
  },
  error: {
    container: 'bg-red-900/20 border-red-700/40 text-red-300',
    icon: <XCircle className="w-4 h-4 shrink-0" />,
  },
  warning: {
    container: 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300',
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
  },
  info: {
    container: 'bg-blue-900/20 border-blue-700/40 text-blue-300',
    icon: <Info className="w-4 h-4 shrink-0" />,
  },
};

export function Alert({ variant = 'info', children, onClose, className = '' }) {
  const v = variants[variant] ?? variants.info;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${v.container} ${className}`} role="alert">
      {v.icon}
      <span className="flex-1">{children}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
