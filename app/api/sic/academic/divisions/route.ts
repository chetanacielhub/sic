import { NextRequest, NextResponse } from 'next/server';
import { getDivisions, addDivision, deleteDivision, getCourses } from '@/lib/academic/store';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const CreateDivisionSchema = z.object({
  college_id: z.string().uuid(),
  course_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  name: z.string().min(1).max(32),
});

const SetDivisionCountSchema = z.object({
  college_id: z.string().uuid(),
  course_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  count: z.number().int().min(1).max(10), // e.g. setting 3 divisions creates Division A, B, C
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get('college_id') || undefined;
    const courseId = searchParams.get('course_id') || undefined;
    const academicYearId = searchParams.get('academic_year_id') || undefined;

    const divisions = await getDivisions({ collegeId, courseId, academicYearId });
    return NextResponse.json({ 
      success: true, 
      data: divisions,
      meta: { count: divisions.length } // derived dynamically from actual division records
    });
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

    // Support setting division count in batch (e.g. set count to 3 -> creates Division A, B, C)
    if (body.count !== undefined) {
      const validated = SetDivisionCountSchema.parse(body);
      const existing = await getDivisions({ academicYearId: validated.academic_year_id });
      
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const targetCount = validated.count;
      const createdDivisions = [];

      for (let i = 0; i < targetCount; i++) {
        const divName = `Division ${letters[i]}`;
        const alreadyExists = existing.some(d => d.name.toLowerCase() === divName.toLowerCase());
        if (!alreadyExists) {
          const newDiv = await addDivision(validated.college_id, validated.course_id, validated.academic_year_id, divName);
          createdDivisions.push(newDiv);
        }
      }

      const allUpdated = await getDivisions({ academicYearId: validated.academic_year_id });
      return NextResponse.json({
        success: true,
        data: allUpdated,
        meta: { count: allUpdated.length }
      });
    }

    // Single division addition
    const validated = CreateDivisionSchema.parse(body);
    const created = await addDivision(validated.college_id, validated.course_id, validated.academic_year_id, validated.name);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scope = await getAssociateAdminScope(currentMember.id);
    if (!scope.isAuthorized) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Division ID is required' }, { status: 400 });
    }

    const removed = await deleteDivision(id);
    return NextResponse.json({ success: true, removed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
