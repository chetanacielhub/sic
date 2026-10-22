// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/sessions/[id]/qr
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateRotatingChallenge } from '@/lib/qr/token';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const adminClient = createAdminClient();

    // 1. Fetch session and verify state
    const { data: session, error } = await adminClient
      .from('sessions')
      .select('id, title, status, qr_rotation_interval_sec, scheduled_start, scheduled_end')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    // 2. Check if session is in an active state
    if (!['SCHEDULED', 'OPEN', 'IN_PROGRESS'].includes(session.status)) {
      return NextResponse.json({
        success: false,
        error: `Attendance is closed for this session. Current status: ${session.status}`,
      }, { status: 403 });
    }

    // 3. Generate rotating cryptographic challenge
    const interval = session.qr_rotation_interval_sec || 30;
    const challengeData = generateRotatingChallenge(sessionId, interval);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        title: session.title,
        status: session.status,
        ...challengeData,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
