// ============================================================================
// SIC Unified Attendance & Operations Management System
// Root Layout
// ============================================================================

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SicNavbar } from '@/components/sic/navbar';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#047857',
};

export const metadata: Metadata = {
  title: 'SIC — Unified Attendance & Operations Management System',
  description: "Chetana's Innovation Ecosystem Attendance, Operations, MoM, and Headcount Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50/70 text-slate-900 antialiased overflow-x-hidden`}>
        <SicNavbar />
        <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
