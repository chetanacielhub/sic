// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/mom/[id]/approve
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const ApproveSchema = z.object({
  approved_by: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: momId } = await params;
    const body = await request.json();
    const validated = ApproveSchema.parse(body);

    const adminClient = createAdminClient();

    const { data: mom, error } = await adminClient
      .from('meeting_minutes')
      .update({
        status: 'APPROVED',
        approved_by: validated.approved_by,
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
