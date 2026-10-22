// ============================================================================
// SIC Unified Attendance & Operations Management System
// Domain Types & Interfaces
// ============================================================================

export type OrgRole = 
  | 'SUPER_ADMIN'
  | 'SIC_DIRECTOR'
  | 'SIC_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'ATTENDANCE_AUDITOR'
  | 'MEMBER';

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Member {
  id: string;
  auth_user_id?: string | null;
  member_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  department: string;
  designation: string;
  org_role: OrgRole;
  status: MemberStatus;
  joining_date: string;
  created_at: string;
  updated_at: string;
}

export type GroupType = 'PERMANENT' | 'TEMPORARY' | 'PROJECT' | 'EVENT' | 'WORKSHOP';

export interface Group {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  group_type: GroupType;
  parent_group_id?: string | null;
  is_active: boolean;
  capacity_limit: number;
  attendance_policy: {
    grace_period_mins: number;
    min_attendance_pct: number;
  };
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadType = 'PRIMARY_LEAD' | 'CO_LEAD';

export interface GroupLead {
  id: string;
  group_id: string;
  member_id: string;
  lead_type: LeadType;
  assigned_at: string;
  assigned_by?: string | null;
  is_active: boolean;
  member?: Member;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  member_id: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'LEFT';
  joined_at: string;
  ended_at?: string | null;
  added_by?: string | null;
  member?: Member;
  group?: Group;
}

export type SessionType = 
  | 'DAILY_DUTY'
  | 'GROUP_MEETING'
  | 'MULTI_GROUP_MEETING'
  | 'GENERAL_MEETING'
  | 'WORKSHOP'
  | 'EVENT';

export type SessionStatus = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'RECONCILED'
  | 'FINALIZED'
  | 'CANCELLED';

export interface Session {
  id: string;
  title: string;
  description?: string | null;
  session_type: SessionType;
  host_id: string;
  status: SessionStatus;
  scheduled_start: string;
  scheduled_end: string;
  venue?: string | null;
  meeting_link?: string | null;
  qr_active_from?: string | null;
  qr_active_to?: string | null;
  qr_rotation_interval_sec: number;
  late_grace_period_mins: number;
  require_location: boolean;
  expected_latitude?: number | null;
  expected_longitude?: number | null;
  allowed_radius_meters?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  host?: Member;
  groups?: Group[];
}

export type AttendanceStatus = 
  | 'NOT_MARKED'
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'EXCUSED'
  | 'PENDING_VERIFICATION'
  | 'INVALIDATED';

export interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id: string;
  status: AttendanceStatus;
  check_in_time: string;
  check_out_time?: string | null;
  verification_method: string;
  challenge_nonce?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export interface SessionHeadcountSummary {
  session_id: string;
  total_eligible: number;
  total_present: number;
  total_late: number;
  total_excused: number;
  total_unmarked: number;
  attendance_percentage: number;
}

export type MoMStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';

export interface MeetingMinutes {
  id: string;
  session_id: string;
  agenda?: string | null;
  discussion_notes?: string | null;
  decisions?: string | null;
  prepared_by: string;
  approved_by?: string | null;
  status: MoMStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
  prepared_by_member?: Member;
  approved_by_member?: Member;
}

export type ActionItemStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type ActionItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ActionItem {
  id: string;
  mom_id: string;
  title: string;
  description?: string | null;
  assigned_member_id: string;
  priority: ActionItemPriority;
  due_date: string;
  status: ActionItemStatus;
  created_at: string;
  updated_at: string;
  assigned_member?: Member;
}

export interface DailyAttendance {
  id: string;
  member_id: string;
  duty_date: string;
  check_in_time: string;
  check_out_time?: string | null;
  total_duty_hours?: number | null;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'REMOTE_APPROVED';
  notes?: string | null;
  created_at: string;
  member?: Member;
}
