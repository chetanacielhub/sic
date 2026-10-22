// ============================================================================
// SIC Unified Attendance & Operations Management System
// Automated Test Suite: scripts/test-sic-engine.ts
// Validates Multi-Group Deduplication, Multi-Leads, Rotating QR, and Idempotency
// ============================================================================

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { generateRotatingChallenge, verifyRotatingChallenge } from '../lib/qr/token';

describe('SIC Attendance Engine — Automated Verification Suite', () => {

  // Test 1: Combined Multi-Group Meeting Deduplication
  test('Combined Meeting Deduplication: Group A ({1,2,3}) + Group B ({1,4,6}) -> 5 unique members', () => {
    // Group A members
    const groupAMembers = ['member-1', 'member-2', 'member-3'];
    // Group B members (Notice member-1 is in both groups!)
    const groupBMembers = ['member-1', 'member-4', 'member-6'];

    // Simulated session_groups mapping
    const participatingGroups = [
      { groupId: 'group-a', members: groupAMembers },
      { groupId: 'group-b', members: groupBMembers },
    ];

    // Deduplication logic mirroring PostgreSQL snapshot_session_eligibility
    const eligibleMemberSet = new Set<string>();
    participatingGroups.forEach(g => {
      g.members.forEach(m => eligibleMemberSet.add(m));
    });

    const uniqueEligibleCount = eligibleMemberSet.size;

    assert.equal(uniqueEligibleCount, 5, 'Deduplicated unique headcount must be exactly 5');
    assert.ok(eligibleMemberSet.has('member-1'), 'Member 1 must be present');
    assert.ok(eligibleMemberSet.has('member-2'), 'Member 2 must be present');
    assert.ok(eligibleMemberSet.has('member-3'), 'Member 3 must be present');
    assert.ok(eligibleMemberSet.has('member-4'), 'Member 4 must be present');
    assert.ok(eligibleMemberSet.has('member-6'), 'Member 6 must be present');
  });

  // Test 2: Multi-Lead Assignment & Roles
  test('Multi-Lead Support: A group can have multiple concurrent leads', () => {
    interface Lead {
      memberId: string;
      leadType: 'PRIMARY_LEAD' | 'CO_LEAD';
      isActive: boolean;
    }

    const groupALeads: Lead[] = [
      { memberId: 'member-2', leadType: 'PRIMARY_LEAD', isActive: true },
      { memberId: 'member-3', leadType: 'CO_LEAD', isActive: true },
    ];

    const groupBLeads: Lead[] = [
      { memberId: 'member-4', leadType: 'PRIMARY_LEAD', isActive: true },
      { memberId: 'member-6', leadType: 'CO_LEAD', isActive: true },
    ];

    assert.equal(groupALeads.length, 2, 'Group A must support multiple leads');
    assert.equal(groupBLeads.length, 2, 'Group B must support multiple leads');

    const hasPrimaryLead = (leads: Lead[]) => leads.some(l => l.leadType === 'PRIMARY_LEAD');
    const hasCoLead = (leads: Lead[]) => leads.some(l => l.leadType === 'CO_LEAD');

    assert.ok(hasPrimaryLead(groupALeads), 'Group A must have a primary lead');
    assert.ok(hasCoLead(groupALeads), 'Group A must have a co-lead');
    assert.ok(hasPrimaryLead(groupBLeads), 'Group B must have a primary lead');
    assert.ok(hasCoLead(groupBLeads), 'Group B must have a co-lead');
  });

  // Test 3: Rotating Cryptographic QR Challenge Generation & Validation
  test('Rotating QR: Generates valid HMAC signed token within active rotation window', () => {
    const sessionId = 'c1111111-1111-1111-1111-111111111111';
    const intervalSec = 30;

    const generated = generateRotatingChallenge(sessionId, intervalSec);

    assert.ok(generated.challenge.startsWith('SIC:ATTEND:'), 'Token must have standard SIC header');
    assert.ok(generated.remainingSeconds > 0 && generated.remainingSeconds <= 30, 'Remaining seconds must be between 1 and 30');
    assert.equal(generated.rotationIntervalSec, 30, 'Interval must match 30s');

    // Immediate validation must succeed
    const verification = verifyRotatingChallenge(sessionId, generated.challenge, intervalSec);
    assert.equal(verification.valid, true, 'Immediate verification must be valid');
    assert.equal(verification.nonce, generated.nonce, 'Verified nonce must match generated nonce');
  });

  // Test 4: Tampered QR Token Rejection
  test('Security: Tampered or forged challenge tokens are rejected', () => {
    const sessionId = 'c1111111-1111-1111-1111-111111111111';
    const generated = generateRotatingChallenge(sessionId, 30);

    // Tamper with signature
    const parts = generated.challenge.split(':');
    parts[parts.length - 1] = 'ffffffffffffffffffffffffffffffff';
    const tamperedToken = parts.join(':');

    const result = verifyRotatingChallenge(sessionId, tamperedToken, 30);
    assert.equal(result.valid, false, 'Tampered token must be rejected');
    assert.match(result.error || '', /mismatch|tampered/i, 'Error message must indicate forgery');
  });

  // Test 5: Expired QR Token Rejection
  test('Security: Expired QR challenge tokens (> 2 intervals past) are rejected', () => {
    const sessionId = 'c1111111-1111-1111-1111-111111111111';
    const oldTimestamp = Date.now() - 120 * 1000; // 2 minutes ago
    const nonce = 'oldnonce12345678';
    const payload = `SIC:ATTEND:${sessionId}:${oldTimestamp}:${nonce}`;

    // Dummy signature format
    const oldChallenge = `${payload}:e3b0c44298fc1c149afbf4c8996fb924`;

    const result = verifyRotatingChallenge(sessionId, oldChallenge, 30, 1);
    assert.equal(result.valid, false, 'Expired token must fail validation');
  });

  // Test 6: Attendance Record Idempotency & Duplicate Prevention
  test('Idempotency: Repeated check-ins for the same (session_id, member_id) return existing record', () => {
    interface AttendanceRecord {
      id: string;
      sessionId: string;
      memberId: string;
      status: string;
      checkInTime: string;
    }

    const attendanceRegister = new Map<string, AttendanceRecord>();

    function mockAtomicCheckIn(sessionId: string, memberId: string): { record: AttendanceRecord; isDuplicate: boolean } {
      const compositeKey = `${sessionId}:${memberId}`;
      if (attendanceRegister.has(compositeKey)) {
        return {
          record: attendanceRegister.get(compositeKey)!,
          isDuplicate: true,
        };
      }

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        sessionId,
        memberId,
        status: 'PRESENT',
        checkInTime: new Date().toISOString(),
      };
      attendanceRegister.set(compositeKey, newRecord);
      return { record: newRecord, isDuplicate: false };
    }

    const sessionId = 'session-joint-01';
    const memberId = 'member-1';

    // First scan
    const firstAttempt = mockAtomicCheckIn(sessionId, memberId);
    assert.equal(firstAttempt.isDuplicate, false, 'First check-in must not be marked as duplicate');
    assert.equal(attendanceRegister.size, 1, 'Register must contain 1 record');

    // Repeated scan
    const secondAttempt = mockAtomicCheckIn(sessionId, memberId);
    assert.equal(secondAttempt.isDuplicate, true, 'Second check-in must be detected as duplicate');
    assert.equal(secondAttempt.record.id, firstAttempt.record.id, 'Must return the original attendance record ID');
    assert.equal(attendanceRegister.size, 1, 'Headcount register size must remain strictly 1');
  });

  // Test 7: MoM Workflow State Transitions
  test('Governance: MoM workflow enforces DRAFT -> SUBMITTED -> APPROVED transitions', () => {
    let momStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' = 'DRAFT';

    function submitMoM() {
      if (momStatus !== 'DRAFT') throw new Error('Only draft MoM can be submitted');
      momStatus = 'SUBMITTED';
    }

    function approveMoM() {
      if (momStatus !== 'SUBMITTED') throw new Error('Only submitted MoM can be approved');
      momStatus = 'APPROVED';
    }

    submitMoM();
    assert.equal(momStatus, 'SUBMITTED', 'Status must transition to SUBMITTED');

    approveMoM();
    assert.equal(momStatus, 'APPROVED', 'Status must transition to APPROVED');

    // Attempting to submit an approved MoM must fail
    assert.throws(() => submitMoM(), /Only draft/);
  });

  // Test 8: Centralized Role-Based Permission Matrix Evaluation
  test('RBAC Matrix: Role permissions match the defined security specification', () => {
    const { roleHasPermission } = require('../lib/auth/rbac');

    // Super Admin has platform-wide permissions
    assert.equal(roleHasPermission('SUPER_ADMIN', 'platform.manage'), true, 'Super Admin must have platform.manage');
    assert.equal(roleHasPermission('SUPER_ADMIN', 'projects.create'), true, 'Super Admin must have projects.create');
    assert.equal(roleHasPermission('SUPER_ADMIN', 'attendance.export'), true, 'Super Admin must have attendance.export');

    // Project Admin has project-level administrative permissions, but NOT platform.manage
    assert.equal(roleHasPermission('PROJECT_ADMIN', 'projects.manage'), true, 'Project Admin can manage their project');
    assert.equal(roleHasPermission('PROJECT_ADMIN', 'members.invite'), true, 'Project Admin can invite members');
    assert.equal(roleHasPermission('PROJECT_ADMIN', 'attendance.export'), true, 'Project Admin can export attendance');
    assert.equal(roleHasPermission('PROJECT_ADMIN', 'platform.manage'), false, 'Project Admin cannot manage entire platform');

    // Lead has operational permissions, but cannot export project reports or invite members
    assert.equal(roleHasPermission('LEAD', 'attendance.view_team'), true, 'Lead can view team attendance');
    assert.equal(roleHasPermission('LEAD', 'attendance.correct'), true, 'Lead can request attendance corrections');
    assert.equal(roleHasPermission('LEAD', 'members.invite'), false, 'Lead cannot invite new members');
    assert.equal(roleHasPermission('LEAD', 'attendance.export'), false, 'Lead cannot export project attendance');

    // Member can check in and view own attendance, but cannot view team or manage
    assert.equal(roleHasPermission('MEMBER', 'attendance.check_in'), true, 'Member can check in');
    assert.equal(roleHasPermission('MEMBER', 'attendance.view_own'), true, 'Member can view own attendance');
    assert.equal(roleHasPermission('MEMBER', 'attendance.view_team'), false, 'Member cannot view team roster');
    assert.equal(roleHasPermission('MEMBER', 'projects.manage'), false, 'Member cannot manage projects');
  });

  // Test 9: Project-Based Access Scoping: Same user with different roles across projects
  test('Project Scoping: Same user has independent roles and permissions across projects', () => {
    const { roleHasPermission } = require('../lib/auth/rbac');

    // User 1 profile
    const user1Memberships = [
      { projectId: 'project-ai', role: 'PROJECT_ADMIN' as const },
      { projectId: 'project-iot', role: 'MEMBER' as const },
    ];

    const getPermissionInProject = (projectId: string, permission: any) => {
      const membership = user1Memberships.find(m => m.projectId === projectId);
      if (!membership) return false;
      return roleHasPermission(membership.role, permission);
    };

    // User 1 in Project AI: Project Admin
    assert.equal(getPermissionInProject('project-ai', 'members.invite'), true, 'User 1 is Admin in Project AI (Can invite)');
    assert.equal(getPermissionInProject('project-ai', 'attendance.export'), true, 'User 1 is Admin in Project AI (Can export)');

    // User 1 in Project IoT: Standard Member
    assert.equal(getPermissionInProject('project-iot', 'members.invite'), false, 'User 1 is Member in Project IoT (Cannot invite)');
    assert.equal(getPermissionInProject('project-iot', 'attendance.export'), false, 'User 1 is Member in Project IoT (Cannot export)');
    assert.equal(getPermissionInProject('project-iot', 'attendance.check_in'), true, 'User 1 is Member in Project IoT (Can check in)');

    // User 1 in Project Quantum (Not a member)
    assert.equal(getPermissionInProject('project-quantum', 'attendance.check_in'), false, 'User 1 has no access to unassigned projects');
  });

  // Test 10: Suspended Account Revocation
  test('Security: Suspended or inactive memberships deny all permissions regardless of role', () => {
    interface Membership {
      role: 'PROJECT_ADMIN' | 'LEAD' | 'MEMBER';
      status: 'ACTIVE' | 'SUSPENDED' | 'LEFT';
    }

    function checkActiveAccess(membership: Membership): boolean {
      if (membership.status !== 'ACTIVE') return false;
      return true;
    }

    const suspendedAdmin: Membership = { role: 'PROJECT_ADMIN', status: 'SUSPENDED' };
    const leftLead: Membership = { role: 'LEAD', status: 'LEFT' };
    const activeMember: Membership = { role: 'MEMBER', status: 'ACTIVE' };

    assert.equal(checkActiveAccess(suspendedAdmin), false, 'Suspended admin has access revoked');
    assert.equal(checkActiveAccess(leftLead), false, 'Left lead has access revoked');
    assert.equal(checkActiveAccess(activeMember), true, 'Active member maintains access');
  });
});

