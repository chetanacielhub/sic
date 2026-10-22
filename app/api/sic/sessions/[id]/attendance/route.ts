// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/sessions/[id]/attendance
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const filterGroupId = searchParams.get('group_id');

    const adminClient = createAdminClient();

    // 1. Fetch Session
    const { data: session, error: sessErr } = await adminClient
      .from('sessions')
      .select(`
        id,
        title,
        status,
        scheduled_start,
        scheduled_end,
        session_type,
        session_groups(group:groups(id, name, code))
      `)
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    // 2. Fetch Eligible Members Snapshot
    let eligQuery = adminClient
      .from('session_eligible_members')
      .select(`
        member_id,
        origin_group_id,
        member:members(id, member_code, full_name, email, department, avatar_url),
        origin_group:groups(id, name, code)
      `)
      .eq('session_id', sessionId);

    if (filterGroupId) {
      eligQuery = eligQuery.eq('origin_group_id', filterGroupId);
    }

    const { data: eligibleRows, error: eligErr } = await eligQuery;
    if (eligErr) throw eligErr;

    // 3. Fetch Recorded Attendance for this Session
    const { data: attendanceRows, error: attErr } = await adminClient
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId);
    if (attErr) throw attErr;

    const attendanceMap = new Map<string, typeof attendanceRows[0]>();
    (attendanceRows || []).forEach(r => attendanceMap.set(r.member_id, r));

    // 4. Group & Deduplicate Roster by unique member
    interface MemberRosterItem {
      member_id: string;
      member_code: string;
      full_name: string;
      email: string;
      department: string;
      avatar_url?: string | null;
      origin_groups: Array<{ id: string; name: string; code: string }>;
      status: string;
      check_in_time?: string | null;
      verification_method?: string | null;
    }

    const memberRosterMap = new Map<string, MemberRosterItem>();

    (eligibleRows || []).forEach(row => {
      const mem = row.member as unknown as { id: string; member_code: string; full_name: string; email: string; department: string; avatar_url: string | null };
      if (!mem) return;

      const att = attendanceMap.get(mem.id);
      const groupInfo = row.origin_group as unknown as { id: string; name: string; code: string };

      if (!memberRosterMap.has(mem.id)) {
        memberRosterMap.set(mem.id, {
          member_id: mem.id,
          member_code: mem.member_code,
          full_name: mem.full_name,
          email: mem.email,
          department: mem.department,
          avatar_url: mem.avatar_url,
          origin_groups: groupInfo ? [groupInfo] : [],
          status: att ? att.status : 'NOT_MARKED',
          check_in_time: att ? att.check_in_time : null,
          verification_method: att ? att.verification_method : null,
        });
      } else {
        const existing = memberRosterMap.get(mem.id)!;
        if (groupInfo && !existing.origin_groups.some(g => g.id === groupInfo.id)) {
          existing.origin_groups.push(groupInfo);
        }
      }
    });

    const roster = Array.from(memberRosterMap.values());

    // 5. Calculate Metrics
    const totalEligible = roster.length;
    let totalPresent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalUnmarked = 0;

    roster.forEach(m => {
      if (m.status === 'PRESENT') totalPresent++;
      else if (m.status === 'LATE') totalLate++;
      else if (m.status === 'EXCUSED') totalExcused++;
      else totalUnmarked++;
    });

    const verifiedAttended = totalPresent + totalLate;
    const attendancePct = totalEligible > 0 
      ? Math.round((verifiedAttended / totalEligible) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        session,
        summary: {
          total_eligible: totalEligible,
          total_present: totalPresent,
          total_late: totalLate,
          total_excused: totalExcused,
          total_unmarked: totalUnmarked,
          attendance_percentage: attendancePct,
          is_filtered: Boolean(filterGroupId),
        },
        roster,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
