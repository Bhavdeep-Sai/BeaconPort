import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-gray-800/60 border border-gray-700/60 rounded-2xl shadow-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-6 py-4 border-b border-gray-700/60 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`px-6 py-4 border-t border-gray-700/60 ${className}`}>{children}</div>;
}

export default Card;
