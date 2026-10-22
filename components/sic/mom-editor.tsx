// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Minutes of Meeting (MoM) Editor & Action Items Tracker
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Save, 
  CheckCircle, 
  Download, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCheck,
  AlertCircle
} from 'lucide-react';

interface MemberOption {
  id: string;
  full_name: string;
  member_code: string;
}

interface ActionItem {
  id?: string;
  title: string;
  assigned_member_id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  due_date: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
}

interface MoMEditorProps {
  sessionId: string;
  preparedById?: string;
}

export function MoMEditor({ sessionId, preparedById }: MoMEditorProps) {
  const [momId, setMomId] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<string>('');
  const [discussionNotes, setDiscussionNotes] = useState<string>('');
  const [decisions, setDecisions] = useState<string>('');
  const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED' | 'APPROVED'>('DRAFT');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load existing MoM and member options
  const loadData = useCallback(async () => {
    try {
      const [momRes, memRes] = await Promise.all([
        fetch(`/api/sic/mom?session_id=${sessionId}`),
        fetch('/api/sic/members'),
      ]);

      if (memRes.ok && memRes.headers.get('content-type')?.includes('application/json')) {
        const memJson = await memRes.json();
        if (memJson.success) {
          setMembers(memJson.data || []);
        }
      }

      if (momRes.ok && momRes.headers.get('content-type')?.includes('application/json')) {
        const momJson = await momRes.json();
        if (momJson.success && momJson.data) {
          const m = momJson.data;
          setMomId(m.id);
          setAgenda(m.agenda || '');
          setDiscussionNotes(m.discussion_notes || '');
          setDecisions(m.decisions || '');
          setStatus(m.status || 'DRAFT');
          setActionItems(m.action_items || []);
        }
      }
    } catch (err) {
      console.error('Error loading MoM:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add Action Item
  const handleAddActionItem = () => {
    const defaultAssignee = members[0]?.id || '';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);

    setActionItems(prev => [
      ...prev,
      {
        title: '',
        assigned_member_id: defaultAssignee,
        priority: 'MEDIUM',
        due_date: tomorrow.toISOString().split('T')[0],
        status: 'TODO',
      },
    ]);
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleActionItemChange = (index: number, field: keyof ActionItem, value: unknown) => {
    setActionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save MoM Draft or Submit
  const handleSave = async (targetStatus: 'DRAFT' | 'SUBMITTED') => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      const payload = {
        session_id: sessionId,
        agenda,
        discussion_notes: discussionNotes,
        decisions,
        prepared_by: preparedById || members[0]?.id || '11111111-1111-1111-1111-111111111111',
        status: targetStatus,
        action_items: actionItems,
      };

      const res = await fetch('/api/sic/mom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMomId(json.data.id);
        setStatus(targetStatus);
        setSaveMessage(targetStatus === 'SUBMITTED' ? 'MoM Submitted for Approval!' : 'MoM Draft Saved!');
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        alert(json.error || 'Failed to save MoM.');
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Director Approval
  const handleApprove = async () => {
    if (!momId) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/sic/mom/${momId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: '22222222-2222-2222-2222-222222222222', // Dr. Rajesh Sharma
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStatus('APPROVED');
        setSaveMessage('MoM Approved by SIC Director!');
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-700" />
            <h2 className="text-xl font-bold text-slate-900">Minutes of Meeting (MoM)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Record deliberations, key institutional decisions, and assigned action deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            status === 'APPROVED' 
              ? 'bg-emerald-100 text-emerald-800' 
              : status === 'SUBMITTED' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-slate-100 text-slate-700'
          }`}>
            Status: {status}
          </span>

          {momId && (
            <a
              href={`/api/sic/mom/${momId}/pdf`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </a>
          )}
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {saveMessage}
        </div>
      )}

      {/* Agenda */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">1. Meeting Agenda</label>
        <textarea
          rows={3}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Topics scheduled for deliberation..."
          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      {/* Discussion Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">2. Discussion Notes & Deliberations</label>
        <textarea
          rows={5}
          value={discussionNotes}
          onChange={(e) => setDiscussionNotes(e.target.value)}
          placeholder="Key technical arguments, project milestone updates, blockers evaluated..."
          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      {/* Decisions */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">3. Decisions Adopted</label>
        <textarea
          rows={3}
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          placeholder="Consensus reached, approvals granted..."
          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      {/* Action Items Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">4. Action Items & Assignees</label>
          <button
            type="button"
            onClick={handleAddActionItem}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Task
          </button>
        </div>

        {actionItems.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
            No action items added yet. Click &quot;Add Task&quot; to assign follow-up deliverables.
          </div>
        ) : (
          <div className="space-y-2">
            {actionItems.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="text"
                  placeholder="Deliverable description..."
                  value={item.title}
                  onChange={(e) => handleActionItemChange(idx, 'title', e.target.value)}
                  className="w-full sm:flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />

                <select
                  value={item.assigned_member_id}
                  onChange={(e) => handleActionItemChange(idx, 'assigned_member_id', e.target.value)}
                  className="w-full sm:w-44 text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>
                  ))}
                </select>

                <select
                  value={item.priority}
                  onChange={(e) => handleActionItemChange(idx, 'priority', e.target.value)}
                  className="w-full sm:w-28 text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                <input
                  type="date"
                  value={item.due_date}
                  onChange={(e) => handleActionItemChange(idx, 'due_date', e.target.value)}
                  className="w-full sm:w-36 text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveActionItem(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="text-[11px] text-slate-500 font-medium">
          Once approved, changes increment document revision and notify assignees.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('DRAFT')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </button>

          {status === 'DRAFT' && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave('SUBMITTED')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-2xs"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Submit for Review
            </button>
          )}

          {status === 'SUBMITTED' && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleApprove}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-2xs"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve MoM
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
