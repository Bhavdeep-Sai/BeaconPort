import React from 'react';

const variants = {
  default:  'bg-gray-700/60 text-gray-300',
  orange:   'bg-orange-500/15 text-orange-400',
  blue:     'bg-blue-500/15 text-blue-400',
  green:    'bg-green-600/15 text-green-400',
  red:      'bg-red-500/15 text-red-400',
  yellow:   'bg-yellow-500/15 text-yellow-400',
  purple:   'bg-purple-500/15 text-purple-400',
};

export function Badge({ variant = 'default', children, className = '' }) {
  const v = variants[variant] ?? variants.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${v} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
