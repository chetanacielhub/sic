# SIC Unified Attendance & Operations Management System
## Architecture Assessment & Technical Blueprint

---

### A. Repository Assessment

1. **Workspace Context & Repositories:**
   * **Active Repository:** `c:\Users\cheta\Downloads\ciel\sic\sic` (`https://github.com/chetanacielhub/sic.git`).
   * **Initial State:** Clean, newly initialized Git repository on branch `main` with no prior commits or conflicting legacy architecture.
   * **Companion Reference:** `ciel-student-reg` exists in the parent tree with student registration / employee models, but `sic` is dedicated specifically to the **SIC Unified Attendance & Operations Management System**.
   * **Runtime Environment:** Node.js `v24.21.0`, npm `11.19.0`, Windows OS.

2. **Supabase & Database Architecture:**
   * **Project Ref:** `hgnwtuabvbtfgxpwvqdn` (verified active via MCP config and DNS resolution at `104.18.38.10`).
   * **Database Access Model:**
     * Client-side: `@supabase/ssr` with anonymous/publishable key and RLS enforcement.
     * Server-side: Typed Next.js Route Handlers and Server Actions utilizing session context or admin client for privileged operations.
   * **Integration Risks & Mitigations:**
     * *Risk: Overlapping Members in Multi-Group Meetings:* Handled with a strict database-level unique constraint on `(session_id, member_id)` and pre-computed session eligibility snapshots.
     * *Risk: Remote QR Screenshot Sharing:* Addressed using rotating short-lived HMAC challenges (15s/30s/60s), single-use challenge nonce tokens, and client geolocation/supervisor flags.
     * *Risk: Race Conditions on Check-in:* Handled via Postgres atomic upserts/stored procedures with row-level locks.

---

### B. Proposed Implementation Structure

#### 1. Directory Structure (Next.js App Router)
```text
sic/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── auth/callback/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                           # Role-based landing router
│   │   ├── sic/
│   │   │   ├── members/                       # Member directory & profiles
│   │   │   ├── groups/                        # Group CRUD, memberships, leads
│   │   │   │   └── [id]/
│   │   │   ├── sessions/                      # Session scheduling & details
│   │   │   │   ├── new/
│   │   │   │   ├── [id]/
│   │   │   │   ├── [id]/qr/                   # Full-screen Rotating QR
│   │   │   │   └── [id]/live/                 # Realtime Live Attendance & Headcount
│   │   │   ├── check-in/                      # Mobile-friendly QR Scanner / Check-in
│   │   │   ├── attendance/
│   │   │   │   ├── daily/                     # Daily duty check-in/out
│   │   │   │   ├── me/                        # Individual attendance history
│   │   │   │   └── corrections/               # Correction requests & approvals
│   │   │   ├── mom/                           # Minutes of Meeting (MoM)
│   │   │   │   └── [id]/                      # Editor, Action Items, PDF export
│   │   │   ├── workshops/                     # Multi-session workshops
│   │   │   ├── events/                        # Event entry/exit & capacity
│   │   │   ├── reports/                       # Analytics, Recharts, CSV/PDF
│   │   │   └── settings/                      # Attendance policies & audit logs
│   ├── api/
│   │   └── sic/
│   │       ├── members/
│   │       ├── groups/
│   │       ├── sessions/
│   │       ├── attendance/
│   │       ├── mom/
│   │       └── reports/
├── components/
│   ├── ui/                                    # shadcn/ui components
│   ├── sic/
│   │   ├── qr-display.tsx                     # Dynamic rotating QR canvas
│   │   ├── qr-scanner.tsx                     # Camera/stream QR reader
│   │   ├── live-roster.tsx                    # Realtime Supabase presence table
│   │   ├── mom-editor.tsx                     # Rich notes & action items
│   │   └── analytics-charts.tsx               # Recharts dashboard widgets
├── lib/
│   ├── supabase/                              # client.ts, server.ts, admin.ts
│   ├── auth/                                  # Permissions, session helpers, RBAC
│   ├── qr/                                    # HMAC token generation & validation
│   ├── pdf/                                   # Server-side MoM PDF rendering
│   └── types/                                 # Complete TypeScript database types
├── docs/                                      # Full specifications and guides
└── supabase/
    └── migrations/                            # Reversible, versioned SQL migrations
```

#### 2. Domain & Database Schema (`supabase/migrations/`)
* **Identity:** `members`, `groups`, `group_memberships`, `group_leads`, `role_assignments`.
* **Scheduling:** `session_series`, `sessions`, `session_groups`, `session_eligible_members`.
* **Attendance:** `attendance_records` (with unique `(session_id, member_id)`), `attendance_events`, `attendance_corrections`, `qr_challenges`.
* **Daily Duty:** `work_schedules`, `daily_attendance`, `duty_sessions`, `leave_requests`.
* **MoM:** `meeting_minutes`, `mom_versions`, `mom_decisions`, `action_items`.
* **Workshops & Events:** `workshops`, `workshop_registrations`, `workshop_sessions`, `events`, `event_registrations`.
* **Governance:** `audit_logs`, `attendance_policies`, `system_settings`.

---

### C. Implementation Plan & Phases

* **Phase 1: Architecture, Core Engine & Database Schema**
  * Bootstrap clean Next.js 15+ App Router, Tailwind CSS, TypeScript, and shadcn/ui base.
  * Write reversible PostgreSQL migrations with RLS, atomic attendance functions, and role matrices.
  * Create typed Supabase client wrappers (`server.ts`, `client.ts`, `admin.ts`).
  * Deliver documentation: `SIC_ARCHITECTURE.md`, `SIC_DATABASE_SCHEMA.md`, `SIC_PERMISSIONS.md`.

* **Phase 2: Member & Multi-Group Management**
  * Member Directory & Profile management.
  * Group CRUD with parent/child hierarchies and configurable capacity/attendance policies.
  * Multi-lead assignments & multi-group memberships with non-destructive historical tracking.

* **Phase 3: Scheduling & Rotating QR Attendance Engine**
  * Session scheduling (single & combined multi-group meetings with deduplicated eligibility snapshots).
  * Cryptographic rotating QR generator (15s/30s/60s HMAC token challenges).
  * Authenticated `/sic/check-in` scanner & atomic verification.

* **Phase 4: Real-time Live Headcount & Monitoring Dashboard**
  * `/sic/sessions/[id]/live` powered by Supabase Realtime channels.
  * Multi-group filtering, roster inspection, and manual attendance correction requests with audit logging.

* **Phase 5: Minutes of Meeting (MoM) & Action Items**
  * MoM editor with workflow states: `DRAFT` → `SUBMITTED` → `APPROVED`.
  * Task assignment & tracking (TODO / IN_PROGRESS / BLOCKED / COMPLETED).
  * Server-side PDF export generation.

* **Phase 6: Daily Duty, Workshops & Events**
  * Independent daily duty check-in/out and derivation of working hours.
  * Multi-session workshop completion tracking and certificate eligibility logic.
  * Event registration, live occupancy, and entry/exit QR monitoring.

* **Phase 7: Analytics, Security Hardening & Automated Testing**
  * Recharts analytics dashboards for Director, Group Leads, and Members.
  * Unit, integration, and security verification tests.
  * Deployment readiness checklist & documentation (`SIC_DEPLOYMENT.md`).
