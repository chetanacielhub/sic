// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Navigation Bar with Dynamic Auth State & Role Switching
// ============================================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  Layers, 
  CalendarDays, 
  QrCode, 
  BarChart3, 
  LogIn, 
  LogOut, 
  UserCheck, 
  FolderKanban,
  LayoutDashboard
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { email: user.email, id: user.id } : null);
    });

    // Listen for auth state changes (sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email, id: session.user.id } : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Overview', icon: Building2 },
    ...(user ? [{ href: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard }] : []),
    { href: '/sic/members', label: 'Members', icon: Users },
    { href: '/sic/groups', label: 'Groups & Leads', icon: Layers },
    { href: '/sic/sessions', label: 'Sessions', icon: CalendarDays },
    { href: '/sic/check-in', label: 'Check-In', icon: QrCode },
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
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
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

        {/* Auth CTA & Identity Indicator */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                  {user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                  Active Session
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                title="Sign out of current account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
