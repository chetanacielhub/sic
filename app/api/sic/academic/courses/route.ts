import { NextRequest, NextResponse } from 'next/server';
import { getCourses, addCourse } from '@/lib/academic/store';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const CreateCourseSchema = z.object({
  college_id: z.string().uuid(),
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(32),
  duration_years: z.number().int().min(1).max(6).default(3),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get('college_id') || undefined;
    const courses = await getCourses(collegeId);
    return NextResponse.json({ success: true, data: courses });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getAssociateAdminScope(currentMember.id);
    if (!scope.isAuthorized) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateCourseSchema.parse(body);

    // If scoped associate admin, verify they have permission for this college
    if (!scope.isSuperAdmin && scope.collegeIds.length > 0 && !scope.collegeIds.includes(validated.college_id)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Cannot add courses outside your assigned college scope' }, { status: 403 });
    }

    const created = await addCourse(validated.college_id, validated.name, validated.code, validated.duration_years);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
