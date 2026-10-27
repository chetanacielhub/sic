import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getCurrentMember } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file format. Only JPG, PNG, and WebP images are permitted.',
      }, { status: 415 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 5MB limit. Please upload an image under 5MB.',
      }, { status: 413 });
    }

    const admin = createAdminClient();
    const fileExt = file.name.split('.').pop() || 'webp';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Convert file to ArrayBuffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from('member-avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({
        success: false,
        error: `Storage upload failed: ${uploadError.message}`,
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('member-avatars')
      .getPublicUrl(filePath);

    // Update member record if member exists
    const member = await getCurrentMember();
    if (member) {
      await admin
        .from('members')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', member.id);
    }

    // Also update any pending member_registration
    try {
      await admin
        .from('member_registrations')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('auth_user_id', user.id);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Profile image uploaded successfully.',
      avatar_url: publicUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
