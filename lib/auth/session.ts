// ============================================================================
// SIC Unified Attendance & Operations Management System
// Authentication Session & Identity Resolution Helper
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Member } from '@/lib/types/sic';

/**
 * Retrieves the currently authenticated Supabase Auth user.
 */
export async function getSessionUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user to their SIC Member profile.
 */
export async function getCurrentMember(): Promise<Member | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  // Try matching via auth_user_id
  const { data: byAuth } = await adminClient
    .from('members')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (byAuth) return byAuth as Member;

  // Fallback matching by email
  if (user.email) {
    const { data: byEmail } = await adminClient
      .from('members')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (byEmail) {
      // Auto-link auth_user_id for future quick lookups
      await adminClient
        .from('members')
        .update({ auth_user_id: user.id })
        .eq('id', byEmail.id);

      return byEmail as Member;
    }
  }

  return null;
}
