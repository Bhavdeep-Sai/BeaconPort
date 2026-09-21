import React from 'react';
import { Outlet } from 'react-router-dom';

const Client = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
    <Outlet />
  </div>
);

export default Client;