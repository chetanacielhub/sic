// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/members (Invite, Approve, Ban/Unban, Restore, Update Info, Remove)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireActiveMember, requireAdminMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import {
  getStoredMembers,
  inviteOrCreateMember,
  setMemberBanStatus,
  restoreMemberById,
  removeMemberById,
} from '@/lib/academic/store';
import { z } from 'zod';

const InviteMemberSchema = z.object({
  full_name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(32).optional().nullable(),
  department: z.string().min(1).max(128).default('Innovation & Operations'),
  designation: z.string().min(1).max(128).default('SIC Member'),
  roll_number: z.string().max(64).optional().nullable(),
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
  action: z.enum(['APPROVE', 'BAN', 'UNBAN', 'RESTORE', 'UPDATE']).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(2).max(255).optional(),
  phone: z.string().max(32).optional().nullable(),
  department: z.string().min(1).max(128).optional(),
  designation: z.string().min(1).max(128).optional(),
  roll_number: z.string().max(64).optional().nullable(),
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

export async function GET(request: NextRequest) {
  try {
    const { member, errorResponse } = await requireActiveMember();
    if (errorResponse || !member) return errorResponse!;

    const scope = await getAssociateAdminScope(member.id);
    const isAdmin =
      scope.isAuthorized ||
      ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN'].includes(member.org_role);

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    const adminClient = createAdminClient();
    let dbQuery = adminClient
      .from('members')
      .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
      .order('full_name', { ascending: true });

    if (!isAdmin) {
      dbQuery = dbQuery.eq('status', 'ACTIVE');
    } else if (status && status !== 'ALL') {
      dbQuery = dbQuery.eq('status', status);
    }

    if (department) dbQuery = dbQuery.eq('department', department);
    if (role) dbQuery = dbQuery.eq('org_role', role);
    if (query) {
      dbQuery = dbQuery.or(
        `full_name.ilike.%${query}%,member_code.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    const { data: dbMembers, error } = await dbQuery;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const stored = getStoredMembers().filter(m => isAdmin || m.status === 'ACTIVE');
    const map = new Map<string, unknown>();
    for (const m of dbMembers || []) map.set(m.email.toLowerCase(), m);
    for (const m of stored) {
      if (!map.has(m.email.toLowerCase())) {
        map.set(m.email.toLowerCase(), m);
      }
    }

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
    const { member: admin, scope, errorResponse } = await requireAdminMember();
    if (errorResponse || !admin) return errorResponse!;

    const body = await request.json();
    const validated = InviteMemberSchema.parse(body);

    if (validated.org_role === 'SUPER_ADMIN' && !scope?.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Administrators can grant Super Admin privileges.' },
        { status: 403 }
      );
    }

    const created = await inviteOrCreateMember({
      ...validated,
      performedBy: admin.id,
    });

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
    const { member: admin, scope, errorResponse } = await requireAdminMember();
    if (errorResponse || !admin) return errorResponse!;

    const body = await request.json();
    const validated = UpdateMemberSchema.parse(body);

    if (validated.org_role === 'SUPER_ADMIN' && !scope?.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Administrators can grant Super Admin privileges.' },
        { status: 403 }
      );
    }

    if (validated.action === 'RESTORE') {
      const restored = await restoreMemberById(validated.member_id, validated.email, admin.id);
      if (!restored.success) {
        return NextResponse.json(
          { success: false, error: restored.error || 'Failed to restore member.' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Member account has been restored to active status.',
        data: restored.member,
      });
    }

    const effectiveStatus =
      validated.action === 'BAN'
        ? 'SUSPENDED'
        : validated.action === 'APPROVE' || validated.action === 'UNBAN'
        ? 'ACTIVE'
        : validated.status;

    const result = await setMemberBanStatus({
      memberId: validated.member_id,
      email: validated.email,
      full_name: validated.full_name,
      phone: validated.phone,
      department: validated.department,
      designation: validated.designation,
      roll_number: validated.roll_number,
      status: effectiveStatus,
      org_role: validated.org_role,
      performedBy: admin.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update member in PostgreSQL.' },
        { status: 400 }
      );
    }

    const message =
      effectiveStatus === 'SUSPENDED'
        ? 'Member account has been banned / suspended.'
        : validated.action === 'UPDATE' || (!validated.status && !validated.action)
        ? 'Member details updated successfully.'
        : 'Member account approved and active.';

    return NextResponse.json({
      success: true,
      message,
      data: result.member,
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
    const { member: admin, errorResponse } = await requireAdminMember();
    if (errorResponse || !admin) return errorResponse!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email') || undefined;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Member ID is required' }, { status: 400 });
    }

    if (id === admin.id || (email && email.toLowerCase() === admin.email.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'You cannot remove your own administrator account.' },
        { status: 400 }
      );
    }

    const result = await removeMemberById(id, email, admin.id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to remove member from PostgreSQL.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed from SIC directory.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
