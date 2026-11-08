-- ============================================================================
-- SIC UNIFIED ATTENDANCE & OPERATIONS MANAGEMENT SYSTEM
-- CONSOLIDATED DATABASE SCHEMA, ACADEMIC HIERARCHY, RBAC & AUDIT MIGRATION
-- ============================================================================

-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Migration: 20261022000000_sic_initial_schema.sql
-- Description: Core schema, tables, foreign keys, unique constraints, and indexes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Identity & Members
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    member_code VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32),
    avatar_url TEXT,
    department VARCHAR(128) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    org_role VARCHAR(64) NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_org_role CHECK (org_role IN (
        'SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 
        'OPERATIONS_MANAGER', 'ATTENDANCE_AUDITOR', 'MEMBER'
    )),
    CONSTRAINT check_member_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

CREATE INDEX IF NOT EXISTS idx_members_auth_user ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- ----------------------------------------------------------------------------
-- 2. Groups, Memberships & Multi-Leads
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    group_type VARCHAR(64) NOT NULL DEFAULT 'PERMANENT',
    parent_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    capacity_limit INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    attendance_policy JSONB NOT NULL DEFAULT '{"grace_period_mins": 15, "min_attendance_pct": 75}'::jsonb,
    created_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_group_type CHECK (group_type IN (
        'PERMANENT', 'TEMPORARY', 'PROJECT', 'EVENT', 'WORKSHOP'
    ))
);

CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);
CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);

-- Multi-group memberships with non-destructive history
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    added_by UUID REFERENCES members(id) ON DELETE SET NULL,
    CONSTRAINT check_membership_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'LEFT'))
);

CREATE INDEX IF NOT EXISTS idx_gm_group_member ON group_memberships(group_id, member_id);
CREATE INDEX IF NOT EXISTS idx_gm_status ON group_memberships(status);

