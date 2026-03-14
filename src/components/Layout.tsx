"use client";

import React from 'react';
import Navigation from './Navigation';
import { Toaster } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex flex-col">
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            {profile?.company_name || 'SparkFlow'}
          </h1>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {profile?.role || 'User'}
          </span>
        </div>
        <button 
          onClick={() => signOut()}
          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 px-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>

      <Navigation />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
};

export default Layout;
