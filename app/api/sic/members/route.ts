// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/members (Invite, Ban/Unban, Role Update, and Removal)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import {
  getStoredMembers,
  hydrateStoreFromAuth,
  inviteOrCreateMember,
  setMemberBanStatus,
  removeMemberById,
} from '@/lib/academic/store';
import { z } from 'zod';

const InviteMemberSchema = z.object({
  full_name: z.string().min(2).max(255),
  email: z.string().email(),
  department: z.string().min(1).max(128).default('Innovation & Operations'),
  designation: z.string().min(1).max(128).default('SIC Member'),
  roll_number: z.string().optional().nullable(),
  org_role: z
    .enum([
      'SUPER_ADMIN',
      'SIC_DIRECTOR',
      'SIC_ADMIN',
      'ASSOCIATE_ADMIN',
      'OPERATIONS_MANAGER',
      'ATTENDANCE_AUDITOR',
      'MEMBER',
    ])
    .default('MEMBER'),
  group_ids: z.array(z.string().min(1)).default([]),
});

const UpdateMemberSchema = z.object({
  member_id: z.string().min(1),
  email: z.string().optional(),
  full_name: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  roll_number: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  org_role: z
    .enum([
      'SUPER_ADMIN',
      'SIC_DIRECTOR',
      'SIC_ADMIN',
      'ASSOCIATE_ADMIN',
      'OPERATIONS_MANAGER',
      'ATTENDANCE_AUDITOR',
      'MEMBER',
    ])
    .optional(),
});

async function requireAdmin() {
  const currentMember = await getCurrentMember();
  if (!currentMember) return null;
  const scope = await getAssociateAdminScope(currentMember.id);
  const isAdmin =
    scope.isAuthorized ||
    currentMember.org_role === 'SUPER_ADMIN' ||
    currentMember.org_role === 'SIC_DIRECTOR' ||
    currentMember.org_role === 'SIC_ADMIN';
  return isAdmin ? currentMember : null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const query = searchParams.get('query');

    const adminClient = createAdminClient();
    let dbQuery = adminClient
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });

    if (department) dbQuery = dbQuery.eq('department', department);
    if (role) dbQuery = dbQuery.eq('org_role', role);
    if (query) {
      dbQuery = dbQuery.or(
        `full_name.ilike.%${query}%,member_code.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    await hydrateStoreFromAuth();
    const { data: dbMembers } = await dbQuery;
    const stored = getStoredMembers();

    const map = new Map<string, unknown>();
    for (const m of dbMembers || []) map.set(m.email.toLowerCase(), m);
    for (const m of stored) map.set(m.email.toLowerCase(), m);

    const combined = Array.from(map.values());
    return NextResponse.json({
      success: true,
      data: combined,
      meta: { count: combined.length },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = InviteMemberSchema.parse(body);

    const created = await inviteOrCreateMember(validated);
    return NextResponse.json(
      {
        success: true,
        message: `Invited ${created.full_name} (${created.email}) as ${created.org_role.replace('_', ' ')}.`,
        data: created,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || 'Validation error' },
        { status: 422 }
      );
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateMemberSchema.parse(body);

    await setMemberBanStatus({
      memberId: validated.member_id,
      email: validated.email,
      full_name: validated.full_name,
      department: validated.department,
      designation: validated.designation,
      roll_number: validated.roll_number,
      status: validated.status || 'ACTIVE',
      org_role: validated.org_role,
    });

    return NextResponse.json({
      success: true,
      message:
        validated.status === 'SUSPENDED'
          ? 'Member account has been banned / suspended.'
          : 'Member account approved and active.',
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || 'Validation error' },
        { status: 422 }
      );
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email') || undefined;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Member ID is required' }, { status: 400 });
    }

    await removeMemberById(id, email);
    return NextResponse.json({
      success: true,
      message: 'Member removed from SIC directory.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
