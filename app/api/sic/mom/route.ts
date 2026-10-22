// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/mom
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const ActionItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(255),
  description: z.string().optional().nullable(),
  assigned_member_id: z.string().uuid(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  due_date: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']).default('TODO'),
});

const UpsertMoMSchema = z.object({
  session_id: z.string().uuid(),
  agenda: z.string().optional().nullable(),
  discussion_notes: z.string().optional().nullable(),
  decisions: z.string().optional().nullable(),
  prepared_by: z.string().uuid(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).default('DRAFT'),
  action_items: z.array(ActionItemInputSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'session_id is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: mom, error } = await adminClient
      .from('meeting_minutes')
      .select(`
        *,
        prepared_by_member:members!meeting_minutes_prepared_by_fkey(id, full_name, email, member_code),
        approved_by_member:members!meeting_minutes_approved_by_fkey(id, full_name, email, member_code),
        session:sessions(id, title, scheduled_start, scheduled_end, venue),
        action_items(
          *,
          assigned_member:members(id, full_name, email, member_code)
        )
      `)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: mom });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = UpsertMoMSchema.parse(body);

    const adminClient = createAdminClient();

    // 1. Upsert Meeting Minutes
    const { data: mom, error: momErr } = await adminClient
      .from('meeting_minutes')
      .upsert({
        session_id: validated.session_id,
        agenda: validated.agenda,
        discussion_notes: validated.discussion_notes,
        decisions: validated.decisions,
        prepared_by: validated.prepared_by,
        status: validated.status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
      .select()
      .single();

    if (momErr) {
      return NextResponse.json({ success: false, error: momErr.message }, { status: 400 });
    }

    // 2. Handle Action Items if supplied
    if (validated.action_items && validated.action_items.length > 0) {
      const itemsToInsert = validated.action_items.map(item => ({
        mom_id: mom.id,
        title: item.title,
        description: item.description,
        assigned_member_id: item.assigned_member_id,
        priority: item.priority,
        due_date: item.due_date,
        status: item.status,
      }));

      await adminClient
        .from('action_items')
        .insert(itemsToInsert);
    }

    return NextResponse.json({ success: true, data: mom }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
