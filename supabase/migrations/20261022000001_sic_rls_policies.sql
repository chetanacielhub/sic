-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Migration: 20261022000001_sic_rls_policies.sql
-- Description: PostgreSQL Row Level Security (RLS) policies and security scopes
-- ============================================================================

-- Helper functions to resolve current user identity and roles
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS UUID AS $$
    SELECT id FROM members WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_sic_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM members 
        WHERE auth_user_id = auth.uid() 
          AND org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_lead_of_group(target_group_id UUID)
RETURNS BOOLEAN AS $$
    SELECT is_sic_admin() OR EXISTS (
        SELECT 1 FROM group_leads gl
        JOIN members m ON m.id = gl.member_id
        WHERE m.auth_user_id = auth.uid() 
          AND gl.group_id = target_group_id
          AND gl.is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Enable RLS on all tables
-- ----------------------------------------------------------------------------
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_eligible_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Members Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins full manage members" ON members
    FOR ALL USING (is_sic_admin());

CREATE POLICY "Members view active member directory" ON members
    FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'ACTIVE');

CREATE POLICY "Members update own profile" ON members
    FOR UPDATE USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Groups & Memberships Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone authenticated view active groups" ON groups
    FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins manage groups" ON groups
    FOR ALL USING (is_sic_admin());

CREATE POLICY "View group memberships" ON group_memberships
    FOR SELECT USING (
        is_sic_admin() 
        OR member_id = get_current_member_id()
        OR is_lead_of_group(group_id)
    );

CREATE POLICY "Leads and admins manage memberships" ON group_memberships
    FOR ALL USING (is_lead_of_group(group_id));

CREATE POLICY "View group leads" ON group_leads
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage group leads" ON group_leads
    FOR ALL USING (is_sic_admin());

-- ----------------------------------------------------------------------------
-- Sessions Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "View accessible sessions" ON sessions
    FOR SELECT USING (
        is_sic_admin()
        OR host_id = get_current_member_id()
        OR EXISTS (
            SELECT 1 FROM session_groups sg
            JOIN group_memberships gm ON gm.group_id = sg.group_id
            WHERE sg.session_id = sessions.id
              AND gm.member_id = get_current_member_id()
              AND gm.status = 'ACTIVE'
        )
    );

CREATE POLICY "Hosts and admins manage sessions" ON sessions
    FOR ALL USING (
        is_sic_admin() OR host_id = get_current_member_id()
    );

CREATE POLICY "View session groups" ON session_groups
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Hosts and admins manage session groups" ON session_groups
    FOR ALL USING (
        is_sic_admin() OR EXISTS (
            SELECT 1 FROM sessions s 
            WHERE s.id = session_id AND s.host_id = get_current_member_id()
        )
    );

CREATE POLICY "View eligible members" ON session_eligible_members
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- Attendance Records Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "View attendance records" ON attendance_records
    FOR SELECT USING (
        is_sic_admin()
        OR member_id = get_current_member_id()
        OR EXISTS (
            SELECT 1 FROM sessions s 
            WHERE s.id = session_id AND s.host_id = get_current_member_id()
        )
        OR EXISTS (
            SELECT 1 FROM session_groups sg
            WHERE sg.session_id = attendance_records.session_id
              AND is_lead_of_group(sg.group_id)
        )
    );

CREATE POLICY "Members insert own attendance" ON attendance_records
    FOR INSERT WITH CHECK (
        member_id = get_current_member_id()
    );

CREATE POLICY "Hosts and admins update attendance" ON attendance_records
    FOR UPDATE USING (
        is_sic_admin() OR EXISTS (
            SELECT 1 FROM sessions s 
            WHERE s.id = session_id AND s.host_id = get_current_member_id()
        )
    );

-- ----------------------------------------------------------------------------
-- QR Challenges Policies (Privileged)
-- ----------------------------------------------------------------------------
CREATE POLICY "Only hosts and admins view/manage QR challenges" ON qr_challenges
    FOR ALL USING (
        is_sic_admin() OR EXISTS (
            SELECT 1 FROM sessions s 
            WHERE s.id = session_id AND s.host_id = get_current_member_id()
        )
    );

-- ----------------------------------------------------------------------------
-- Meeting Minutes & Action Items Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "View meeting minutes" ON meeting_minutes
    FOR SELECT USING (
        is_sic_admin() OR EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_id
        )
    );

CREATE POLICY "Hosts and admins manage minutes" ON meeting_minutes
    FOR ALL USING (
        is_sic_admin() OR prepared_by = get_current_member_id() OR EXISTS (
            SELECT 1 FROM sessions s 
            WHERE s.id = session_id AND s.host_id = get_current_member_id()
        )
    );

CREATE POLICY "View action items" ON action_items
    FOR SELECT USING (
        is_sic_admin() OR assigned_member_id = get_current_member_id() OR true
    );

CREATE POLICY "Assigned members update action status" ON action_items
    FOR UPDATE USING (
        is_sic_admin() OR assigned_member_id = get_current_member_id()
    );

-- ----------------------------------------------------------------------------
-- Daily Attendance Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Members view own daily attendance" ON daily_attendance
    FOR SELECT USING (
        is_sic_admin() OR member_id = get_current_member_id()
    );

CREATE POLICY "Members insert own daily checkin" ON daily_attendance
    FOR INSERT WITH CHECK (
        member_id = get_current_member_id()
    );

CREATE POLICY "Members update own daily checkout" ON daily_attendance
    FOR UPDATE USING (
        member_id = get_current_member_id() OR is_sic_admin()
    );

-- ----------------------------------------------------------------------------
-- Audit Logs Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Only admins view audit logs" ON audit_logs
    FOR SELECT USING (is_sic_admin());
