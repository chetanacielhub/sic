// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/sessions/[id]/live
// Real-time Headcount & Multi-Group Attendance Roster Monitor
// ============================================================================

import { LiveAttendanceMonitor } from '@/components/sic/live-roster';

export default async function LiveAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-6xl mx-auto py-2">
      <LiveAttendanceMonitor sessionId={id} />
    </div>
  );
}
