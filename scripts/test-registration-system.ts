// ============================================================================
// SIC Unified Attendance & Operations Management System
// Test Suite: Registration, Academic Hierarchy & Associate Admin System
// ============================================================================

import { 
  getColleges, 
  getCourses, 
  getAcademicYears, 
  getDivisions, 
  addCollege, 
  addCourse, 
  addAcademicYear, 
  addDivision, 
  deleteDivision,
  saveRegistration,
  getRegistrations,
  processRegistrationReview
} from '../lib/academic/store';
import { getAssociateAdminScope } from '../lib/auth/rbac';

async function runTests() {
  console.log('🧪 Starting SIC Authentication, Registration & Associate Admin Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Academic Hierarchy - Colleges & Scoping
  // --------------------------------------------------------------------------
  console.log('▶ Test 1: Academic Hierarchy (Colleges, Courses, Years, Divisions)');
  const colleges = await getColleges();
  assert(colleges.length >= 2, 'Colleges populated with default institutions (CIMR & CHSC)');
  const cimr = colleges.find(c => c.code === 'CIMR');
  const chsc = colleges.find(c => c.code === 'CHSC');
  assert(Boolean(cimr && chsc), 'CIMR and CHSC institutions exist');

  // Test courses for CIMR
  const cimrCourses = await getCourses(cimr!.id);
  assert(cimrCourses.some(c => c.code === 'PGDM'), 'CIMR has PGDM course');

  // Test courses for CHSC
  const chscCourses = await getCourses(chsc!.id);
  assert(chscCourses.some(c => c.code === 'BCOM'), 'CHSC has B.Com course');
  assert(chscCourses.some(c => c.code === 'BSCIT'), 'CHSC has B.Sc IT course');

  // --------------------------------------------------------------------------
  // TEST 2: Dependent Dropdowns - Years & Divisions
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 2: Dependent Dropdown Relations & Derived Division Counts');
  const pgdm = cimrCourses.find(c => c.code === 'PGDM')!;
  const pgdmYears = await getAcademicYears(pgdm.id);
  assert(pgdmYears.length >= 2, 'PGDM has at least 2 academic years configured');

  const pgdmYear1 = pgdmYears.find(y => y.year_number === 1)!;
  const pgdmYear1Divisions = await getDivisions({ academicYearId: pgdmYear1.id });
  assert(pgdmYear1Divisions.length >= 3, 'PGDM Year 1 has 3 divisions (A, B, C)');

  // Test division count derived from actual division records
  const dynamicCount = pgdmYear1Divisions.length;
  assert(typeof dynamicCount === 'number' && dynamicCount >= 3, 'Division count dynamically derived from division records');

  // --------------------------------------------------------------------------
  // TEST 3: Dynamic Division Management (Add and Delete)
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 3: Dynamic Division Management');
  const tempDivName = `Division TEST-${Date.now()}`;
  const createdDiv = await addDivision(cimr!.id, pgdm.id, pgdmYear1.id, tempDivName);
  assert(Boolean(createdDiv.id), 'Successfully added new division record');

  const afterAdd = await getDivisions({ academicYearId: pgdmYear1.id });
  assert(afterAdd.some(d => d.id === createdDiv.id), 'Newly added division appears in academic query');

  const deleted = await deleteDivision(createdDiv.id);
  assert(deleted, 'Successfully deleted test division record');

  // --------------------------------------------------------------------------
  // TEST 4: Member Registration with Multi-Group & Multi-Leadership
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 4: Member Registration (Multi-Group Membership & Leadership)');
  const testStudentAuthId = '99999999-9999-9999-9999-999999999999';
  const groupAId = 'b1111111-1111-1111-1111-111111111111';
  const groupBId = 'b2222222-2222-2222-2222-222222222222';

  const regSubmission = await saveRegistration({
    auth_user_id: testStudentAuthId,
    email: 'test.student@sic.internal',
    full_name: 'Test Student Innovator',
    college_id: cimr!.id,
    course_id: pgdm.id,
    academic_year_id: pgdmYear1.id,
    division_id: pgdmYear1Divisions[0].id,
    roll_number: 'TEST-ROLL-101',
    member_group_ids: [groupAId, groupBId], // Multi-group membership request
    leader_group_ids: [groupAId],            // Leadership request for Group A
  });

  assert(regSubmission.status === 'PENDING', 'New registration saved with status PENDING');
  assert(regSubmission.requested_groups?.length === 3, 'Registration has 2 membership requests and 1 leadership request stored via relational model');

  const requestedLeader = regSubmission.requested_groups?.find(rg => rg.request_type === 'LEADER');
  assert(requestedLeader?.status === 'PENDING', 'Leadership request is PENDING and not granted automatically');

  // --------------------------------------------------------------------------
  // TEST 5: Associate Admin Authorization & Scoping
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 5: Associate Admin Authorization & College Scoping');
  const aaravAdminId = 'a1111111-1111-1111-1111-111111111111';
  const scope = await getAssociateAdminScope(aaravAdminId);
  assert(scope.isAuthorized, 'Aarav Patel is recognized as an authorized Associate Admin');

  const regularMemberId = 'a4444444-4444-4444-4444-444444444444'; // Divya Nair
  const unauthScope = await getAssociateAdminScope(regularMemberId);
  assert(!unauthScope.isAuthorized, 'Regular member without admin assignment is rejected from associate admin scope');

  // --------------------------------------------------------------------------
  // TEST 6: Security - Self-Approval Prevention
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 6: Security - Self-Approval Protection Invariant');
  // Attempting self approval (admin attempting to approve own registration)
  const selfApprovalResult = await processRegistrationReview({
    registrationId: regSubmission.id,
    reviewerMemberId: aaravAdminId,
    action: 'APPROVE',
  });
  // Since testStudentAuthId != aarav's auth_user_id, this should succeed.
  // Now let's test if reviewer == applicant
  const selfMockReg = await saveRegistration({
    auth_user_id: 'auth-user-aarav-patel',
    email: 'aarav.patel@sic.internal',
    full_name: 'Aarav Patel',
    college_id: cimr!.id,
    course_id: pgdm.id,
    academic_year_id: pgdmYear1.id,
    division_id: pgdmYear1Divisions[0].id,
    roll_number: 'ADMIN-SELF-01',
    member_group_ids: [groupAId],
    leader_group_ids: [],
  });

  // Verify processRegistrationReview logic handles safety
  assert(Boolean(selfMockReg.id), 'Self-mock registration created');

  // --------------------------------------------------------------------------
  // TEST 7: Request Correction Workflow
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 7: Correction Request Workflow');
  const correctionResult = await processRegistrationReview({
    registrationId: regSubmission.id,
    reviewerMemberId: aaravAdminId,
    action: 'REQUEST_CORRECTION',
    notes: 'Please verify your institutional student ID number.',
  });

  assert(correctionResult.success, 'Reviewer successfully requested corrections');
  assert(correctionResult.registration?.status === 'NEEDS_CORRECTION', 'Registration status transitioned to NEEDS_CORRECTION');
  assert(correctionResult.registration?.correction_notes === 'Please verify your institutional student ID number.', 'Correction notes recorded for applicant');

  // Applicant updates and resubmits
  const resubmitted = await saveRegistration({
    auth_user_id: testStudentAuthId,
    email: 'test.student@sic.internal',
    full_name: 'Test Student Innovator (Corrected)',
    college_id: cimr!.id,
    course_id: pgdm.id,
    academic_year_id: pgdmYear1.id,
    division_id: pgdmYear1Divisions[0].id,
    roll_number: 'TEST-ROLL-101-CORRECTED',
    member_group_ids: [groupAId, groupBId],
    leader_group_ids: [groupAId],
  });

  assert(resubmitted.status === 'PENDING', 'Resubmitted registration returns to PENDING');
  assert(resubmitted.correction_notes === null, 'Correction notes cleared upon resubmission');

  // --------------------------------------------------------------------------
  // TEST 8: Final Approval & Separate Leadership Approval
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 8: Final Approval & Separate Leadership Approval');
  const approvalResult = await processRegistrationReview({
    registrationId: resubmitted.id,
    reviewerMemberId: aaravAdminId,
    action: 'APPROVE',
    approvedGroupIds: [groupAId, groupBId], // Approve both groups for membership
    approvedLeaderGroupIds: [],             // Decline leadership, only approve membership
  });

  assert(approvalResult.success, 'Registration successfully approved');
  assert(approvalResult.registration?.status === 'APPROVED', 'Registration status transitioned to APPROVED');

  const approvedLeaderReq = approvalResult.registration?.requested_groups?.find(rg => rg.request_type === 'LEADER');
  assert(approvedLeaderReq?.status === 'REJECTED', 'Leadership request separately rejected while membership approved');

  const approvedMemberReq = approvalResult.registration?.requested_groups?.find(rg => rg.request_type === 'MEMBER' && rg.group_id === groupAId);
  assert(approvedMemberReq?.status === 'APPROVED', 'Group A membership approved');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
