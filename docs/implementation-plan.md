# ResourceFlow Implementation Plan

> **Last updated:** January 14, 2026  
> **Status:** Ready for Development  
> **Phase Focus:** Phase 1 MVP (12 Features)

---

## Overview

This document provides a step-by-step implementation checklist for ResourceFlow, a Slack-first resourcing and budget tracking system. The plan is organized by implementation layer: Database, API, React Components, and Slack Interactions.

**Tech Stack:**
- Frontend: React 18, Material UI v5, MUI X DataGrid
- Backend: Node.js with Slack Bolt SDK
- Database: Supabase (Postgres)
- Auth: Slack OAuth

---

## Phase 1 Features (MVP)

| Feature | Priority Score | Domain Owner |
|---------|----------------|--------------|
| Budget Dashboard | 5.00 (Unanimous) | Michelle |
| Approval Queue | 5.00 (Unanimous) | Michelle |
| Add Unplanned Work | 5.00 (Unanimous) | Kara |
| PTO/Holiday Visibility | 5.00 (Unanimous) | Maleno |
| Phase Breakdown View | 5.00 (Unanimous) | Michelle |
| Confirm/Adjust Modal | 4.75 | Kara |
| Company-Wide Dashboard | 4.50 | Everyone |
| Resource Calendar | 4.25 | Maleno |
| Audit Trail / Drill-Down | 4.25 | Levi |
| Budget Alerts | 4.00 | Michelle |
| Monday Scheduling DM | 3.50 | Kara |
| Friday Confirmation DM | 3.25 | Kara |

---

## 1. Database Tables

### 1.1 Organizations Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Organization name |
| slack_workspace_id | VARCHAR(50) | Slack workspace ID |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** None (foundation table)
- **Complexity:** Small

---

### 1.2 Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| org_id | UUID (FK) | Organization reference |
| email | VARCHAR(255) | User email |
| name | VARCHAR(255) | Display name |
| role | ENUM | 'employee', 'pm', 'admin' |
| slack_user_id | VARCHAR(50) | Slack user ID |
| hourly_rate | DECIMAL(10,2) | Billable rate (visible to admin/pm only) |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** Organizations table
- **Complexity:** Small

---

### 1.3 Clients Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| org_id | UUID (FK) | Organization reference |
| name | VARCHAR(255) | Client name |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation timestamp |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** Organizations table
- **Complexity:** Small

---

### 1.4 Projects Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| org_id | UUID (FK) | Organization reference |
| client_id | UUID (FK) | Client reference |
| name | VARCHAR(255) | Project name |
| description | TEXT | Project snippet/tooltip |
| color | VARCHAR(7) | Hex color code |
| budget_hours | DECIMAL(10,2) | Total budget in hours |
| hourly_rate | DECIMAL(10,2) | Project billing rate |
| is_billable | BOOLEAN | Billable flag |
| is_active | BOOLEAN | Active status |
| priority | INTEGER | Priority ranking (1 = highest) |
| status | ENUM | 'planning', 'active', 'on-hold', 'complete' |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** Organizations, Clients tables
- **Complexity:** Medium

---

### 1.5 Phases Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| project_id | UUID (FK) | Project reference |
| name | VARCHAR(100) | Phase name (Design, Dev, QA, etc.) |
| budget_hours | DECIMAL(10,2) | Phase budget |
| sort_order | INTEGER | Display order |
| status | ENUM | 'pending', 'active', 'complete' |

- **Priority:** Phase 1 Must-Have (Phase Breakdown View)
- **Dependencies:** Projects table
- **Complexity:** Small

---

### 1.6 Allocations Table (Planned Time)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| project_id | UUID (FK) | Project reference |
| user_id | UUID (FK) | User reference |
| phase_id | UUID (FK) | Phase reference (nullable) |
| week_start | DATE | Week start date (Monday) |
| planned_hours | DECIMAL(5,2) | Planned hours for week |
| is_billable | BOOLEAN | Billable flag |
| notes | TEXT | Allocation notes |
| created_by | UUID (FK) | PM who created |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** Projects, Users, Phases tables
- **Complexity:** Medium

---

