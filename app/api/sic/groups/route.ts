// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/groups
// Group Creation, Multi-Leader Assignment & Membership Management
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getGroups, addGroup, updateGroupRoster, deleteGroup } from '@/lib/academic/store';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const LeaderAssignmentSchema = z.object({
  member_id: z.string().min(1),
  lead_type: z.enum(['PRIMARY_LEAD', 'CO_LEAD']).default('PRIMARY_LEAD'),
});

const CreateGroupSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(64),
  description: z.string().optional().nullable(),
  group_type: z.enum(['PERMANENT', 'TEMPORARY', 'PROJECT', 'EVENT', 'WORKSHOP']).default('PERMANENT'),
  grace_period_mins: z.number().int().min(0).max(120).optional(),
  min_attendance_pct: z.number().min(0).max(100).optional(),
  leaders: z.array(LeaderAssignmentSchema).optional(),
  member_ids: z.array(z.string().min(1)).optional(),
});

const UpdateGroupRosterSchema = z.object({
  group_id: z.string().min(1),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional().nullable(),
  leaders: z.array(LeaderAssignmentSchema),
  member_ids: z.array(z.string().min(1)),
});

async function verifyAdminPermission(): Promise<boolean> {
  const currentMember = await getCurrentMember();
  if (!currentMember) return false;
  const scope = await getAssociateAdminScope(currentMember.id);
  return (
    scope.isAuthorized ||
    currentMember.org_role === 'SUPER_ADMIN' ||
    currentMember.org_role === 'SIC_DIRECTOR' ||
    currentMember.org_role === 'SIC_ADMIN'
  );
}

export async function GET() {
  try {
    const groups = await getGroups();
    return NextResponse.json({ success: true, data: groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminPermission();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator privileges required to create groups.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateGroupSchema.parse(body);

    const data = await addGroup(validated);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0]?.message || 'Validation error' }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminPermission();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator privileges required to manage group leaders and roster.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateGroupRosterSchema.parse(body);

    const updated = await updateGroupRoster(validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Group not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0]?.message || 'Validation error' }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminPermission();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator privileges required to delete groups.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Group ID required' }, { status: 400 });
    }
    const deleted = await deleteGroup(id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
