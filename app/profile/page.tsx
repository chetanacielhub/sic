// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /profile
// Member Institutional Profile & Avatar Management
// ============================================================================

import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { MemberProfileView } from '@/components/sic/member-profile-view';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const currentMember = await getCurrentMember();

  if (!currentMember) {
    redirect('/login?redirectTo=/profile');
  }

  const admin = createAdminClient();

  // Fetch group memberships
  const { data: memberships } = await admin
    .from('group_memberships')
    .select('*, group:groups(*)')
    .eq('member_id', currentMember.id)
    .eq('status', 'ACTIVE');

  // Fetch group leaderships
  const { data: leads } = await admin
    .from('group_leads')
    .select('*, group:groups(*)')
    .eq('member_id', currentMember.id)
    .eq('is_active', true);

  const groups = (memberships || [])
    .map(m => Array.isArray(m.group) ? m.group[0] : m.group)
    .filter(Boolean);

  const leadingGroups = (leads || [])
    .map(l => {
      const g = Array.isArray(l.group) ? l.group[0] : l.group;
      return { ...g, lead_type: l.lead_type };
    })
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      <MemberProfileView
        member={currentMember}
        groups={groups}
        leadingGroups={leadingGroups}
      />
    </div>
  );
}
