import React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({ label, error, id, options = [], placeholder, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={[
            'w-full appearance-none px-3 py-2.5 pr-9 rounded-xl bg-gray-800 border text-gray-100 text-sm',
            'outline-none focus:ring-2 transition-colors cursor-pointer',
            error
              ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
              : 'border-gray-700 focus:ring-orange-500/30 focus:border-orange-500',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default Select;
