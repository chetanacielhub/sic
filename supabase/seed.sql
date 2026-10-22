-- ============================================================================
-- SIC Unified Attendance & Operations Management System
-- Seed Script: supabase/seed.sql
-- Scenario: Definition of Done multi-group attendance test data
-- ============================================================================

DO $$
DECLARE
    v_admin_id UUID := '11111111-1111-1111-1111-111111111111';
    v_director_id UUID := '22222222-2222-2222-2222-222222222222';
    
    v_member_1 UUID := 'a1111111-1111-1111-1111-111111111111';
    v_member_2 UUID := 'a2222222-2222-2222-2222-222222222222';
    v_member_3 UUID := 'a3333333-3333-3333-3333-333333333333';
    v_member_4 UUID := 'a4444444-4444-4444-4444-444444444444';
    v_member_6 UUID := 'a6666666-6666-6666-6666-666666666666';

    v_group_a UUID := 'b1111111-1111-1111-1111-111111111111';
    v_group_b UUID := 'b2222222-2222-2222-2222-222222222222';

    v_session_id UUID := 'c1111111-1111-1111-1111-111111111111';
    v_eligible_count INTEGER;
BEGIN
    -- 1. Seed Administrators & Director
    INSERT INTO members (id, member_code, full_name, email, department, designation, org_role)
    VALUES 
        (v_admin_id, 'SIC-ADMIN-01', 'System Administrator', 'admin@sic.internal', 'Operations', 'Lead Admin', 'SIC_ADMIN'),
        (v_director_id, 'SIC-DIR-01', 'Dr. Rajesh Sharma', 'director@sic.internal', 'Executive', 'SIC Director', 'SIC_DIRECTOR')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Seed Test Members (1, 2, 3, 4, 6)
    INSERT INTO members (id, member_code, full_name, email, department, designation, org_role)
    VALUES 
        (v_member_1, 'SIC-MEM-01', 'Aarav Patel', 'aarav.patel@sic.internal', 'Robotics & AI', 'Research Member', 'MEMBER'),
        (v_member_2, 'SIC-MEM-02', 'Bhavna Rao', 'bhavna.rao@sic.internal', 'Robotics & AI', 'Project Lead', 'MEMBER'),
        (v_member_3, 'SIC-MEM-03', 'Chirag Joshi', 'chirag.joshi@sic.internal', 'Robotics & AI', 'Technical Lead', 'MEMBER'),
        (v_member_4, 'SIC-MEM-04', 'Divya Nair', 'divya.nair@sic.internal', 'IoT & Embedded', 'Hardware Lead', 'MEMBER'),
        (v_member_6, 'SIC-MEM-06', 'Farhan Khan', 'farhan.khan@sic.internal', 'IoT & Embedded', 'Systems Co-Lead', 'MEMBER')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Seed Groups (Group A & Group B)
    INSERT INTO groups (id, name, code, description, group_type, created_by)
    VALUES 
        (v_group_a, 'Autonomous Systems Wing (Group A)', 'GROUP-A', 'Robotics, Computer Vision & Navigation', 'PERMANENT', v_admin_id),
        (v_group_b, 'Embedded IoT Wing (Group B)', 'GROUP-B', 'Sensors, Edge Firmware & Telemetry', 'PERMANENT', v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Group A Memberships: Members 1, 2, 3
    INSERT INTO group_memberships (group_id, member_id, status, added_by)
    VALUES 
        (v_group_a, v_member_1, 'ACTIVE', v_admin_id),
        (v_group_a, v_member_2, 'ACTIVE', v_admin_id),
        (v_group_a, v_member_3, 'ACTIVE', v_admin_id)
    ON CONFLICT DO NOTHING;

    -- 5. Group A Leads: Members 2 and 3
    INSERT INTO group_leads (group_id, member_id, lead_type, assigned_by)
    VALUES 
        (v_group_a, v_member_2, 'PRIMARY_LEAD', v_admin_id),
        (v_group_a, v_member_3, 'CO_LEAD', v_admin_id)
    ON CONFLICT (group_id, member_id) DO NOTHING;

    -- 6. Group B Memberships: Members 1, 4, 6 (Notice Member 1 is in BOTH groups!)
    INSERT INTO group_memberships (group_id, member_id, status, added_by)
    VALUES 
        (v_group_b, v_member_1, 'ACTIVE', v_admin_id),
        (v_group_b, v_member_4, 'ACTIVE', v_admin_id),
        (v_group_b, v_member_6, 'ACTIVE', v_admin_id)
    ON CONFLICT DO NOTHING;

    -- 7. Group B Leads: Members 4 and 6
    INSERT INTO group_leads (group_id, member_id, lead_type, assigned_by)
    VALUES 
        (v_group_b, v_member_4, 'PRIMARY_LEAD', v_admin_id),
        (v_group_b, v_member_6, 'CO_LEAD', v_admin_id)
    ON CONFLICT (group_id, member_id) DO NOTHING;

    -- 8. Seed Combined Session: Group A + Group B Joint Review
    INSERT INTO sessions (
        id, 
        title, 
        description, 
        session_type, 
        host_id, 
        status, 
        scheduled_start, 
        scheduled_end, 
        venue, 
        qr_rotation_interval_sec,
        late_grace_period_mins,
        created_by
    )
    VALUES (
        v_session_id,
        'Joint Hardware-Software Review (Group A + Group B)',
        'Bi-weekly integration session between Autonomous Systems and Embedded IoT teams.',
        'MULTI_GROUP_MEETING',
        v_member_2, -- Bhavna Rao (Lead Group A)
        'OPEN',
        now() - INTERVAL '10 minutes',
        now() + INTERVAL '50 minutes',
        'SIC Innovation Lab 3',
        30,
        15,
        v_member_2
    )
    ON CONFLICT (id) DO NOTHING;

    -- Map participating groups to session
    INSERT INTO session_groups (session_id, group_id)
    VALUES 
        (v_session_id, v_group_a),
        (v_session_id, v_group_b)
    ON CONFLICT DO NOTHING;

    -- 9. Execute snapshot_session_eligibility:
    -- Must deduplicate: {1, 2, 3} ∪ {1, 4, 6} = {1, 2, 3, 4, 6} -> Exactly 5 unique members!
    PERFORM snapshot_session_eligibility(v_session_id);

    RAISE NOTICE 'Seed scenario initialized successfully for session %', v_session_id;
END $$;
