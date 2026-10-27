import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { getRegistrations } from '@/lib/academic/store';

export async function GET(request: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getAssociateAdminScope(currentMember.id);
    if (!scope.isAuthorized) {
      return NextResponse.json({ success: false, error: 'Forbidden: Associate Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const collegeId = searchParams.get('college_id');

    // Determine allowed college IDs based on scope
    let collegeIds = scope.collegeIds;
    if (collegeId) {
      // If client requests a specific college, verify it's within admin's scope
      if (!scope.isSuperAdmin && collegeIds.length > 0 && !collegeIds.includes(collegeId)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Access to this college is unauthorized' }, { status: 403 });
      }
      collegeIds = [collegeId];
    }

    const registrations = await getRegistrations({
      collegeIds: collegeIds.length > 0 ? collegeIds : undefined,
      status,
    });

    return NextResponse.json({
      success: true,
      data: registrations,
      meta: {
        total: registrations.length,
        pending: registrations.filter(r => r.status === 'PENDING').length,
        approved: registrations.filter(r => r.status === 'APPROVED').length,
        needsCorrection: registrations.filter(r => r.status === 'NEEDS_CORRECTION').length,
        rejected: registrations.filter(r => r.status === 'REJECTED').length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
