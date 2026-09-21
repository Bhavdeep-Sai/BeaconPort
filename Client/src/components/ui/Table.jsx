import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/40 shadow-sm transition-colors duration-150 ${className}`}>
      <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="text-xs text-gray-600 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/60">
      {children}
    </thead>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-200 dark:divide-gray-700/40">{children}</tbody>;
}

export function Th({ children, className = '' }) {
  return <th className={`px-4 py-3 font-semibold tracking-wide ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export default Table;
