'use client';

import React from 'react';
import Link from 'next/link';
import { Fuel, PlusCircle, ShieldCheck, Phone, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  onOpenReport?: () => void;
}

export function Header({ onOpenReport }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md border-b border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-inner group-hover:bg-emerald-400 transition-colors">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-xl tracking-tight text-white">Alipo</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-700/80 text-emerald-200 border border-emerald-600/50">
                  Malawi
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 hidden sm:block">
                Crowdsourced & Verified Fuel Network
              </p>
            </div>
          </Link>

          {/* Quick Stats / Channels / Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* USSD Helper badge */}
            <div className="hidden md:flex items-center space-x-1.5 text-xs bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-700/60 text-emerald-200">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>USSD: <strong className="text-white">*384*265#</strong></span>
            </div>

            {/* Quick Report Button */}
            {onOpenReport && (
              <button
                onClick={onOpenReport}
                className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-3 sm:px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Fuel</span>
              </button>
            )}

            {/* B2B Dashboard Link */}
            <Link
              href="/dashboard"
              className="flex items-center space-x-1.5 bg-emerald-900/80 hover:bg-emerald-700 text-white font-medium px-3 sm:px-4 py-2 rounded-lg border border-emerald-600/60 transition-colors text-xs sm:text-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Fleet Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
