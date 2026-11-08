// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/sessions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const CreateSessionSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional().nullable(),
  session_type: z.enum([
    'DAILY_DUTY', 'GROUP_MEETING', 'MULTI_GROUP_MEETING', 
    'GENERAL_MEETING', 'WORKSHOP', 'EVENT'
  ]).default('GROUP_MEETING'),
  host_id: z.string().min(1),
  group_ids: z.array(z.string().min(1)).min(1),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  venue: z.string().optional().nullable(),
  meeting_link: z.string().url().optional().nullable(),
  qr_rotation_interval_sec: z.number().int().min(15).max(120).default(30),
  late_grace_period_mins: z.number().int().min(0).max(120).default(15),
  created_by: z.string().min(1).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { member, errorResponse } = await requireActiveMember();
    if (errorResponse || !member) return errorResponse!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sessionType = searchParams.get('session_type');
    const groupId = searchParams.get('group_id');

    const adminClient = createAdminClient();
    let query = adminClient
      .from('sessions')
      .select(`
        *,
        host:members(id, full_name, email, member_code, avatar_url),
        session_groups(group:groups(id, name, code, group_type))
      `)
      .order('scheduled_start', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (sessionType) {
      query = query.eq('session_type', sessionType);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    let filtered = sessions || [];
    if (groupId) {
      filtered = filtered.filter(s => 
        s.session_groups?.some((sg: { group: { id: string } }) => sg.group?.id === groupId)
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { member: currentMember, errorResponse } = await requireActiveMember();
    if (errorResponse || !currentMember) return errorResponse!;

    const body = await request.json();
    const validated = CreateSessionSchema.parse(body);

    const adminClient = createAdminClient();
    const scope = await getAssociateAdminScope(currentMember.id);
    const isAdminOrOps =
      scope.isAuthorized ||
      ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN', 'OPERATIONS_MANAGER'].includes(
        currentMember.org_role
      );

    if (!isAdminOrOps) {
      const { data: leadRows } = await adminClient
        .from('group_leads')
        .select('group_id')
        .eq('member_id', currentMember.id)
        .eq('is_active', true);

      if (!leadRows || leadRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only Group Leads or Administrators can schedule sessions.' },
          { status: 403 }
        );
      }
    }

    // 1. Insert session record
    const { data: session, error: sessionErr } = await adminClient
      .from('sessions')
      .insert([{
        title: validated.title,
        description: validated.description,
        session_type: validated.session_type,
        host_id: validated.host_id,
        status: 'SCHEDULED',
        scheduled_start: validated.scheduled_start,
        scheduled_end: validated.scheduled_end,
        venue: validated.venue,
        meeting_link: validated.meeting_link,
        qr_rotation_interval_sec: validated.qr_rotation_interval_sec,
        late_grace_period_mins: validated.late_grace_period_mins,
        created_by: validated.created_by || validated.host_id,
      }])
      .select()
      .single();

    if (sessionErr) {
      return NextResponse.json({ success: false, error: sessionErr.message }, { status: 400 });
    }

    // 2. Map participating groups
    const groupMappings = validated.group_ids.map(groupId => ({
      session_id: session.id,
      group_id: groupId,
    }));

    const { error: groupMappingErr } = await adminClient
      .from('session_groups')
      .insert(groupMappings);

    if (groupMappingErr) {
      return NextResponse.json({ success: false, error: groupMappingErr.message }, { status: 400 });
    }

    // 3. Trigger stored procedure to snapshot eligible unique members
    const { data: eligibleCount, error: rpcErr } = await adminClient.rpc('snapshot_session_eligibility', {
      p_session_id: session.id,
    });

    if (rpcErr) {
      console.warn('RPC snapshot_session_eligibility error:', rpcErr.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        group_ids: validated.group_ids,
        unique_eligible_count: eligibleCount || 0,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
