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
