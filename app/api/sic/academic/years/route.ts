import { NextRequest, NextResponse } from 'next/server';
import { getAcademicYears, addAcademicYear } from '@/lib/academic/store';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const CreateYearSchema = z.object({
  course_id: z.string().uuid(),
  year_name: z.string().min(2).max(64),
  year_number: z.number().int().min(1).max(6),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id') || undefined;
    const years = await getAcademicYears(courseId);
    return NextResponse.json({ success: true, data: years });
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
    const validated = CreateYearSchema.parse(body);

    const created = await addAcademicYear(validated.course_id, validated.year_name, validated.year_number);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
