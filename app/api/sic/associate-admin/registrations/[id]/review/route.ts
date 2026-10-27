import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { processRegistrationReview, getRegistrations } from '@/lib/academic/store';
import { z } from 'zod';

const ReviewActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CORRECTION']),
  notes: z.string().optional(),
  approved_group_ids: z.array(z.string().uuid()).optional(),
  approved_leader_group_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await params;
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getAssociateAdminScope(currentMember.id);
    if (!scope.isAuthorized) {
      return NextResponse.json({ success: false, error: 'Forbidden: Associate Admin access required' }, { status: 403 });
    }

    // Verify registration exists and falls within the admin's college scope
    const registrations = await getRegistrations();
    const reg = registrations.find(r => r.id === registrationId);
    if (!reg) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    if (!scope.isSuperAdmin && scope.collegeIds.length > 0 && !scope.collegeIds.includes(reg.college_id)) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not have permission to manage applications from this institution.' }, { status: 403 });
    }

    const body = await request.json();
    const validated = ReviewActionSchema.parse(body);

    const result = await processRegistrationReview({
      registrationId,
      reviewerMemberId: currentMember.id,
      action: validated.action,
      notes: validated.notes,
      approvedGroupIds: validated.approved_group_ids,
      approvedLeaderGroupIds: validated.approved_leader_group_ids,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Registration ${validated.action.toLowerCase().replace('_', ' ')} processed successfully.`,
      data: result.registration,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0]?.message || 'Validation failed' }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
