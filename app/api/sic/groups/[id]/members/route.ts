// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/groups/[id]/members
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const AddMemberSchema = z.object({
  member_id: z.string().min(1),
  added_by: z.string().min(1).optional().nullable(),
});

async function requireGroupManager(groupId: string) {
  const { member, errorResponse } = await requireActiveMember();
  if (errorResponse || !member) return { member: null, errorResponse };

  const scope = await getAssociateAdminScope(member.id);
  const isAdmin =
    scope.isAuthorized ||
    ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN'].includes(member.org_role);
  if (isAdmin) return { member, errorResponse: null };

  const adminClient = createAdminClient();
  const { data: leadRow } = await adminClient
    .from('group_leads')
    .select('id')
    .eq('group_id', groupId)
    .eq('member_id', member.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!leadRow) {
    return {
      member: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden: Only Group Leads or Administrators can modify group membership.' },
        { status: 403 }
      ),
    };
  }

  return { member, errorResponse: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { member, errorResponse } = await requireActiveMember();
    if (errorResponse || !member) return errorResponse!;

    const { id: groupId } = await params;
    const adminClient = createAdminClient();

    const { data: memberships, error } = await adminClient
      .from('group_memberships')
      .select(`
        id,
        status,
        joined_at,
        ended_at,
        member:members(*)
      `)
      .eq('group_id', groupId)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: memberships });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const { member: actor, errorResponse } = await requireGroupManager(groupId);
    if (errorResponse || !actor) return errorResponse!;

    const body = await request.json();
    const validated = AddMemberSchema.parse(body);

    const adminClient = createAdminClient();

    // Check if membership already exists
    const { data: existing } = await adminClient
      .from('group_memberships')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('member_id', validated.member_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Member is already an active member of this group.' },
          { status: 409 }
        );
      }
      // Re-activate previously left membership
      const { data: updated, error } = await adminClient
        .from('group_memberships')
        .update({
          status: 'ACTIVE',
          ended_at: null,
          added_by: actor.id,
          joined_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updated });
    }

    // Insert new membership
    const { data, error } = await adminClient
      .from('group_memberships')
      .insert([
        {
          group_id: groupId,
          member_id: validated.member_id,
          added_by: actor.id,
          status: 'ACTIVE',
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const { member: actor, errorResponse } = await requireGroupManager(groupId);
    if (errorResponse || !actor) return errorResponse!;

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'member_id query param is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Non-destructive removal: update status to 'LEFT' and set ended_at
    const { data, error } = await adminClient
      .from('group_memberships')
      .update({ status: 'LEFT', ended_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .eq('status', 'ACTIVE')
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data, message: 'Membership ended successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
