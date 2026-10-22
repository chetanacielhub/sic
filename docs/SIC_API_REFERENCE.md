# SIC Unified Attendance & Operations Management System
## API Reference Specification

All endpoints are built as typed Next.js Route Handlers (`app/api/sic/...`).
Responses adhere to a standardized JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "timestamp": "2026-10-22T04:36:00Z" }
}
```

---

### 1. Members API
* **`GET /api/sic/members`**: List active SIC members (supports `?group_id=...&query=...&page=1&limit=50`).
* **`GET /api/sic/members/:id`**: Get detailed profile, group memberships, and attendance statistics.
* **`PATCH /api/sic/members/:id`**: Update member details (department, designation, phone, avatar).
* **`POST /api/sic/members`**: Provision new SIC member (Admin only).

### 2. Groups & Memberships API
* **`GET /api/sic/groups`**: List all active groups with lead summaries and member counts.
* **`POST /api/sic/groups`**: Create a new group (name, code, type, capacity, attendance policy).
* **`GET /api/sic/groups/:id`**: Group details, active leads, and attendance benchmarks.
* **`PATCH /api/sic/groups/:id`**: Update group information or attendance policies.
* **`GET /api/sic/groups/:id/members`**: Group roster with role (`PRIMARY_LEAD`, `CO_LEAD`, `MEMBER`).
* **`POST /api/sic/groups/:id/members`**: Add or invite members to group.
* **`DELETE /api/sic/groups/:id/members/:memberId`**: Archive membership (`ended_at = now()`).
* **`POST /api/sic/groups/:id/leads`**: Assign or revoke group lead status.

### 3. Sessions & Meetings API
* **`GET /api/sic/sessions`**: List sessions (filters: `?status=...&group_id=...&from=...&to=...`).
* **`POST /api/sic/sessions`**: Create a new session (single group or multi-group). Computes and snapshots eligible members automatically.
* **`GET /api/sic/sessions/:id`**: Session details, participating groups, and host information.
* **`PATCH /api/sic/sessions/:id`**: Update session details or transition status (`OPEN`, `CLOSED`, etc.).
* **`GET /api/sic/sessions/:id/qr`**: Get current rotating HMAC challenge token (Authorized hosts only).
* **`GET /api/sic/sessions/:id/attendance`**: Fetch live session attendance roster and unique headcount summary.

### 4. Attendance & Check-In API
* **`POST /api/sic/attendance/check-in`**:
  * Body: `{ "challenge": "...", "location": { "lat": ..., "lng": ... } }`
  * Validates token HMAC, rotation interval, member session eligibility, and records attendance.
* **`POST /api/sic/attendance/corrections`**:
  * Body: `{ "record_id": "...", "requested_status": "...", "reason": "..." }`
  * Submits an attendance correction request for lead/admin approval.
* **`GET /api/sic/attendance/me`**: Personal attendance history across all sessions, meetings, and duty.
* **`POST /api/sic/attendance/daily/check-in`**: Record start of daily institutional duty.
* **`POST /api/sic/attendance/daily/check-out`**: Record end of daily institutional duty and calculate duty duration.

### 5. Minutes of Meeting (MoM) API
* **`GET /api/sic/mom/:sessionId`**: Fetch MoM document, agenda, notes, decisions, and action items.
* **`POST /api/sic/mom`**: Initialize or update draft MoM document.
* **`POST /api/sic/mom/:id/submit`**: Submit draft MoM for review.
* **`POST /api/sic/mom/:id/approve`**: Executive/Director approval of MoM.
* **`GET /api/sic/mom/:id/pdf`**: Stream official server-rendered PDF document.
* **`POST /api/sic/mom/:id/action-items`**: Create or update action item tasks.

### 6. Analytics & Reports API
* **`GET /api/sic/reports/attendance`**: High-level attendance analytics (turnout %, trend series, late rates).
* **`GET /api/sic/reports/groups`**: Comparative group participation and performance.
* **`GET /api/sic/reports/export`**: Export CSV/JSON data for specified date ranges and groups.
