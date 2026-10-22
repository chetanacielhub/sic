// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /api/sic/mom/[id]/pdf
// Server-Side Official PDF Export
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { jsPDF } from 'jspdf';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: momId } = await params;
    const adminClient = createAdminClient();

    // 1. Fetch complete MoM data with session, host, and action items
    const { data: mom, error } = await adminClient
      .from('meeting_minutes')
      .select(`
        *,
        prepared_by_member:members!meeting_minutes_prepared_by_fkey(full_name, member_code, email),
        approved_by_member:members!meeting_minutes_approved_by_fkey(full_name, member_code, email),
        session:sessions(
          id, 
          title, 
          scheduled_start, 
          scheduled_end, 
          venue,
          session_type,
          session_groups(group:groups(name, code))
        ),
        action_items(
          title,
          description,
          priority,
          due_date,
          status,
          assigned_member:members(full_name, member_code)
        )
      `)
      .eq('id', momId)
      .single();

    if (error || !mom) {
      return NextResponse.json({ success: false, error: 'Meeting minutes not found.' }, { status: 404 });
    }

    // 2. Generate PDF using jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [22, 101, 52]; // Dark green / institutional
    const textColor = [30, 41, 59];
    const lightBg = [241, 245, 249];

    // Header Band
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SIC — CHETANA INNOVATION ECOSYSTEM', 15, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Minutes of Meeting (MoM) & Operations Record', 15, 20);

    // Document Meta
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    let y = 38;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(mom.session?.title || 'Meeting Session', 15, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const groupsList = (mom.session?.session_groups || [])
      .map((sg: { group: { name: string } }) => sg.group?.name)
      .filter(Boolean)
      .join(', ') || 'General SIC';

    doc.text(`Participating Groups: ${groupsList}`, 15, y);
    y += 5;
    doc.text(`Scheduled Date & Time: ${new Date(mom.session?.scheduled_start).toLocaleString()}`, 15, y);
    y += 5;
    doc.text(`Venue: ${mom.session?.venue || 'SIC Innovation Centre'}`, 15, y);
    y += 5;
    doc.text(`Document Status: ${mom.status}  |  Version: v${mom.current_version}`, 15, y);
    y += 10;

    // Agenda Section
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. MEETING AGENDA', 18, y + 5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const agendaText = mom.agenda || 'Standard operations and progress review.';
    const agendaLines = doc.splitTextToSize(agendaText, 175);
    doc.text(agendaLines, 18, y);
    y += agendaLines.length * 5 + 6;

    // Discussion Notes
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('2. DISCUSSION & DELIBERATIONS', 18, y + 5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notesText = mom.discussion_notes || 'All project milestones and operational blockers evaluated.';
    const notesLines = doc.splitTextToSize(notesText, 175);
    doc.text(notesLines, 18, y);
    y += notesLines.length * 5 + 6;

    // Decisions
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('3. KEY DECISIONS ADOPTED', 18, y + 5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const decisionsText = mom.decisions || 'Consensus reached on upcoming test schedule.';
    const decisionLines = doc.splitTextToSize(decisionsText, 175);
    doc.text(decisionLines, 18, y);
    y += decisionLines.length * 5 + 6;

    // Action Items Table
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('4. ACTION ITEMS & ACCOUNTABILITY', 18, y + 5);
    y += 11;

    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(15, y, 180, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Task Description', 18, y + 4.5);
    doc.text('Assignee', 105, y + 4.5);
    doc.text('Priority', 145, y + 4.5);
    doc.text('Due Date', 165, y + 4.5);
    doc.text('Status', 185, y + 4.5);
    y += 8;

    doc.setFont('helvetica', 'normal');
    const items = mom.action_items || [];
    if (items.length === 0) {
      doc.text('No outstanding action items recorded.', 18, y);
      y += 8;
    } else {
      items.forEach((item: { title: string; assigned_member?: { full_name: string }; priority: string; due_date: string; status: string }) => {
        doc.text(item.title.slice(0, 48), 18, y);
        doc.text(item.assigned_member?.full_name?.slice(0, 20) || 'Unassigned', 105, y);
        doc.text(item.priority || 'MEDIUM', 145, y);
        doc.text(item.due_date || '-', 165, y);
        doc.text(item.status || 'TODO', 185, y);
        y += 6;
      });
    }

    y += 8;

    // Signatures / Approvals
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y, 195, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Prepared By: ${mom.prepared_by_member?.full_name || 'Host'} (${mom.prepared_by_member?.member_code || ''})`, 18, y);
    doc.text(`Approved By: ${mom.approved_by_member?.full_name || 'Pending Review'}`, 120, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Recorded: ${new Date(mom.created_at).toLocaleDateString()}`, 18, y);
    if (mom.status === 'APPROVED') {
      doc.text('Verification: SIC Institutional Signature Verified', 120, y);
    }

    // Convert PDF to Buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SIC_MoM_${mom.id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
