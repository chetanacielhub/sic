# SIC Unified Attendance & Operations Management System
## Multi-Lead Permission Matrix & Role Scoping

### 1. Architectural Philosophy
Antigravity SIC implements **Context-Aware Scoped Role-Based Access Control (RBAC)**.
A member has:
1. **Organization-Level Role** (`org_role` on `members` table)
2. **Group-Level Roles** (`lead_type` on `group_leads`, or `group_memberships`)
3. **Session-Level Roles** (`host_id`, `co_hosts`, `attendance_moderator`)

---

### 2. Role Definitions

| Context | Role | Description |
| :--- | :--- | :--- |
| **Organization** | `SUPER_ADMIN` | Global system control, tenant settings, root audit view. |
| **Organization** | `SIC_DIRECTOR` | Executive access: all groups, cross-group analytics, MoM final approvals, policy overrides. |
| **Organization** | `SIC_ADMIN` | System administrator: member provisioning, group creation, lead assignments. |
| **Organization** | `OPERATIONS_MANAGER` | Daily operational schedules, duty allocations, cross-group session coordination. |
| **Organization** | `ATTENDANCE_AUDITOR` | Read-only compliance, attendance reconciliation, discrepancy reporting. |
| **Organization** | `MEMBER` | Standard SIC member with group participation and personal check-in. |
| **Group** | `PRIMARY_LEAD` | Head of group: group roster, session scheduling, live QR hosting, MoM draft. |
| **Group** | `CO_LEAD` | Secondary group lead: concurrent live attendance monitoring, co-hosting. |
| **Group** | `GROUP_MEMBER` | Member belonging to group with attendance eligibility. |
| **Session** | `SESSION_HOST` | Primary organizer with single-responsibility operational ownership. |
| **Session** | `CO_HOST` | Co-monitoring of QR codes, live headcount, and check-in assistance. |

---

### 3. Permission Capability Matrix

| Operation | Super Admin / Director | SIC Admin | Group Lead (Scoped) | Group Member |
| :--- | :---: | :---: | :---: | :---: |
| **View All Members** | ✅ | ✅ | ⚠️ Group Only | ⚠️ Public Profile Only |
| **Create / Modify Groups** | ✅ | ✅ | ❌ | ❌ |
| **Assign Group Leads** | ✅ | ✅ | ❌ | ❌ |
| **Schedule Group Session** | ✅ | ✅ | ✅ (Own Group) | ❌ |
| **Schedule Combined Session** | ✅ | ✅ | ⚠️ (Requires Approval) | ❌ |
| **Display Rotating QR** | ✅ | ✅ | ✅ (Own Session) | ❌ |
| **Scan QR for Self** | ✅ | ✅ | ✅ | ✅ |
| **Scan QR for Others** | ❌ (Strict Prohibition) | ❌ | ❌ | ❌ |
| **Approve Attendance Correction** | ✅ | ✅ | ✅ (Own Group) | ❌ |
| **Prepare MoM Document** | ✅ | ✅ | ✅ (Assigned Host) | ❌ |
| **Approve MoM Document** | ✅ (Director) | ✅ | ⚠️ Co-review only | ❌ |
| **View Audit Logs** | ✅ | ✅ | ❌ | ❌ |

---

### 4. Server-Side Enforcement (Rule of Thumb)
1. **Never trust frontend route guards:** Frontend navigation filters are UX affordances only. Every API endpoint (`/api/sic/...`) parses the bearer session, resolves the member UUID, and checks:
   ```ts
   const isLead = await isUserLeadOfGroup(memberId, groupId);
   const isDirector = ['SUPER_ADMIN', 'SIC_DIRECTOR'].includes(member.org_role);
   if (!isLead && !isDirector) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```
2. **PostgreSQL RLS:** Row-level policies mirror the scoped role queries directly in the database engine.
