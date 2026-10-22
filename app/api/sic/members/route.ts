// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/members
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const CreateMemberSchema = z.object({
  member_code: z.string().min(3).max(32),
  full_name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  department: z.string().min(2).max(128),
  designation: z.string().min(2).max(128),
  org_role: z.enum([
    'SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 
    'OPERATIONS_MANAGER', 'ATTENDANCE_AUDITOR', 'MEMBER'
  ]).default('MEMBER'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const query = searchParams.get('query');

    const adminClient = createAdminClient();
    let dbQuery = adminClient
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });

    if (department) {
      dbQuery = dbQuery.eq('department', department);
    }
    if (role) {
      dbQuery = dbQuery.eq('org_role', role);
    }
    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,member_code.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data: members, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: members,
      meta: { count: members?.length || 0 },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateMemberSchema.parse(body);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('members')
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
