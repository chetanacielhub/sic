import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getSessionUser, getCurrentMember } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET_NAME = 'member-avatars';

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

    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    let publicUrl = '';

    // 1. Attempt upload to Supabase Storage
    let { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    // 2. If bucket does not exist, attempt to create it and retry
    if (uploadError && uploadError.message?.toLowerCase().includes('bucket not found')) {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });

      const retry = await admin.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });
      uploadError = retry.error;
    }

    if (!uploadError) {
      const { data } = admin.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      publicUrl = data.publicUrl;
    } else {
      // 3. Fallback: store locally in public/uploads/avatars or as data URI if bucket isn't provisioned yet
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(path.join(uploadsDir, fileName), buffer);
        publicUrl = `/uploads/avatars/${fileName}`;
      } catch {
        publicUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
      }
    }

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
