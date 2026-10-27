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
-- 11. Seed Institutional Data (CIMR & CHSC)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_cimr_id UUID := 'e1111111-1111-1111-1111-111111111111';
    v_chsc_id UUID := 'e2222222-2222-2222-2222-222222222222';
    
    v_course_pgdm UUID := 'f1111111-1111-1111-1111-111111111111';
    v_course_bcom UUID := 'f2222222-2222-2222-2222-222222222222';
    v_course_bms UUID  := 'f3333333-3333-3333-3333-333333333333';
    v_course_bscit UUID:= 'f4444444-4444-4444-4444-444444444444';

    v_year_pgdm_1 UUID := 'c1111111-0001-1111-1111-111111111111';
    v_year_pgdm_2 UUID := 'c1111111-0002-1111-1111-111111111111';

    v_year_bcom_1 UUID := 'c2222222-0001-1111-1111-111111111111';
    v_year_bcom_2 UUID := 'c2222222-0002-1111-1111-111111111111';
    v_year_bcom_3 UUID := 'c2222222-0003-1111-1111-111111111111';

    v_year_bms_1 UUID  := 'c3333333-0001-1111-1111-111111111111';
    v_year_bms_2 UUID  := 'c3333333-0002-1111-1111-111111111111';
    v_year_bms_3 UUID  := 'c3333333-0003-1111-1111-111111111111';

    v_year_bscit_1 UUID:= 'c4444444-0001-1111-1111-111111111111';
    v_year_bscit_2 UUID:= 'c4444444-0002-1111-1111-111111111111';
    v_year_bscit_3 UUID:= 'c4444444-0003-1111-1111-111111111111';
BEGIN
    -- 1. Colleges
    INSERT INTO colleges (id, name, code, description)
    VALUES 
        (v_cimr_id, 'Chetana''s Institute of Management & Research', 'CIMR', 'Postgraduate Business & Innovation Management'),
        (v_chsc_id, 'Chetana''s Hazarimal Somani College of Commerce & Economics', 'CHSC', 'Undergraduate Commerce, Arts & IT')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

    -- 2. Courses
    INSERT INTO courses (id, college_id, name, code, duration_years)
    VALUES 
        (v_course_pgdm, v_cimr_id, 'Post Graduate Diploma in Management (PGDM)', 'PGDM', 2),
        (v_course_bcom, v_chsc_id, 'Bachelor of Commerce (B.Com)', 'BCOM', 3),
        (v_course_bms, v_chsc_id, 'Bachelor of Management Studies (BMS)', 'BMS', 3),
        (v_course_bscit, v_chsc_id, 'B.Sc Information Technology (B.Sc IT)', 'BSCIT', 3)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

    -- 3. Academic Years
    INSERT INTO academic_years (id, course_id, year_name, year_number)
    VALUES 
        (v_year_pgdm_1, v_course_pgdm, 'First Year', 1),
        (v_year_pgdm_2, v_course_pgdm, 'Second Year', 2),
        (v_year_bcom_1, v_course_bcom, 'First Year', 1),
        (v_year_bcom_2, v_course_bcom, 'Second Year', 2),
        (v_year_bcom_3, v_course_bcom, 'Third Year', 3),
        (v_year_bms_1, v_course_bms, 'First Year', 1),
        (v_year_bms_2, v_course_bms, 'Second Year', 2),
        (v_year_bms_3, v_course_bms, 'Third Year', 3),
        (v_year_bscit_1, v_course_bscit, 'First Year', 1),
        (v_year_bscit_2, v_course_bscit, 'Second Year', 2),
        (v_year_bscit_3, v_course_bscit, 'Third Year', 3)
    ON CONFLICT (id) DO UPDATE SET year_name = EXCLUDED.year_name, year_number = EXCLUDED.year_number;

    -- 4. Divisions
    -- PGDM Year 1
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division A'),
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division B'),
        (v_year_pgdm_1, v_course_pgdm, v_cimr_id, 'Division C')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- PGDM Year 2
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division A'),
        (v_year_pgdm_2, v_course_pgdm, v_cimr_id, 'Division B')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- B.Com Year 1
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_bcom_1, v_course_bcom, v_chsc_id, 'Division A'),
        (v_year_bcom_1, v_course_bcom, v_chsc_id, 'Division B'),
        (v_year_bcom_1, v_course_bcom, v_chsc_id, 'Division C'),
        (v_year_bcom_1, v_course_bcom, v_chsc_id, 'Division D')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- B.Sc IT Year 1, 2, 3
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_bscit_1, v_course_bscit, v_chsc_id, 'Division A'),
        (v_year_bscit_2, v_course_bscit, v_chsc_id, 'Division A'),
        (v_year_bscit_3, v_course_bscit, v_chsc_id, 'Division A')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- BMS Year 1, 2, 3
    INSERT INTO divisions (academic_year_id, course_id, college_id, name)
    VALUES 
        (v_year_bms_1, v_course_bms, v_chsc_id, 'Division A'),
        (v_year_bms_1, v_course_bms, v_chsc_id, 'Division B'),
        (v_year_bms_2, v_course_bms, v_chsc_id, 'Division A'),
        (v_year_bms_3, v_course_bms, v_chsc_id, 'Division A')
    ON CONFLICT (academic_year_id, name) DO NOTHING;

    -- 5. Seed Demo Associate Admin Account
    -- Grant Aarav Patel (a1111111-1111-1111-1111-111111111111) Associate Admin role for CIMR & CHSC
    UPDATE members 
    SET org_role = 'ASSOCIATE_ADMIN'
    WHERE id = 'a1111111-1111-1111-1111-111111111111';

    INSERT INTO associate_admins (member_id, college_id)
    VALUES 
        ('a1111111-1111-1111-1111-111111111111', v_cimr_id),
        ('a1111111-1111-1111-1111-111111111111', v_chsc_id)
    ON CONFLICT (member_id, college_id) DO NOTHING;
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
