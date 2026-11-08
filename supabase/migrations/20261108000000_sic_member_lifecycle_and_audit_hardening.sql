-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Migration: 20261108000000_sic_member_lifecycle_and_audit_hardening.sql
-- Description: Production hardening for Members, Member Registrations,
--              Administrative Audit Logging, Indexes, Triggers & Strict RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Automatic updated_at Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. Harden Members & Member Registrations Schema, Constraints & Indexes
-- ----------------------------------------------------------------------------
ALTER TABLE members DROP CONSTRAINT IF EXISTS check_org_role;
ALTER TABLE members ADD CONSTRAINT check_org_role CHECK (org_role IN (
    'SUPER_ADMIN',
    'SIC_DIRECTOR',
    'SIC_ADMIN',
    'ASSOCIATE_ADMIN',
    'OPERATIONS_MANAGER',
    'ATTENDANCE_AUDITOR',
    'MEMBER'
));

ALTER TABLE members DROP CONSTRAINT IF EXISTS check_member_status;
ALTER TABLE members ADD CONSTRAINT check_member_status CHECK (status IN (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
));

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_lower ON members (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_members_registration_id ON members (registration_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_registrations_email_lower
    ON member_registrations (LOWER(email))
    WHERE status IN ('PENDING', 'NEEDS_CORRECTION', 'APPROVED', 'SUSPENDED');

CREATE INDEX IF NOT EXISTS idx_member_registrations_member_id ON member_registrations (member_id);

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_member_registrations_updated_at ON member_registrations;
CREATE TRIGGER trg_member_registrations_updated_at
    BEFORE UPDATE ON member_registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_groups_updated_at ON groups;
CREATE TRIGGER trg_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- ----------------------------------------------------------------------------
-- 3. Administrative Audit Logs Enhancements
-- ----------------------------------------------------------------------------
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS target_member_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_member ON audit_logs (target_member_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_audit_created_at ON registration_audit_logs (created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Hardened Security Helper Functions (Active Status Enforced)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS UUID AS $$
    SELECT id
    FROM members
    WHERE auth_user_id = auth.uid()
      AND status = 'ACTIVE'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_active_sic_member()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM members
        WHERE auth_user_id = auth.uid()
          AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_sic_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM members
        WHERE auth_user_id = auth.uid()
          AND status = 'ACTIVE'
          AND org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_associate_or_super_admin()
RETURNS BOOLEAN AS $$
    SELECT is_sic_admin() OR EXISTS (
        SELECT 1
        FROM members m
        LEFT JOIN associate_admins aa ON aa.member_id = m.id AND aa.is_active = true
        WHERE m.auth_user_id = auth.uid()
          AND m.status = 'ACTIVE'
          AND (m.org_role = 'ASSOCIATE_ADMIN' OR aa.id IS NOT NULL)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_lead_of_group(target_group_id UUID)
RETURNS BOOLEAN AS $$
    SELECT is_associate_or_super_admin() OR EXISTS (
        SELECT 1
        FROM group_leads gl
        JOIN members m ON m.id = gl.member_id
        WHERE m.auth_user_id = auth.uid()
          AND m.status = 'ACTIVE'
          AND gl.group_id = target_group_id
          AND gl.is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. Strict Row Level Security (RLS) Policies for Members, Registrations & Audit Logs
-- ----------------------------------------------------------------------------
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Members Policies:
-- 1. Admins (Super/Director/Admin/Associate Admin) have full management access
-- 2. Active members can view active members; authenticated users can view their own record
-- 3. Active members can only update their own non-privileged profile fields (cannot self-elevate org_role or status)
DROP POLICY IF EXISTS "Admins full manage members" ON members;
CREATE POLICY "Admins full manage members" ON members
    FOR ALL USING (is_associate_or_super_admin())
    WITH CHECK (is_associate_or_super_admin());

DROP POLICY IF EXISTS "Members view active member directory" ON members;
CREATE POLICY "Members view active member directory" ON members
    FOR SELECT USING (
        auth_user_id = auth.uid()
        OR is_associate_or_super_admin()
        OR (is_active_sic_member() AND status = 'ACTIVE')
    );

DROP POLICY IF EXISTS "Members update own profile" ON members;
CREATE POLICY "Members update own profile" ON members
    FOR UPDATE USING (
        auth_user_id = auth.uid()
        AND status = 'ACTIVE'
    )
    WITH CHECK (
        auth_user_id = auth.uid()
        AND status = 'ACTIVE'
        AND org_role = (SELECT m.org_role FROM members m WHERE m.id = members.id)
    );

-- Member Registrations Policies:
DROP POLICY IF EXISTS "Users Read Own Registration" ON member_registrations;
CREATE POLICY "Users Read Own Registration" ON member_registrations
    FOR SELECT USING (
        auth_user_id = auth.uid()
        OR is_associate_or_super_admin()
    );

DROP POLICY IF EXISTS "Users Insert Own Registration" ON member_registrations;
CREATE POLICY "Users Insert Own Registration" ON member_registrations
    FOR INSERT WITH CHECK (
        auth_user_id = auth.uid()
        AND status = 'PENDING'
    );

DROP POLICY IF EXISTS "Users Update Own Pending Registration" ON member_registrations;
CREATE POLICY "Users Update Own Pending Registration" ON member_registrations
    FOR UPDATE USING (
        (auth_user_id = auth.uid() AND status IN ('PENDING', 'NEEDS_CORRECTION'))
        OR is_associate_or_super_admin()
    )
    WITH CHECK (
        (auth_user_id = auth.uid() AND status = 'PENDING')
        OR is_associate_or_super_admin()
    );

-- Audit Logs Policies (Immutable for ordinary members; readable/insertable only by Admins):
DROP POLICY IF EXISTS "Only admins view audit logs" ON audit_logs;
CREATE POLICY "Only admins view audit logs" ON audit_logs
    FOR SELECT USING (is_associate_or_super_admin());

DROP POLICY IF EXISTS "Only admins insert audit logs" ON audit_logs;
CREATE POLICY "Only admins insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (is_associate_or_super_admin());

DROP POLICY IF EXISTS "Admins Read Audit Logs" ON registration_audit_logs;
CREATE POLICY "Admins Read Audit Logs" ON registration_audit_logs
    FOR SELECT USING (is_associate_or_super_admin());

DROP POLICY IF EXISTS "System Insert Audit Logs" ON registration_audit_logs;
DROP POLICY IF EXISTS "Admins Insert Registration Audit Logs" ON registration_audit_logs;
CREATE POLICY "Admins Insert Registration Audit Logs" ON registration_audit_logs
    FOR INSERT WITH CHECK (is_associate_or_super_admin());

