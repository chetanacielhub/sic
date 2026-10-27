// ============================================================================
// SIC Unified Attendance & Operations Management System
// Root Entry: app/page.tsx
// Directs unauthenticated visitors to /login and authenticated users to /dashboard
// ============================================================================

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function RootIndexPage() {
  const user = await getSessionUser();
  if (user) {
    redirect('/dashboard');
  }
  redirect('/login');
}
