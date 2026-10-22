// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/groups
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const CreateGroupSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(64),
  description: z.string().optional().nullable(),
  group_type: z.enum(['PERMANENT', 'TEMPORARY', 'PROJECT', 'EVENT', 'WORKSHOP']).default('PERMANENT'),
  parent_group_id: z.string().uuid().optional().nullable(),
  capacity_limit: z.number().int().min(0).default(0),
  attendance_policy: z.object({
    grace_period_mins: z.number().int().min(0).default(15),
    min_attendance_pct: z.number().min(0).max(100).default(75),
  }).default({ grace_period_mins: 15, min_attendance_pct: 75 }),
  created_by: z.string().uuid().optional().nullable(),
});

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // Query groups with leads and membership count
    const { data: groups, error } = await adminClient
      .from('groups')
      .select(`
        *,
        group_leads(
          id,
          lead_type,
          is_active,
          member:members(id, full_name, email, member_code, avatar_url)
        ),
        group_memberships(count)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const formatted = groups.map(g => ({
      ...g,
      member_count: g.group_memberships?.[0]?.count || 0,
      active_leads: (g.group_leads || [])
        .filter((l: { is_active: boolean }) => l.is_active)
        .map((l: { id: string; lead_type: string; member: unknown }) => ({
          lead_id: l.id,
          lead_type: l.lead_type,
          member: l.member,
        })),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateGroupSchema.parse(body);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('groups')
      .insert([validated])
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
