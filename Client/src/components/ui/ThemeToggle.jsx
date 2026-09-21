import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle({ className = '', size = 'md', showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5 text-xs gap-1.5 rounded-lg',
    md: 'p-2 text-sm gap-2 rounded-xl',
    lg: 'p-2.5 text-base gap-2.5 rounded-xl',
  };

  const iconSizes = {
    sm: 15,
    md: 18,
    lg: 20,
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={[
        'inline-flex items-center justify-center transition-all duration-200 cursor-pointer select-none active:scale-95',
        'bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 shadow-sm',
        'dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200 dark:hover:text-white',
        sizeClasses[size] || sizeClasses.md,
        className,
      ].join(' ')}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun size={iconSizes[size] || 18} className="text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon size={iconSizes[size] || 18} className="text-indigo-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
      </div>
      {showLabel && (
        <span className="font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
