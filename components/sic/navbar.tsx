// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Navigation Bar
// ============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  Users, 
  Layers, 
  CalendarDays, 
  QrCode, 
  FileText, 
  BarChart3, 
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export function SicNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Command Center', icon: Building2 },
    { href: '/sic/members', label: 'Members', icon: Users },
    { href: '/sic/groups', label: 'Groups & Leads', icon: Layers },
    { href: '/sic/sessions', label: 'Sessions & Meetings', icon: CalendarDays },
    { href: '/sic/check-in', label: 'Member Check-In', icon: QrCode },
    { href: '/sic/reports', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm font-bold tracking-wider">
            SIC
          </div>
          <div>
            <Link href="/" className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              SIC Operations
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Unified
              </span>
            </Link>
            <p className="text-[11px] text-slate-500 font-medium">Chetana Innovation Ecosystem</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-slate-100 text-emerald-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Identity Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-900">Dr. Rajesh Sharma</span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
              SIC Director (Full Access)
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
            RS
          </div>
        </div>
      </div>
    </header>
  );
}
