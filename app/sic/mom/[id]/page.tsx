// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/mom/[id]
// Minutes of Meeting (MoM) & Action Items Governance Page
// ============================================================================

import { MoMEditor } from '@/components/sic/mom-editor';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function MoMPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        href={`/sic/sessions/${id}/live`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Live Session Monitor
      </Link>

      <MoMEditor sessionId={id} />
    </div>
  );
}