### 1.7 TimeConfirmations Table (Submitted Timesheets)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| user_id | UUID (FK) | Employee reference |
| week_start | DATE | Week start date |
| status | ENUM | 'draft', 'submitted', 'approved', 'rejected' |
| submitted_at | TIMESTAMP | Submission timestamp |
| approved_by | UUID (FK) | Manager who approved |
| approved_at | TIMESTAMP | Approval timestamp |
| rejection_reason | TEXT | Rejection comment |
| exact_match_flag | BOOLEAN | Rubber-stamp detection |
| notes | TEXT | Employee notes |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** Users table
- **Complexity:** Medium

---

### 1.8 TimeEntries Table (Line Items)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| confirmation_id | UUID (FK) | TimeConfirmation reference |
| project_id | UUID (FK) | Project reference |
| phase_id | UUID (FK) | Phase reference (nullable) |
| allocation_id | UUID (FK) | Original allocation (nullable) |
| planned_hours | DECIMAL(5,2) | Originally planned hours |
| actual_hours | DECIMAL(5,2) | Actual hours worked |
| is_unplanned | BOOLEAN | Unplanned work flag |
| notes | TEXT | Entry notes |
| tags | VARCHAR(50)[] | Quick tags (urgent, client-call, etc.) |

- **Priority:** Phase 1 Must-Have (Add Unplanned Work)
- **Dependencies:** TimeConfirmations, Projects, Phases tables
- **Complexity:** Medium

---

### 1.9 PtoEntries Table (PTO/Holiday Visibility)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| user_id | UUID (FK) | User reference |
| date | DATE | PTO date |
| type | ENUM | 'pto', 'holiday', 'half-day', 'sick' |
| hours | DECIMAL(5,2) | Hours unavailable |
| notes | TEXT | Optional notes |

- **Priority:** Phase 1 Must-Have
- **Dependencies:** Users table
- **Complexity:** Small

---

### 1.10 AuditLog Table (Audit Trail)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| org_id | UUID (FK) | Organization reference |
| entity_type | VARCHAR(50) | Table name affected |
| entity_id | UUID | Record ID affected |
| action | ENUM | 'create', 'update', 'delete' |
| changes | JSONB | Before/after values |
| user_id | UUID (FK) | User who made change |
| created_at | TIMESTAMP | Timestamp |

- **Priority:** Phase 1 Must-Have (Audit Trail / Drill-Down)
- **Dependencies:** All tables
- **Complexity:** Medium

---

## 2. API Endpoints

### 2.1 Authentication

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/auth/slack` | Initiate Slack OAuth | Phase 1 | Medium |
| GET | `/auth/slack/callback` | OAuth callback handler | Phase 1 | Medium |
| POST | `/auth/logout` | End session | Phase 1 | Small |
| GET | `/auth/me` | Get current user info | Phase 1 | Small |

- **Dependencies:** Users, Organizations tables

---

### 2.2 Organizations

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/organizations/:id` | Get organization details | Phase 1 | Small |
| PUT | `/api/organizations/:id` | Update organization settings | Phase 2 | Small |

- **Dependencies:** Auth middleware, Organizations table

---

### 2.3 Users

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/users` | List org users | Phase 1 | Small |
| GET | `/api/users/:id` | Get user details | Phase 1 | Small |
| PUT | `/api/users/:id` | Update user | Phase 1 | Small |
| GET | `/api/users/:id/allocations` | Get user's allocations | Phase 1 | Medium |
| GET | `/api/users/:id/utilization` | Get utilization stats | Phase 1 | Medium |

- **Dependencies:** Users, Allocations tables

---

### 2.4 Projects

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/projects` | List projects (with filters) | Phase 1 | Medium |
| POST | `/api/projects` | Create project | Phase 1 | Medium |
| GET | `/api/projects/:id` | Get project details | Phase 1 | Small |
| PUT | `/api/projects/:id` | Update project | Phase 1 | Small |
| DELETE | `/api/projects/:id` | Archive project | Phase 2 | Small |
| GET | `/api/projects/:id/budget` | Get budget summary | Phase 1 | Medium |
| GET | `/api/projects/:id/phases` | Get phase breakdown | Phase 1 | Medium |
| GET | `/api/projects/:id/team` | Get team assignments | Phase 1 | Medium |
| GET | `/api/projects/:id/audit` | Get audit trail | Phase 1 | Medium |

