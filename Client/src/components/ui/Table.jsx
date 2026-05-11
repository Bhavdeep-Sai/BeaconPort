import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-700/60 ${className}`}>
      <table className="w-full text-sm text-left text-gray-300">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="text-xs text-gray-400 uppercase bg-gray-800/80 border-b border-gray-700/60">
      {children}
    </thead>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-700/40">{children}</tbody>;
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
      className={`transition-colors hover:bg-gray-700/30 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export default Table;
