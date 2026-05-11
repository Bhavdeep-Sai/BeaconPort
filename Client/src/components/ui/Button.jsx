import React from 'react';
import { Spinner } from './Spinner';

const variants = {
  primary:   'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600',
  danger:    'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white',
  ghost:     'bg-transparent hover:bg-gray-700/60 text-gray-300 hover:text-gray-100',
  outline:   'bg-transparent border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-gray-100',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-base rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...props }) {
  const v = variants[variant] ?? variants.primary;
  const s = sizes[size] ?? sizes.md;
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" color="white" />}
      {children}
    </button>
  );
}

export default Button;
