// @deprecated — use MainLayout (src/components/layout/MainLayout.tsx). Kept for reference only.
// Main Layout Component - Con personalidad y estilo

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

// Alternative: Layout with Top Header (modern alternative)
interface TopLayoutProps {
  children: React.ReactNode;
}

export function TopLayout({ children }: TopLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                <span className="text-xl font-bold text-white">A</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-black tracking-tight">Accounting</span>
                <span className="text-xs text-amber-500 font-medium">Demo Mode</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions, invoices, reports..."
                className="w-full bg-gray-100 border-0 rounded-xl px-4 py-2.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-white font-bold text-sm">JS</span>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}