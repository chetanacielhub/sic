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