-- Multi-lead support per group
CREATE TABLE IF NOT EXISTS group_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    lead_type VARCHAR(32) NOT NULL DEFAULT 'PRIMARY_LEAD',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT check_lead_type CHECK (lead_type IN ('PRIMARY_LEAD', 'CO_LEAD')),
    CONSTRAINT unique_group_lead UNIQUE (group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_group_leads_group ON group_leads(group_id);
CREATE INDEX IF NOT EXISTS idx_group_leads_member ON group_leads(member_id);

-- ----------------------------------------------------------------------------
-- 3. Sessions, Scheduling & Multi-Group Composition
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    session_type VARCHAR(64) NOT NULL DEFAULT 'GROUP_MEETING',
    host_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    venue VARCHAR(255),
    meeting_link TEXT,
    qr_active_from TIMESTAMPTZ,
    qr_active_to TIMESTAMPTZ,
    qr_rotation_interval_sec INTEGER NOT NULL DEFAULT 30,
    late_grace_period_mins INTEGER NOT NULL DEFAULT 15,
    require_location BOOLEAN NOT NULL DEFAULT false,
    expected_latitude DOUBLE PRECISION,
    expected_longitude DOUBLE PRECISION,
    allowed_radius_meters INTEGER DEFAULT 100,
    created_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_session_type CHECK (session_type IN (
        'DAILY_DUTY', 'GROUP_MEETING', 'MULTI_GROUP_MEETING', 
        'GENERAL_MEETING', 'WORKSHOP', 'EVENT'
    )),
    CONSTRAINT check_session_status CHECK (status IN (
        'DRAFT', 'SCHEDULED', 'OPEN', 'IN_PROGRESS', 
        'CLOSED', 'RECONCILED', 'FINALIZED', 'CANCELLED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_sessions_host ON sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(scheduled_start);

-- Mapping sessions to participating groups (supports 1 to many groups)
CREATE TABLE IF NOT EXISTS session_groups (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    PRIMARY KEY (session_id, group_id)
);

-- Pre-computed snapshot of eligible unique members for historical audit stability
CREATE TABLE IF NOT EXISTS session_eligible_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    origin_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_session_member_group_origin UNIQUE (session_id, member_id, origin_group_id)
);

CREATE INDEX IF NOT EXISTS idx_eligible_session_member ON session_eligible_members(session_id, member_id);

-- ----------------------------------------------------------------------------
-- 4. Unified Attendance Engine
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_time TIMESTAMPTZ,
    verification_method VARCHAR(64) NOT NULL DEFAULT 'ROTATING_QR',
    challenge_nonce VARCHAR(128),
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_attendance_status CHECK (status IN (
        'NOT_MARKED', 'PRESENT', 'LATE', 'ABSENT', 
        'EXCUSED', 'PENDING_VERIFICATION', 'INVALIDATED'
    )),
    -- CRITICAL BUSINESS INVARIANT: An individual can only be counted once per session
    CONSTRAINT unique_session_member_attendance UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_att_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_member ON attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_att_status ON attendance_records(status);

-- Server-side Challenge Tracking for Rotating QR Token Revocation
CREATE TABLE IF NOT EXISTS qr_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    challenge_nonce VARCHAR(128) UNIQUE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_session_window ON qr_challenges(session_id, valid_from, valid_to);

-- Manual Attendance Corrections and Audit
CREATE TABLE IF NOT EXISTS attendance_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    previous_status VARCHAR(32) NOT NULL,
    requested_status VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    reviewed_by UUID REFERENCES members(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_corr_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- ----------------------------------------------------------------------------
-- 5. Minutes of Meeting (MoM) & Action Items
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meeting_minutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agenda TEXT,
    discussion_notes TEXT,
    decisions TEXT,
    prepared_by UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES members(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_mom_status CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED'))
);

CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mom_id UUID NOT NULL REFERENCES meeting_minutes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'TODO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_action_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT check_action_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON action_items(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_action_items_mom ON action_items(mom_id);

-- ----------------------------------------------------------------------------
-- 6. Daily Duty Attendance
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    duty_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,
    total_duty_hours NUMERIC(4, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_daily_status CHECK (status IN (
        'PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'REMOTE_APPROVED'
    )),
    CONSTRAINT unique_member_daily_attendance UNIQUE (member_id, duty_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_att_member_date ON daily_attendance(member_id, duty_date);

-- ----------------------------------------------------------------------------
-- 7. Audit Logging
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES members(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);


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


-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Migration: 20261022000002_sic_attendance_functions.sql
-- Description: Stored procedures for atomic attendance verification & eligibility snapshotting
-- ============================================================================

-- Procedure: Snapshot session eligibility across all participating groups
CREATE OR REPLACE FUNCTION snapshot_session_eligibility(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER;
    v_unique_count INTEGER;
BEGIN
    -- Populate session_eligible_members from all active memberships of the participating groups
    INSERT INTO session_eligible_members (session_id, member_id, origin_group_id)
    SELECT DISTINCT 
        p_session_id, 
        gm.member_id, 
        gm.group_id
    FROM session_groups sg
    JOIN group_memberships gm ON gm.group_id = sg.group_id
    WHERE sg.session_id = p_session_id
      AND gm.status = 'ACTIVE'
    ON CONFLICT (session_id, member_id, origin_group_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    -- Return count of unique members eligible for this session
    SELECT COUNT(DISTINCT member_id) INTO v_unique_count
    FROM session_eligible_members
    WHERE session_id = p_session_id;

    RETURN v_unique_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure: Atomic check-in transaction with duplicate check and late calculation
CREATE OR REPLACE FUNCTION record_attendance_checkin(
    p_session_id UUID,
    p_member_id UUID,
    p_challenge_nonce VARCHAR(128) DEFAULT NULL,
    p_verification_method VARCHAR(64) DEFAULT 'ROTATING_QR',
    p_ip_address VARCHAR(64) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    record_id UUID,
    attendance_status VARCHAR(32),
    check_in_time TIMESTAMPTZ,
    is_duplicate BOOLEAN
) AS $$
DECLARE
    v_session sessions%ROWTYPE;
    v_is_eligible BOOLEAN;
    v_existing attendance_records%ROWTYPE;
    v_calculated_status VARCHAR(32);
    v_cutoff TIMESTAMPTZ;
    v_new_record attendance_records%ROWTYPE;
BEGIN
    -- 1. Fetch and validate session
    SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    IF v_session.status NOT IN ('OPEN', 'IN_PROGRESS', 'SCHEDULED') THEN
        RAISE EXCEPTION 'Session is not currently open for attendance. Current status: %', v_session.status;
    END IF;

    -- 2. Verify Member Eligibility Snapshot
    SELECT EXISTS (
        SELECT 1 FROM session_eligible_members 
        WHERE session_id = p_session_id AND member_id = p_member_id
    ) INTO v_is_eligible;

    IF NOT v_is_eligible THEN
        -- Check if user is a host or admin
        IF v_session.host_id <> p_member_id THEN
            RAISE EXCEPTION 'Member is not eligible for this session.';
        END IF;
    END IF;

    -- 3. Idempotency Check: Return existing record if already marked
    SELECT * INTO v_existing 
    FROM attendance_records 
    WHERE session_id = p_session_id AND member_id = p_member_id;

    IF FOUND THEN
        RETURN QUERY SELECT 
            v_existing.id, 
            v_existing.status, 
            v_existing.check_in_time, 
            true;
        RETURN;
    END IF;

    -- 4. Calculate Attendance Status (PRESENT vs LATE)
    v_cutoff := v_session.scheduled_start + (v_session.late_grace_period_mins || ' minutes')::INTERVAL;
    IF now() > v_cutoff THEN
        v_calculated_status := 'LATE';
    ELSE
        v_calculated_status := 'PRESENT';
    END IF;

    -- 5. Atomic Insertion
    INSERT INTO attendance_records (
        session_id,
        member_id,
        status,
        check_in_time,
        verification_method,
        challenge_nonce,
        ip_address,
        user_agent
    ) VALUES (
        p_session_id,
        p_member_id,
        v_calculated_status,
        now(),
        p_verification_method,
        p_challenge_nonce,
        p_ip_address,
        p_user_agent
    ) RETURNING * INTO v_new_record;

    -- 6. Log Audit Event
    INSERT INTO audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        new_state,
        ip_address
    ) VALUES (
        p_member_id,
        'ATTENDANCE_CHECK_IN',
        'attendance_records',
        v_new_record.id,
        json_build_object('status', v_calculated_status, 'session_id', p_session_id),
        p_ip_address
    );

    RETURN QUERY SELECT 
        v_new_record.id, 
        v_new_record.status, 
        v_new_record.check_in_time, 
        false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Migration: 20261022000003_sic_project_rbac.sql
-- Description: Project-Based Role Based Access Control (RBAC), Project Scoping & Platform Super Admin
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Projects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_project_status CHECK (status IN ('ACTIVE', 'ARCHIVED', 'SUSPENDED'))
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ----------------------------------------------------------------------------
-- 2. Project Memberships (Project-Scoped Roles: PROJECT_ADMIN, LEAD, MEMBER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    invited_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_project_role CHECK (role IN ('PROJECT_ADMIN', 'LEAD', 'MEMBER')),
    CONSTRAINT check_project_membership_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'LEFT')),
    CONSTRAINT unique_project_member UNIQUE (project_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_project_member ON project_memberships(project_id, member_id);
CREATE INDEX IF NOT EXISTS idx_pm_member_role ON project_memberships(member_id, role);

-- ----------------------------------------------------------------------------
-- 3. Platform-Level Super Admin (Protected Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_super_admin ON platform_super_admins(member_id);

-- ----------------------------------------------------------------------------
-- 4. Link Groups and Sessions to Projects
-- ----------------------------------------------------------------------------
ALTER TABLE groups ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_groups_project_id ON groups(project_id);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- ----------------------------------------------------------------------------
-- 5. Helper Functions for RBAC & Permissions
-- ----------------------------------------------------------------------------

-- Check if current authenticated user is Platform Super Admin
CREATE OR REPLACE FUNCTION is_platform_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_super_admins psa
        JOIN members m ON m.id = psa.member_id
        WHERE m.auth_user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM members
        WHERE auth_user_id = auth.uid()
          AND org_role = 'SUPER_ADMIN'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get member role within a specific project
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id UUID)
RETURNS VARCHAR(32) AS $$
DECLARE
    v_role VARCHAR(32);
BEGIN
    IF is_platform_super_admin() THEN
        RETURN 'SUPER_ADMIN';
    END IF;

    SELECT role INTO v_role
    FROM project_memberships pm
    JOIN members m ON m.id = pm.member_id
    WHERE m.auth_user_id = auth.uid()
      AND pm.project_id = p_project_id
      AND pm.status = 'ACTIVE'
    LIMIT 1;

    RETURN COALESCE(v_role, 'NONE');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if member has at least required role in project
CREATE OR REPLACE FUNCTION has_project_access(p_project_id UUID, p_required_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR(32);
BEGIN
    v_role := get_user_project_role(p_project_id);

    IF v_role = 'SUPER_ADMIN' THEN
        RETURN true;
    END IF;

    IF p_required_role = 'MEMBER' AND v_role IN ('PROJECT_ADMIN', 'LEAD', 'MEMBER') THEN
        RETURN true;
    END IF;

    IF p_required_role = 'LEAD' AND v_role IN ('PROJECT_ADMIN', 'LEAD') THEN
        RETURN true;
    END IF;

    IF p_required_role = 'PROJECT_ADMIN' AND v_role = 'PROJECT_ADMIN' THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. Row Level Security Policies for Projects & Memberships
-- ----------------------------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_super_admins ENABLE ROW LEVEL SECURITY;

-- Projects Policies
CREATE POLICY "Super Admins full manage projects" ON projects
    FOR ALL USING (is_platform_super_admin());

CREATE POLICY "Members view assigned projects" ON projects
    FOR SELECT USING (
        is_platform_super_admin() OR EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN members m ON m.id = pm.member_id
            WHERE pm.project_id = projects.id
              AND m.auth_user_id = auth.uid()
              AND pm.status = 'ACTIVE'
        )
    );

CREATE POLICY "Project Admins update own project" ON projects
    FOR UPDATE USING (
        is_platform_super_admin() OR has_project_access(id, 'PROJECT_ADMIN')
    );

-- Project Memberships Policies
CREATE POLICY "Super Admins full manage project memberships" ON project_memberships
    FOR ALL USING (is_platform_super_admin());

CREATE POLICY "Members view co-members in active projects" ON project_memberships
    FOR SELECT USING (
        is_platform_super_admin() OR has_project_access(project_id, 'MEMBER')
    );

CREATE POLICY "Project Admins manage project memberships" ON project_memberships
    FOR ALL USING (
        is_platform_super_admin() OR has_project_access(project_id, 'PROJECT_ADMIN')
    );

-- Platform Super Admins Table Policies
CREATE POLICY "Super Admins view and manage super admins" ON platform_super_admins
    FOR ALL USING (is_platform_super_admin());


-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Migration: 20261027000000_sic_member_registration_and_academic_structure.sql
-- Description: Institutional Academic Hierarchy (Colleges, Courses, Years, Divisions),
--              Associate Admin Scoping, Member Registration Flow & Audit Logging
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Academic Structure: Colleges
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(32) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(code);
CREATE INDEX IF NOT EXISTS idx_colleges_active ON colleges(is_active);

-- ----------------------------------------------------------------------------
-- 2. Academic Structure: Courses (Scoped to College)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL,
    duration_years INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_college_course UNIQUE (college_id, code)
);

CREATE INDEX IF NOT EXISTS idx_courses_college ON courses(college_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active);

-- ----------------------------------------------------------------------------
-- 3. Academic Structure: Academic Years (Scoped to Course)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    year_name VARCHAR(64) NOT NULL, -- e.g. 'First Year', 'Second Year', 'Third Year'
    year_number INTEGER NOT NULL CHECK (year_number > 0 AND year_number <= 6),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_course_year UNIQUE (course_id, year_number)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_course ON academic_years(course_id);

-- ----------------------------------------------------------------------------
-- 4. Academic Structure: Divisions (Scoped to Academic Year)
-- Note: Division counts are derived directly from actual division records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL, -- e.g. 'Division A', 'Division B'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_year_division UNIQUE (academic_year_id, name)
);

CREATE INDEX IF NOT EXISTS idx_divisions_year ON divisions(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_divisions_course ON divisions(course_id);
CREATE INDEX IF NOT EXISTS idx_divisions_college ON divisions(college_id);

-- ----------------------------------------------------------------------------
-- 5. Extend Members Org Role Constraint to Include ASSOCIATE_ADMIN
-- ----------------------------------------------------------------------------
ALTER TABLE members DROP CONSTRAINT IF EXISTS check_org_role;
ALTER TABLE members ADD CONSTRAINT check_org_role CHECK (org_role IN (
    'SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 
    'OPERATIONS_MANAGER', 'ATTENDANCE_AUDITOR', 
    'ASSOCIATE_ADMIN', 'MEMBER'
));

-- ----------------------------------------------------------------------------
-- 6. Associate Admin Scoping
-- Links Associate Admins to one or more Colleges (NULL college_id = all colleges)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS associate_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES members(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_associate_admin_scope UNIQUE (member_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_assoc_admin_member ON associate_admins(member_id);
CREATE INDEX IF NOT EXISTS idx_assoc_admin_college ON associate_admins(college_id);

-- ----------------------------------------------------------------------------
-- 7. Member Registrations (Lifecycle: PENDING, NEEDS_CORRECTION, APPROVED, REJECTED, SUSPENDED)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    roll_number VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    correction_notes TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES members(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_registration_status CHECK (status IN (
        'PENDING', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'SUSPENDED'
    )),
    -- Roll numbers are unique within a specific college, course, year, and division
    CONSTRAINT unique_institutional_roll UNIQUE (college_id, course_id, academic_year_id, division_id, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_reg_auth_user ON member_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_reg_email ON member_registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_college ON member_registrations(college_id);
CREATE INDEX IF NOT EXISTS idx_reg_status ON member_registrations(status);

-- ----------------------------------------------------------------------------
-- 8. Multi-Group Registration Requests (Member-Of and Leader-Of)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registration_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES member_registrations(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    request_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES members(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT check_req_type CHECK (request_type IN ('MEMBER', 'LEADER')),
    CONSTRAINT check_req_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT unique_reg_group_request UNIQUE (registration_id, group_id, request_type)
);

CREATE INDEX IF NOT EXISTS idx_reg_groups_reg ON registration_groups(registration_id);
CREATE INDEX IF NOT EXISTS idx_reg_groups_group ON registration_groups(group_id);

-- ----------------------------------------------------------------------------
-- 9. Registration Audit Trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registration_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES member_registrations(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    performed_by UUID REFERENCES members(id) ON DELETE SET NULL,
    notes TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_audit_reg ON registration_audit_logs(registration_id);

-- ----------------------------------------------------------------------------
-- 10. Link Members Table to Institutional Coordinates
-- ----------------------------------------------------------------------------
ALTER TABLE members ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS roll_number VARCHAR(64);
ALTER TABLE members ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES member_registrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_college ON members(college_id);

-- ----------------------------------------------------------------------------
-- 11. Seed Institutional Data (CIMR & CRKIMR)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_cimr_id UUID   := 'e1111111-1111-1111-1111-111111111111';
    v_crkimr_id UUID := 'e3333333-3333-3333-3333-333333333333';
    
    v_course_pgdm UUID := 'f1111111-1111-1111-1111-111111111111';
    v_course_mms UUID  := 'f5555555-5555-5555-5555-555555555555';

    v_year_pgdm_1 UUID := 'c1111111-0001-1111-1111-111111111111';
    v_year_pgdm_2 UUID := 'c1111111-0002-1111-1111-111111111111';

    v_year_mms_1 UUID  := 'c5555555-0001-1111-1111-111111111111';
    v_year_mms_2 UUID  := 'c5555555-0002-1111-1111-111111111111';
BEGIN
    -- Remove Chetana's Hazarimal Somani College of Commerce & Economics (CHSC) if present
    DELETE FROM colleges WHERE id = 'e2222222-2222-2222-2222-222222222222' OR code = 'CHSC' OR name ILIKE '%Hazarimal Somani%';

    -- 1. Colleges
    INSERT INTO colleges (id, name, code, description)
    VALUES 
        (v_cimr_id, 'Chetana''s Institute of Management & Research', 'CIMR', 'Postgraduate Business & Innovation Management'),
        (v_crkimr_id, 'Chetana''s R.K. Institute of Management and Research', 'CRKIMR', 'Postgraduate Management Studies & Research')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

    -- 2. Courses
    INSERT INTO courses (id, college_id, name, code, duration_years)
    VALUES 
        (v_course_pgdm, v_cimr_id, 'Post Graduate Diploma in Management (PGDM)', 'PGDM', 2),
        (v_course_mms, v_crkimr_id, 'Master of Management Studies (MMS)', 'MMS', 2)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

    -- 3. Academic Years
    INSERT INTO academic_years (id, course_id, year_name, year_number)
    VALUES 
        (v_year_pgdm_1, v_course_pgdm, 'First Year', 1),
        (v_year_pgdm_2, v_course_pgdm, 'Second Year', 2),
        (v_year_mms_1, v_course_mms, 'Year 1', 1),
        (v_year_mms_2, v_course_mms, 'Year 2', 2)
    ON CONFLICT (id) DO UPDATE SET year_name = EXCLUDED.year_name, year_number = EXCLUDED.year_number;

    -- 4. Divisions
    -- PGDM Year 1 (Chetana's Institute of Management & Research)
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division A'),
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division B'),
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division C'),
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division D'),
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division M')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- PGDM Year 2 (Chetana's Institute of Management & Research)
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division A'),
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division B'),
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division C'),
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division D'),
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division M')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- MMS Year 1 & Year 2 (Chetana's R.K. Institute of Management and Research)
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_mms_1, v_course_mms, v_crkimr_id, 'Division A'),
        (v_year_mms_1, v_course_mms, v_crkimr_id, 'Division B'),
        (v_year_mms_2, v_course_mms, v_crkimr_id, 'Division A'),
        (v_year_mms_2, v_course_mms, v_crkimr_id, 'Division B')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- 5. Seed Super Admin (chetana.cielhub@gmail.com)
    INSERT INTO members (
        id, member_code, full_name, email, department, designation, org_role, status
    ) VALUES (
        'a0000000-0000-0000-0000-000000000000',
        'SIC-ADM-000',
        'Chetana CIEL Super Admin',
        'chetana.cielhub@gmail.com',
        'Executive Board & CIEL Operations',
        'Platform Super Administrator',
        'SUPER_ADMIN',
        'ACTIVE'
    )
    ON CONFLICT (email) DO UPDATE SET
        org_role = 'SUPER_ADMIN',
        status = 'ACTIVE';
END $$;

-- ----------------------------------------------------------------------------
-- 12. Row Level Security Policies
-- ----------------------------------------------------------------------------
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_audit_logs ENABLE ROW LEVEL SECURITY;

-- Colleges: public/authenticated read; super admin / associate admin write
CREATE POLICY "Public Read Active Colleges" ON colleges 
    FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin Manage Colleges" ON colleges 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN')
        )
    );

-- Courses: public/authenticated read; admin write
CREATE POLICY "Public Read Courses" ON courses 
    FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin Manage Courses" ON courses 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

-- Academic Years: public/authenticated read; admin write
CREATE POLICY "Public Read Academic Years" ON academic_years 
    FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin Manage Academic Years" ON academic_years 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

-- Divisions: public/authenticated read; admin write
CREATE POLICY "Public Read Divisions" ON divisions 
    FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin Manage Divisions" ON divisions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

-- Associate Admins: visible to admins
CREATE POLICY "Read Associate Admins" ON associate_admins 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super Admin Manage Associate Admins" ON associate_admins 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN')
        )
    );

-- Member Registrations RLS
CREATE POLICY "Users Read Own Registration" ON member_registrations 
    FOR SELECT USING (
        auth_user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

CREATE POLICY "Users Insert Own Registration" ON member_registrations 
    FOR INSERT WITH CHECK (
        auth_user_id = auth.uid()
    );

CREATE POLICY "Users Update Own Pending Registration" ON member_registrations 
    FOR UPDATE USING (
        (auth_user_id = auth.uid() AND status IN ('PENDING', 'NEEDS_CORRECTION')) OR
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

-- Registration Groups RLS
CREATE POLICY "Users Read Own Reg Groups" ON registration_groups 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM member_registrations mr 
            WHERE mr.id = registration_groups.registration_id 
              AND (mr.auth_user_id = auth.uid() OR EXISTS (
                  SELECT 1 FROM members m 
                  WHERE m.auth_user_id = auth.uid() 
                    AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
              ))
        )
    );

CREATE POLICY "Users Insert Own Reg Groups" ON registration_groups 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM member_registrations mr 
            WHERE mr.id = registration_groups.registration_id 
              AND mr.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admin Update Reg Groups" ON registration_groups 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

-- Registration Audit Logs RLS
CREATE POLICY "Admins Read Audit Logs" ON registration_audit_logs 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.auth_user_id = auth.uid() 
              AND m.org_role IN ('SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN')
        )
    );

CREATE POLICY "System Insert Audit Logs" ON registration_audit_logs 
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. STORAGE BUCKET FOR MEMBER AVATARS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'member-avatars',
    'member-avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public View Member Avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'member-avatars');

CREATE POLICY "Authenticated Upload Member Avatars" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'member-avatars');

CREATE POLICY "Authenticated Update Member Avatars" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'member-avatars');



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

