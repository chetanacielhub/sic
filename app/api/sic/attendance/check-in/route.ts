// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/attendance/check-in
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyRotatingChallenge } from '@/lib/qr/token';
import { z } from 'zod';

const CheckInSchema = z.object({
  challenge: z.string().min(10),
  member_id: z.string().uuid(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CheckInSchema.parse(body);

    const parts = validated.challenge.split(':');
    if (parts.length < 3 || parts[0] !== 'SIC' || parts[1] !== 'ATTEND') {
      return NextResponse.json({ success: false, error: 'Malformed challenge token format.' }, { status: 400 });
    }

    const sessionId = parts[2];
    const adminClient = createAdminClient();

    // 1. Fetch Session to check rotation interval and status
    const { data: session, error: sessErr } = await adminClient
      .from('sessions')
      .select('id, title, status, qr_rotation_interval_sec, scheduled_start, late_grace_period_mins')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    if (!['OPEN', 'IN_PROGRESS', 'SCHEDULED'].includes(session.status)) {
      return NextResponse.json({
        success: false,
        error: `Attendance is closed for this session. Status: ${session.status}`,
      }, { status: 403 });
    }

    // 2. Cryptographic Token Verification
    const verification = verifyRotatingChallenge(
      sessionId,
      validated.challenge,
      session.qr_rotation_interval_sec || 30,
      1 // allow 1 drift interval
    );

    if (!verification.valid) {
      return NextResponse.json({ success: false, error: verification.error }, { status: 401 });
    }

    // 3. Member Eligibility Verification
    const { data: isEligible } = await adminClient
      .from('session_eligible_members')
      .select('id')
      .eq('session_id', sessionId)
      .eq('member_id', validated.member_id)
      .maybeSingle();

    if (!isEligible) {
      return NextResponse.json({
        success: false,
        error: 'You are not an eligible member for this session.',
      }, { status: 403 });
    }

    // 4. Fetch Member Details
    const { data: member, error: memErr } = await adminClient
      .from('members')
      .select('id, member_code, full_name, email, department')
      .eq('id', validated.member_id)
      .single();

    if (memErr || !member) {
      return NextResponse.json({ success: false, error: 'Member not found.' }, { status: 404 });
    }

    // 5. Check-In via RPC or Atomic Direct Insert
    let recordId: string;
    let attendanceStatus: string;
    let checkInTime: string;
    let isDuplicate = false;

    const { data: rpcResult, error: rpcErr } = await adminClient.rpc('record_attendance_checkin', {
      p_session_id: sessionId,
      p_member_id: validated.member_id,
      p_challenge_nonce: verification.nonce,
      p_verification_method: 'ROTATING_QR',
      p_ip_address: request.headers.get('x-forwarded-for') || null,
      p_user_agent: request.headers.get('user-agent') || null,
    });

    if (rpcErr || !rpcResult || rpcResult.length === 0) {
      // Fallback: direct atomic upsert logic
      const { data: existing } = await adminClient
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId)
        .eq('member_id', validated.member_id)
        .maybeSingle();

      if (existing) {
        recordId = existing.id;
        attendanceStatus = existing.status;
        checkInTime = existing.check_in_time;
        isDuplicate = true;
      } else {
        const now = new Date();
        const scheduledStart = new Date(session.scheduled_start);
        const graceMs = (session.late_grace_period_mins || 15) * 60 * 1000;
        const calculatedStatus = (now.getTime() > scheduledStart.getTime() + graceMs) ? 'LATE' : 'PRESENT';

        const { data: inserted, error: insErr } = await adminClient
          .from('attendance_records')
          .insert([{
            session_id: sessionId,
            member_id: validated.member_id,
            status: calculatedStatus,
            check_in_time: now.toISOString(),
            verification_method: 'ROTATING_QR',
            challenge_nonce: verification.nonce,
            ip_address: request.headers.get('x-forwarded-for') || null,
            user_agent: request.headers.get('user-agent') || null,
          }])
          .select()
          .single();

        if (insErr) {
          return NextResponse.json({ success: false, error: insErr.message }, { status: 400 });
        }

        recordId = inserted.id;
        attendanceStatus = inserted.status;
        checkInTime = inserted.check_in_time;
      }
    } else {
      const res = rpcResult[0];
      recordId = res.record_id;
      attendanceStatus = res.attendance_status;
      checkInTime = res.check_in_time;
      isDuplicate = res.is_duplicate;
    }

    return NextResponse.json({
      success: true,
      data: {
        record_id: recordId,
        session_id: session.id,
        session_title: session.title,
        member_id: member.id,
        member_name: member.full_name,
        member_code: member.member_code,
        status: attendanceStatus,
        check_in_time: checkInTime,
        is_duplicate: isDuplicate,
        message: isDuplicate 
          ? 'Attendance was already marked previously for this session.' 
          : 'Attendance marked successfully!',
      },
    }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
