import React from 'react';

const sizeMap = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

const colorMap = {
  white: 'border-white/30 border-t-white',
  orange: 'border-orange-300/30 border-t-orange-500',
  gray: 'border-gray-500/30 border-t-gray-400',
  blue: 'border-blue-300/30 border-t-blue-500',
  green: 'border-green-300/30 border-t-green-500',
  red: 'border-red-300/30 border-t-red-500',
};

export function Spinner({ size = 'md', color = 'orange', className = '' }) {
  const sizeClass = sizeMap[size] ?? sizeMap.md;
  const colorClass = colorMap[color] ?? colorMap.orange;
  return (
    <span
      className={`inline-block rounded-full animate-spin ${sizeClass} ${colorClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export default Spinner;
