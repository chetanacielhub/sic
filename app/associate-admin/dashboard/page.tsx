// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /associate-admin/dashboard
// Associate Administrator Control Console: Academic Hierarchy & Member Approval Engine
// ============================================================================

import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { getColleges, getCourses, getAcademicYears, getDivisions, getRegistrations } from '@/lib/academic/store';
import { AssociateAdminConsole } from '@/components/sic/associate-admin-console';

export const dynamic = 'force-dynamic';

export default async function AssociateAdminDashboardPage() {
  const currentMember = await getCurrentMember();

  if (!currentMember) {
    redirect('/associate-admin-login?error=UnauthorizedAdmin');
  }

  const scope = await getAssociateAdminScope(currentMember.id);
  if (!scope.isAuthorized) {
    redirect('/associate-admin-login?error=UnauthorizedAdmin');
  }

  // Load institutional academic structure and scoped registrations
  const [colleges, allCourses, allYears, allDivisions, registrations] = await Promise.all([
    getColleges(),
    getCourses(),
    getAcademicYears(),
    getDivisions(),
    getRegistrations({
      collegeIds: scope.collegeIds.length > 0 ? scope.collegeIds : undefined,
    }),
  ]);

  // Filter colleges if scoped
  const scopedColleges = scope.isSuperAdmin || scope.collegeIds.length === 0
    ? colleges
    : colleges.filter(c => scope.collegeIds.includes(c.id));

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <AssociateAdminConsole
        currentMember={currentMember}
        scope={scope}
        initialColleges={scopedColleges}
        initialCourses={allCourses}
        initialYears={allYears}
        initialDivisions={allDivisions}
        initialRegistrations={registrations}
      />
    </div>
  );
}
