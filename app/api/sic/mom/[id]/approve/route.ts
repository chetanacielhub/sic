// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/mom/[id]/approve
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const ApproveSchema = z.object({
  approved_by: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { member: currentMember, errorResponse } = await requireActiveMember();
    if (errorResponse || !currentMember) return errorResponse!;

    const { id: momId } = await params;
    const body = await request.json();
    ApproveSchema.parse(body);

    const adminClient = createAdminClient();
    const scope = await getAssociateAdminScope(currentMember.id);
    const isAdmin =
      scope.isAuthorized ||
      ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN'].includes(
        currentMember.org_role
      );

    if (!isAdmin) {
      const { data: leadRows } = await adminClient
        .from('group_leads')
        .select('id')
        .eq('member_id', currentMember.id)
        .eq('is_active', true);

      if (!leadRows || leadRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only Group Leads or Administrators can approve Meeting Minutes.' },
          { status: 403 }
        );
      }
    }

    const { data: mom, error } = await adminClient
      .from('meeting_minutes')
      .update({
        status: 'APPROVED',
        approved_by: currentMember.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', momId)
      .select(`
        *,
        approved_by_member:members!meeting_minutes_approved_by_fkey(full_name, member_code, email)
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: mom,
      message: 'MoM approved successfully.',
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
