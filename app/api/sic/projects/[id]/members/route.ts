// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/projects/[id]/members
// Project Memberships & Role Assignment API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMember } from '@/lib/auth/session';
import { resolveUserContext } from '@/lib/auth/rbac';
import { z } from 'zod';

const AddProjectMemberSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(['PROJECT_ADMIN', 'LEAD', 'MEMBER']).default('MEMBER'),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const adminClient = createAdminClient();

    const { data: memberships, error } = await adminClient
      .from('project_memberships')
      .select(`
        id,
        role,
        status,
        created_at,
        member:members(id, full_name, email, member_code, department, designation, avatar_url)
      `)
      .eq('project_id', projectId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: memberships });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const currentMember = await getCurrentMember();

    // Verify permission: Must be Super Admin or Project Admin
    if (currentMember) {
      const userContext = await resolveUserContext(currentMember.id, projectId);
      if (!userContext.isSuperAdmin && userContext.effectiveRole !== 'PROJECT_ADMIN') {
        return NextResponse.json({
          success: false,
          error: 'Only Project Admins or Super Admins can assign project roles.',
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const validated = AddProjectMemberSchema.parse(body);

    const adminClient = createAdminClient();

    // Upsert project membership
    const { data, error } = await adminClient
      .from('project_memberships')
      .upsert({
        project_id: projectId,
        member_id: validated.member_id,
        role: validated.role,
        status: 'ACTIVE',
        invited_by: currentMember?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,member_id' })
      .select(`
        *,
        member:members(full_name, member_code, email)
      `)
      .single();

    if (error) throw error;

    // Record audit log
    await adminClient.from('audit_logs').insert([{
      actor_id: currentMember?.id || null,
      action: 'PROJECT_ROLE_ASSIGNED',
      entity_type: 'project_memberships',
      entity_id: data.id,
      new_state: { project_id: projectId, member_id: validated.member_id, role: validated.role },
    }]);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
