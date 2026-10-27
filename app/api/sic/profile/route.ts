import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getCurrentMember } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'No active SIC Member profile found for this account.',
      }, { status: 404 });
    }

    const admin = createAdminClient();

    // Fetch group memberships
    const { data: memberships } = await admin
      .from('group_memberships')
      .select('group:groups(*)')
      .eq('member_id', member.id)
      .eq('status', 'ACTIVE');

    // Fetch group leads
    const { data: leads } = await admin
      .from('group_leads')
      .select('group:groups(*), lead_type')
      .eq('member_id', member.id)
      .eq('is_active', true);

    const memberGroups = (memberships || [])
      .map(m => Array.isArray(m.group) ? m.group[0] : m.group)
      .filter(Boolean);

    const leadingGroups = (leads || [])
      .map(l => {
        const grp = Array.isArray(l.group) ? l.group[0] : l.group;
        return { ...grp, lead_type: l.lead_type };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        groups: memberGroups,
        leading_groups: leadingGroups,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone } = body;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('members')
      .update({ phone: phone?.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', member.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
