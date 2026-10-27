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
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  User,
  ChevronRight
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

export function SicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const supabase = createClient();

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      setIsMobileMenuOpen(false);
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm font-bold tracking-wider text-xs sm:text-sm">
            SIC
          </div>
          <div>
            <Link href="/" className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>SIC Operations</span>
              <span className="rounded-full bg-emerald-100 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-800">
                Unified
              </span>
            </Link>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate max-w-[170px] sm:max-w-none">
              Chetana Innovation Ecosystem
            </p>
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

        {/* Right Actions: Admin Portal, Profile & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick link to Associate Admin Portal (Desktop) */}
          <Link
            href="/associate-admin-login"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Associate Administrator Console"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Admin Portal</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                title="View Institutional Profile"
              >
                <div className="h-7 w-7 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 uppercase">
                    Profile
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                title="Sign out of current account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button (Touch Target >= 44x44px) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-slate-900" />
            ) : (
              <Menu className="h-5 w-5 text-slate-900" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 space-y-1 max-h-[calc(100vh-4.5rem)] overflow-y-auto pb-safe">
            {/* User Identity Preview in Mobile Menu */}
            {user && (
              <div className="p-3 mb-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                      {user.email}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                      Authenticated Member
                    </p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  Profile
                </Link>
              </div>
            )}

            {/* Mobile Nav Links */}
            <div className="space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold min-h-[44px] transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/60 shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </Link>
                );
              })}
            </div>

            {/* Associate Admin Link for Mobile */}
            <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
              <Link
                href="/associate-admin-login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Associate Admin Portal</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200 min-h-[44px] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="h-4 w-4 text-rose-600" />
                    <span>Sign Out of Account</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

