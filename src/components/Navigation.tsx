"use client";

import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: PlusCircle, label: 'Entry', path: '/create', primary: true },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const Navigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-safe-area-inset-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center transition-all duration-300 relative min-w-[64px]",
                item.primary ? "mb-8" : "h-full",
                isActive && !item.primary ? "text-indigo-600" : "text-slate-400"
              )
            }
          >
            {item.primary ? (
              <div className="bg-indigo-600 p-3.5 rounded-full shadow-lg shadow-indigo-200 text-white transform hover:scale-110 active:scale-95 transition-all border-4 border-white">
                <item.icon size={24} strokeWidth={2.5} />
              </div>
            ) : (
              <>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-[10px] mt-1 font-semibold tracking-tight",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;