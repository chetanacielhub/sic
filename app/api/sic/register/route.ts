import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getCurrentMember } from '@/lib/auth/session';
import { getRegistrations, saveRegistration } from '@/lib/academic/store';
import { z } from 'zod';

const SubmitRegistrationSchema = z.object({
  full_name: z.string().min(2).max(255),
  college_id: z.string().uuid(),
  course_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  division_id: z.string().uuid(),
  roll_number: z.string().min(1).max(64),
  member_group_ids: z.array(z.string().uuid()).min(1, 'Please select at least one SIC Group to join.'),
  leader_group_ids: z.array(z.string().uuid()).default([]),
  avatar_url: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already an approved member
    const member = await getCurrentMember();
    if (member) {
      return NextResponse.json({
        success: true,
        isApprovedMember: true,
        member,
        registration: null,
      });
    }

    const registrations = await getRegistrations({ authUserId: user.id });
    const registration = registrations[0] || null;

    return NextResponse.json({
      success: true,
      isApprovedMember: false,
      registration,
      status: registration?.status || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized: User session required.' }, { status: 401 });
    }

    // Security check: Check if already an approved member
    const member = await getCurrentMember();
    if (member && member.status === 'ACTIVE') {
      return NextResponse.json({
        success: false,
        error: 'You are already an approved SIC Member. No additional registration is needed.',
      }, { status: 400 });
    }

    const body = await request.json();
    const validated = SubmitRegistrationSchema.parse(body);

    // Roll number uniqueness check within this college, course, year, and division
    const allRegistrations = await getRegistrations();
    const duplicateRoll = allRegistrations.find(
      r =>
        r.auth_user_id !== user.id &&
        r.college_id === validated.college_id &&
        r.course_id === validated.course_id &&
        r.academic_year_id === validated.academic_year_id &&
        r.division_id === validated.division_id &&
        r.roll_number.toLowerCase() === validated.roll_number.trim().toLowerCase() &&
        r.status !== 'REJECTED'
    );

    if (duplicateRoll) {
      return NextResponse.json({
        success: false,
        error: `Roll number '${validated.roll_number}' is already registered in this division. Please verify your roll number.`,
      }, { status: 409 });
    }

    // Save registration
    const registration = await saveRegistration({
      auth_user_id: user.id,
      email: user.email,
      full_name: validated.full_name,
      avatar_url: validated.avatar_url,
      college_id: validated.college_id,
      course_id: validated.course_id,
      academic_year_id: validated.academic_year_id,
      division_id: validated.division_id,
      roll_number: validated.roll_number,
      member_group_ids: validated.member_group_ids,
      leader_group_ids: validated.leader_group_ids,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully and is awaiting review.',
      data: registration,
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0]?.message || 'Validation failed', details: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
