// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/sessions/[id]/qr
// Dedicated Full-Screen Rotating QR Presentation Display
// ============================================================================

import { RotatingQrDisplay } from '@/components/sic/qr-display';

export default async function SessionQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-4xl mx-auto py-2">
      <RotatingQrDisplay sessionId={id} />
    </div>
  );
}
