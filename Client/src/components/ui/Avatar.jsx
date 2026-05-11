import React from 'react';

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export function Avatar({ src, alt = '', size = 'md', fallback, className = '' }) {
  const sizeClass = sizeMap[size] ?? sizeMap.md;
  const initials = fallback || (alt ? alt.charAt(0).toUpperCase() : '?');

  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-gray-700 text-gray-200 font-semibold overflow-hidden select-none ${sizeClass} ${className}`}>
      {src
        ? <img src={src} alt={alt} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
    </span>
  );
}

export default Avatar;
