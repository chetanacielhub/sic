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