- **Dependencies:** Projects, Phases, Allocations, AuditLog tables

---

### 2.5 Phases

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/projects/:projectId/phases` | List phases | Phase 1 | Small |
| POST | `/api/projects/:projectId/phases` | Create phase | Phase 1 | Small |
| PUT | `/api/phases/:id` | Update phase | Phase 1 | Small |
| DELETE | `/api/phases/:id` | Delete phase | Phase 2 | Small |

- **Dependencies:** Phases table

---

### 2.6 Allocations

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/allocations` | List allocations (with filters) | Phase 1 | Medium |
| POST | `/api/allocations` | Create allocation | Phase 1 | Medium |
| PUT | `/api/allocations/:id` | Update allocation | Phase 1 | Small |
| DELETE | `/api/allocations/:id` | Delete allocation | Phase 1 | Small |
| POST | `/api/allocations/bulk` | Bulk create/update | Phase 2 | Large |
| GET | `/api/allocations/week/:weekStart` | Get week's allocations | Phase 1 | Medium |

- **Dependencies:** Allocations, Users, Projects tables

---

### 2.7 Time Confirmations

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/confirmations` | List confirmations (with filters) | Phase 1 | Medium |
| POST | `/api/confirmations` | Create/start confirmation | Phase 1 | Medium |
| GET | `/api/confirmations/:id` | Get confirmation details | Phase 1 | Small |
| PUT | `/api/confirmations/:id` | Update confirmation | Phase 1 | Medium |
| POST | `/api/confirmations/:id/submit` | Submit for approval | Phase 1 | Medium |
| POST | `/api/confirmations/:id/approve` | Approve timesheet | Phase 1 | Medium |
| POST | `/api/confirmations/:id/reject` | Reject timesheet | Phase 1 | Medium |
| GET | `/api/confirmations/pending` | Get pending approvals | Phase 1 | Medium |
| GET | `/api/confirmations/user/:userId/week/:weekStart` | Get user's week | Phase 1 | Medium |

- **Dependencies:** TimeConfirmations, TimeEntries tables

---

### 2.8 Time Entries

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| POST | `/api/confirmations/:confirmationId/entries` | Add entry | Phase 1 | Medium |
| PUT | `/api/entries/:id` | Update entry | Phase 1 | Small |
| DELETE | `/api/entries/:id` | Delete entry | Phase 1 | Small |

- **Dependencies:** TimeEntries table

---

### 2.9 PTO / Holidays

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/pto` | List PTO entries | Phase 1 | Small |
| POST | `/api/pto` | Create PTO entry | Phase 1 | Small |
| PUT | `/api/pto/:id` | Update PTO | Phase 1 | Small |
| DELETE | `/api/pto/:id` | Delete PTO | Phase 1 | Small |
| GET | `/api/pto/week/:weekStart` | Get week's PTO | Phase 1 | Small |
| GET | `/api/pto/user/:userId` | Get user's PTO | Phase 1 | Small |

- **Dependencies:** PtoEntries table

---

