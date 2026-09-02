'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fuel, LayoutDashboard, Truck, Compass, FileText, ArrowLeft, LogOut, ShieldAlert } from 'lucide-react';
import { logoutUser } from '@/lib/pocketbase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Vehicles & Drivers', href: '/dashboard/vehicles', icon: Truck },
    { label: 'Smart Dispatch', href: '/dashboard/dispatch', icon: Compass },
    { label: 'Fuel Reports & Logs', href: '/dashboard/reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-emerald-950 text-white flex flex-col justify-between shrink-0 border-r border-emerald-900">
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-emerald-900/60 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-emerald-950">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white">Alipo Fleet</span>
                <span className="block text-[10px] text-emerald-400 font-semibold uppercase">B2B Management</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-200/80 hover:bg-emerald-900/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-emerald-900/60 space-y-2 text-xs">
          <Link
            href="/"
            className="flex items-center space-x-2 text-emerald-300 hover:text-white transition-colors py-1 px-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Live Map</span>
          </Link>

          <Link
            href="/login"
            onClick={() => logoutUser()}
            className="flex items-center space-x-2 text-rose-400 hover:text-rose-300 transition-colors py-1 px-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
