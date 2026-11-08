// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/groups/[id]/leads
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminMember } from '@/lib/auth/session';
import { recordAdminAuditLog } from '@/lib/academic/store';
import { z } from 'zod';

const AssignLeadSchema = z.object({
  member_id: z.string().min(1),
  lead_type: z.enum(['PRIMARY_LEAD', 'CO_LEAD']).default('PRIMARY_LEAD'),
  assigned_by: z.string().min(1).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { member: admin, errorResponse } = await requireAdminMember();
    if (errorResponse || !admin) return errorResponse!;

    const { id: groupId } = await params;
    const body = await request.json();
    const validated = AssignLeadSchema.parse(body);

    const adminClient = createAdminClient();

    // Upsert lead assignment
    const { data, error } = await adminClient
      .from('group_leads')
      .upsert(
        {
          group_id: groupId,
          member_id: validated.member_id,
          lead_type: validated.lead_type,
          assigned_by: admin.id,
          is_active: validated.is_active,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: 'group_id,member_id' }
      )
      .select(`
        *,
        member:members(*)
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog(adminClient, {
      actorId: admin.id,
      targetMemberId: validated.member_id,
      action: 'GROUP_LEAD_ASSIGNED',
      entityType: 'MEMBER',
      entityId: validated.member_id,
      newState: {
        group_id: groupId,
        member_id: validated.member_id,
        lead_type: validated.lead_type,
        is_active: validated.is_active,
      },
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