### 2.10 Dashboard / Reports

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/dashboard/budget` | Budget dashboard data | Phase 1 | Large |
| GET | `/api/dashboard/company` | Company-wide overview | Phase 1 | Large |
| GET | `/api/dashboard/utilization` | Team utilization | Phase 1 | Large |
| GET | `/api/reports/audit/:projectId` | Audit trail report | Phase 1 | Medium |
| GET | `/api/reports/variance` | Variance analysis | Phase 1 | Medium |

- **Dependencies:** Multiple tables, aggregation queries

---

### 2.11 Budget Alerts

| Method | Path | Purpose | Priority | Complexity |
|--------|------|---------|----------|------------|
| GET | `/api/alerts` | Get active alerts | Phase 1 | Medium |
| PUT | `/api/alerts/:id/acknowledge` | Acknowledge alert | Phase 1 | Small |
| GET | `/api/projects/:id/alerts` | Get project alerts | Phase 1 | Medium |

- **Dependencies:** Projects table, budget calculation logic

---

## 3. React Components

### 3.1 Layout Components

#### AppShell
- **Props:** `children`, `userRole`
- **Responsibilities:** Main layout wrapper, sidebar navigation, user context
- **Priority:** Phase 1 Must-Have
- **Dependencies:** None
- **Complexity:** Medium

#### Sidebar
- **Props:** `activeView`, `selectedProject`, `userRole`, `onNavigate`
- **Responsibilities:** Navigation menu, project list, role-based menu items
- **Priority:** Phase 1 Must-Have
- **Dependencies:** AppShell
- **Complexity:** Medium

---

### 3.2 Dashboard Components

#### BudgetDashboard (Michelle's Domain)
- **Props:** `projects`, `userRole`, `onProjectSelect`
- **Responsibilities:** 
  - Display all project budget cards
  - Show burn rates with LinearProgress
  - Filter by status, client, health
  - Export to CSV
  - Role-based visibility (employees see hours, managers see dollars)
- **Priority:** Phase 1 Must-Have (5.00 score)
- **Dependencies:** API `/api/dashboard/budget`, BudgetCard component
- **Complexity:** Large

#### BudgetCard
- **Props:** `project`, `userRole`, `onClick`
- **Responsibilities:**
  - Show project name, client, budget progress
  - Display health indicator (on-track, at-risk)
  - Show remaining hours/dollars based on role
- **Priority:** Phase 1 Must-Have
- **Dependencies:** BudgetDashboard
- **Complexity:** Medium

#### PhaseBreakdownView (Michelle's Domain)
- **Props:** `projectId`, `phases`, `userRole`
- **Responsibilities:**
  - Show budget by phase (Design, Dev, QA)
  - Progress bars per phase
  - Drill-down capability per phase
  - Combine/merge phase figures
- **Priority:** Phase 1 Must-Have (5.00 score)
- **Dependencies:** API `/api/projects/:id/phases`
- **Complexity:** Medium

#### CompanyWideDashboard (Everyone's Domain)
- **Props:** `userRole`
- **Responsibilities:**
  - Show all projects at a glance
  - Priority ranking visible
  - Team utilization heat map
  - Capacity overview
  - Issue flags surfaced
- **Priority:** Phase 1 Must-Have (4.50 score)
- **Dependencies:** API `/api/dashboard/company`
- **Complexity:** Large

#### AuditTrailView (Levi's Requirement)
- **Props:** `projectId`, `filters`
- **Responsibilities:**
  - Show variance by week/person/phase
  - Drill-down from "over budget" to specific entries
  - Timeline of changes
  - Filter by date range, person, phase
- **Priority:** Phase 1 Must-Have (4.25 score)
- **Dependencies:** API `/api/reports/audit/:projectId`
- **Complexity:** Large

---

### 3.3 Approval Components

#### ApprovalQueue (Michelle's Domain)
- **Props:** `pendingApprovals`, `onApprove`, `onReject`
- **Responsibilities:**
  - List pending timesheet submissions
  - Show variance warnings (>10% difference)
  - Show rubber-stamp warnings (actual = planned exactly)
  - Bulk approve checkbox
  - Quick stats cards at top
- **Priority:** Phase 1 Must-Have (5.00 score)
- **Dependencies:** API `/api/confirmations/pending`
- **Complexity:** Large

#### ApprovalCard
- **Props:** `approval`, `onApprove`, `onReject`, `onViewDetails`
- **Responsibilities:**
  - Show employee info and submission time
  - Display planned vs actual table
  - Show warning badges
  - Surface employee notes
  - Action buttons
- **Priority:** Phase 1 Must-Have
- **Dependencies:** ApprovalQueue
- **Complexity:** Medium

#### RejectionDialog
- **Props:** `open`, `onClose`, `onReject`
- **Responsibilities:**
  - Required comment field for rejection
  - Submit rejection with reason
- **Priority:** Phase 1 Must-Have
- **Dependencies:** ApprovalQueue
- **Complexity:** Small

---

### 3.4 Employee Timesheet Components

#### MyTimesheetView (Kara's Domain)
- **Props:** `userId`, `weekStart`
- **Responsibilities:**
  - Show current week's allocations
  - Editable hour inputs
  - Add unplanned work button
  - Notes field
  - Submit for approval
  - View past weeks
- **Priority:** Phase 1 Must-Have (4.75 score)
- **Dependencies:** API `/api/confirmations/user/:userId/week/:weekStart`
- **Complexity:** Large

#### TimeEntryRow
- **Props:** `entry`, `onUpdate`, `isEditable`
- **Responsibilities:**
  - Display project info with color indicator
  - Show planned hours
  - Editable actual hours input
  - Calculate and display variance
- **Priority:** Phase 1 Must-Have
- **Dependencies:** MyTimesheetView
- **Complexity:** Medium

#### AddUnplannedWorkModal (Kara's Domain)
- **Props:** `open`, `onClose`, `onAdd`, `projects`
- **Responsibilities:**
  - Project selection dropdown
  - Hours input
  - Description text area
  - Quick tags (Urgent fix, Client call, Tech debt, Scope creep)
  - Add to timesheet action
- **Priority:** Phase 1 Must-Have (5.00 score)
- **Dependencies:** MyTimesheetView
- **Complexity:** Medium

---

### 3.5 Resource Calendar Components

#### ResourceCalendar (Maleno's Domain)
- **Props:** `weekStart`, `teamMembers`, `allocations`
- **Responsibilities:**
  - Horizontal timeline (weeks as columns)
  - Team members as rows
  - Color-coded allocation blocks
  - PTO/holiday visibility inline
  - Capacity utilization indicators
  - Priority projects shown first
  - Click to edit allocations
- **Priority:** Phase 1 Must-Have (4.25 score)
- **Dependencies:** API `/api/allocations`, `/api/pto`
- **Complexity:** Large

#### AllocationBlock
- **Props:** `allocation`, `onClick`
- **Responsibilities:**
  - Display project color and hours
  - Show project snippet on hover (tooltip)
  - Visual indicator for over-allocation
- **Priority:** Phase 1 Must-Have
- **Dependencies:** ResourceCalendar
- **Complexity:** Medium

#### PtoBlock
- **Props:** `ptoEntry`
- **Responsibilities:**
  - Display PTO/holiday indicator
  - Show type (PTO, holiday, sick, half-day)
- **Priority:** Phase 1 Must-Have (5.00 score)
- **Dependencies:** ResourceCalendar
- **Complexity:** Small

#### AllocationEditModal
- **Props:** `open`, `allocation`, `onSave`, `onClose`
- **Responsibilities:**
  - Edit hours, project, phase
  - Set billable status
  - Add notes
- **Priority:** Phase 1 Must-Have
- **Dependencies:** ResourceCalendar
- **Complexity:** Medium

---

### 3.6 Shared/Utility Components

#### ProgressBar
- **Props:** `value`, `max`, `color`, `showLabel`
- **Responsibilities:** Visual progress indicator
- **Priority:** Phase 1 Must-Have
- **Dependencies:** None
- **Complexity:** Small

#### AvatarGroup
- **Props:** `users`, `max`
- **Responsibilities:** Display team member avatars
- **Priority:** Phase 1 Must-Have
- **Dependencies:** None
- **Complexity:** Small

#### StatusChip
- **Props:** `status`, `variant`
- **Responsibilities:** Display status badges (Approved, Pending, Rejected)
- **Priority:** Phase 1 Must-Have
- **Dependencies:** None
- **Complexity:** Small

#### ProjectTooltip
- **Props:** `project`
- **Responsibilities:** Quick project context on hover
- **Priority:** Phase 1 Must-Have
- **Dependencies:** None
- **Complexity:** Small

#### WeekPicker
- **Props:** `value`, `onChange`
- **Responsibilities:** Select week (Monday-based)
- **Priority:** Phase 1 Must-Have
- **Dependencies:** None
- **Complexity:** Small

#### AlertBanner
- **Props:** `type`, `message`, `onDismiss`
- **Responsibilities:** Display budget alerts, warnings
- **Priority:** Phase 1 Must-Have (Budget Alerts)
- **Dependencies:** None
- **Complexity:** Small

---

## 4. Slack Interactions

### 4.1 Slash Commands

#### `/week`
- **Who:** Employee
- **Purpose:** Opens "Confirm Your Week" modal for current week
- **Response:** Modal with current week's allocations
- **Priority:** Phase 1 Must-Have
- **Dependencies:** Allocations API, TimeConfirmations API
- **Complexity:** Medium

#### `/week last`
- **Who:** Employee
- **Purpose:** Opens confirmation for previous week
- **Response:** Modal with last week's allocations
- **Priority:** Phase 1 Nice-to-Have
- **Dependencies:** Same as `/week`
- **Complexity:** Small

#### `/pending`
- **Who:** Admin/Manager
- **Purpose:** Shows pending approvals count and summary
- **Response:** Ephemeral message with pending list
- **Priority:** Phase 1 Must-Have
- **Dependencies:** TimeConfirmations API
- **Complexity:** Medium

#### `/budget [project]`
- **Who:** Anyone (role-based visibility)
- **Purpose:** Quick budget status for a project
- **Response:** 
  - Hours/percentage for employees
  - Hours + dollars for managers
  - Phase breakdown option
- **Priority:** Phase 2 (scored 1.50)
- **Dependencies:** Projects API
- **Complexity:** Medium

#### `/team`
- **Who:** PM/Admin
- **Purpose:** Shows team utilization this week
- **Response:** Ephemeral message with utilization summary
- **Priority:** Phase 2
- **Dependencies:** Dashboard API
- **Complexity:** Medium

#### `/flag`
- **Who:** Employee
- **Purpose:** Flag an issue with current week allocation
- **Response:** Modal to select issue type and add notes
- **Priority:** Phase 2 (scored 3.00)
- **Dependencies:** IssueFlags API (not in Phase 1)
- **Complexity:** Medium

---

### 4.2 Modals (Block Kit)

#### ConfirmWeekModal
- **Trigger:** Friday DM button, `/week` command
- **Contents:**
  - Week date header
  - Table of allocations (project, planned hours, actual hours input)
  - "Add Unplanned Work" button
  - Notes text area
  - Cancel / Submit buttons
- **Priority:** Phase 1 Must-Have (4.75 score)
- **Dependencies:** Allocations API
- **Complexity:** Large

#### AddUnplannedWorkModal
- **Trigger:** "Add Unplanned Work" button in ConfirmWeekModal
- **Contents:**
  - Quick tags selector (Urgent fix, Client call, Tech debt, Scope creep)
  - Project dropdown
  - Hours input
  - Description text area
  - Cancel / Add buttons
- **Priority:** Phase 1 Must-Have (5.00 score)
- **Dependencies:** Projects API
- **Complexity:** Medium

#### ApprovalDetailModal
- **Trigger:** "View Details" button in manager notification
- **Contents:**
  - Employee info
  - Planned vs Actual table
  - Variance warnings
  - Employee notes
  - Approve / Reject / Ask for Details buttons
- **Priority:** Phase 1 Must-Have
- **Dependencies:** TimeConfirmations API
- **Complexity:** Medium

---

### 4.3 Scheduled Messages (DMs)

#### Monday Scheduling DM
- **Schedule:** Monday 9:00 AM
- **Recipient:** All employees with allocations for the week
- **Contents:**
  - "Your week has been scheduled!"
  - Table of project allocations
  - "Looks Good" / "View Details" / "Flag Issue" buttons
- **Priority:** Phase 1 Must-Have (3.50 score - essential for flow)
- **Dependencies:** Allocations API, Slack Scheduler
- **Complexity:** Medium

#### Friday Confirmation DM
- **Schedule:** Friday 3:00 PM
- **Recipient:** All employees with allocations who haven't submitted
- **Contents:**
  - "Time to confirm your week!"
  - Table of planned hours
  - "Looks Good" / "Adjust Hours" buttons
- **Priority:** Phase 1 Must-Have (3.25 score - essential for flow)
- **Dependencies:** Allocations API, TimeConfirmations API
- **Complexity:** Medium

#### Friday Reminder DM
- **Schedule:** Friday 5:00 PM
- **Recipient:** Employees who haven't submitted
- **Contents:**
  - "Reminder: Please confirm your week"
  - Same buttons as Friday DM
- **Priority:** Phase 1 Nice-to-Have
- **Dependencies:** TimeConfirmations API
- **Complexity:** Small

---

### 4.4 Interactive Notifications

#### Timesheet Submitted Notification
- **Trigger:** Employee submits timesheet
- **Recipient:** Manager/Admin
- **Contents:**
  - Employee avatar and name
  - Week summary table
  - Variance warnings if applicable
  - Rubber-stamp warning if actual = planned exactly
  - Employee notes
  - Approve / Reject buttons
- **Priority:** Phase 1 Must-Have
- **Dependencies:** TimeConfirmations API
- **Complexity:** Medium

#### Budget Alert Notification
- **Trigger:** Project reaches 75% or 90% of budget
- **Recipient:** PM and Admin
- **Contents:**
  - Project name and current burn
  - Projected completion
  - "View Project" button
- **Priority:** Phase 1 Must-Have (4.00 score)
- **Dependencies:** Budget calculation logic
- **Complexity:** Medium

#### Rejection Notification
- **Trigger:** Manager rejects timesheet
- **Recipient:** Employee
- **Contents:**
  - "Your timesheet needs revision"
  - Rejection reason
  - "Edit Timesheet" button
- **Priority:** Phase 1 Must-Have
- **Dependencies:** TimeConfirmations API
- **Complexity:** Small

---

## 5. Implementation Sequence

### Phase 1A: Foundation (Week 1)
1. Set up project structure (Next.js + Supabase)
2. Create database tables: Organizations, Users, Clients
3. Implement Slack OAuth flow
4. Build AppShell and Sidebar components

### Phase 1B: Core Data (Week 2)
1. Create database tables: Projects, Phases, Allocations
2. Build Projects API endpoints
3. Build Allocations API endpoints
4. Create ResourceCalendar component (basic view)

### Phase 1C: Confirmation Flow (Week 3)
1. Create database tables: TimeConfirmations, TimeEntries, PtoEntries
2. Build TimeConfirmations API endpoints
3. Build MyTimesheetView component
4. Build AddUnplannedWorkModal component
5. Implement Slack ConfirmWeekModal

### Phase 1D: Approval Flow (Week 4)
1. Build ApprovalQueue component
2. Build ApprovalCard with variance/rubber-stamp warnings
3. Implement Slack approval notifications
4. Build RejectionDialog

### Phase 1E: Dashboards (Week 5)
1. Create AuditLog table
2. Build Dashboard API endpoints
3. Build BudgetDashboard component
4. Build PhaseBreakdownView component
5. Build CompanyWideDashboard component

### Phase 1F: Slack Automation (Week 6)
1. Implement Monday Scheduling DM
2. Implement Friday Confirmation DM
3. Implement Budget Alert notifications
4. Build PtoBlock and PTO visibility in calendar
5. End-to-end testing

---

## 6. Notes for Implementers

### Budget Visibility Rules (LOCKED)
- **Employees:** Hours and percentages only
- **PMs:** Hours, percentages, AND dollars
- **Admins:** Full financial view

### Trust Signals to Implement
1. **Variance Warning:** Flag when actual differs from planned by >10%
2. **Rubber-Stamp Warning:** Flag when actual = planned exactly (Michelle's insight)
3. **Audit Trail:** Every change logged with before/after values

### Design Principles to Follow
1. One page, no hunting for buttons
2. Company-wide view first
3. Proactive alerts, not reactive reports
4. Meet people where they are (Slack DMs)
5. Project snippets for quick context

### Key Dates
- Thursday: PM finalizes allocations
- Monday 9am: Employee receives schedule DM
- Friday 3pm: Employee receives confirmation DM
- Friday 5pm: Reminder if not submitted

---

*Document generated: January 14, 2026*
*For use by: ResourceFlow development team*
