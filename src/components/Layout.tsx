"use client";

import React from 'react';
import Navigation from './Navigation';
import { Toaster } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          SparkFlow
        </h1>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 px-4 pt-4 animate-in fade-in duration-500">
        {children}
      </main>

      <Navigation />
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default Layout;