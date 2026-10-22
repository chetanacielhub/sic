// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/projects
// Project Management & Listing
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMember } from '@/lib/auth/session';
import { resolveUserContext } from '@/lib/auth/rbac';
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(128),
  description: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']).default('ACTIVE'),
});

export async function GET(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    const adminClient = createAdminClient();

    // If authenticated, check context
    if (member) {
      const userContext = await resolveUserContext(member.id);
      if (userContext.isSuperAdmin) {
        // Super admin sees all projects
        const { data: allProjects, error } = await adminClient
          .from('projects')
          .select(`
            *,
            project_memberships(count),
            groups(count),
            sessions(count)
          `)
          .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ success: true, data: allProjects });
      }

      // Member sees assigned projects
      const projectIds = userContext.projects.map(p => p.project.id);
      const { data: assignedProjects, error } = await adminClient
        .from('projects')
        .select(`
          *,
          project_memberships(count),
          groups(count),
          sessions(count)
        `)
        .in('id', projectIds)
        .order('name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ success: true, data: assignedProjects });
    }

    // Default / public fallback list of active projects
    const { data: publicProjects, error } = await adminClient
      .from('projects')
      .select('id, name, slug, description, status')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data: publicProjects });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const userContext = await resolveUserContext(member.id);
    if (!userContext.isSuperAdmin && !userContext.permissions.includes('projects.create')) {
      return NextResponse.json({ success: false, error: 'Only Platform Super Admins can create projects' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateProjectSchema.parse(body);

    const adminClient = createAdminClient();

    const { data: project, error } = await adminClient
      .from('projects')
      .insert([{
        ...validated,
        created_by: member.id,
      }])
      .select()
      .single();

    if (error) throw error;

    // Automatically assign creator as Project Admin
    await adminClient
      .from('project_memberships')
      .insert([{
        project_id: project.id,
        member_id: member.id,
        role: 'PROJECT_ADMIN',
        status: 'ACTIVE',
      }]);

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
