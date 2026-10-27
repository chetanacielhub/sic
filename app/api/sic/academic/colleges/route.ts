import { NextRequest, NextResponse } from 'next/server';
import { getColleges, addCollege, updateCollege } from '@/lib/academic/store';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const CreateCollegeSchema = z.object({
  name: z.string().min(3).max(255),
  code: z.string().min(2).max(32),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const colleges = await getColleges();
    return NextResponse.json({ success: true, data: colleges });
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
    const validated = CreateCollegeSchema.parse(body);

    const created = await addCollege(validated.name, validated.code, validated.description);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { id, name, code, description, is_active } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
    }

    const updated = await updateCollege(id, { name, code, description, is_active });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
