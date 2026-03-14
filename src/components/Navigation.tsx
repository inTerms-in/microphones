"use client";

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Explore', path: '/explore' },
  { icon: PlusCircle, label: 'Create', path: '/create', primary: true },
  { icon: Bell, label: 'Inbox', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const Navigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-gray-100 pb-safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center transition-all duration-300 relative",
                item.primary ? "mb-6" : "w-12 h-12",
                isActive && !item.primary ? "text-indigo-600 scale-110" : "text-gray-400"
              )
            }
          >
            {item.primary ? (
              <div className="bg-indigo-600 p-3 rounded-full shadow-lg shadow-indigo-200 text-white transform hover:rotate-90 transition-transform active:scale-90">
                <item.icon size={28} />
              </div>
            ) : (
              <>
                <item.icon size={24} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;