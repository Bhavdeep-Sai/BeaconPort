import React from 'react';

export function Input({ label, error, id, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'w-full px-3 py-2.5 rounded-xl bg-gray-800 border text-gray-100 placeholder-gray-500 text-sm',
          'outline-none focus:ring-2 transition-colors',
          error
            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
            : 'border-gray-700 focus:ring-orange-500/30 focus:border-orange-500',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default Input;
