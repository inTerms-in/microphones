# Redevelopment Plan: Smart Sales Tracker (v2.0)

## 1. Project Objective
A high-performance daily sales and service tracking system for multi-branch organizations. Focuses on speed of entry, real-time reporting, and granular permission overrides.

## 2. Core Features & Workflows

### A. Daily Entry System
- **Single Entry Rule**: Enforce one record per branch per day.
- **Form Fields**: Total Sales, Service Amount, Smartphone Count, SIM Count, Remarks.
- **Smart Branch Loading**: Auto-select branch if user is assigned to one. Multi-branch users get a switchable dropdown.

### B. Dashboard & Analytics
- **Live Metrics**: Today's Sales, Service Revenue, Device Counts.
- **Progress Tracking**: "Entry Status" (e.g., 8 / 10 branches completed).
- **Visuals**: Sales Distribution Chart, Weekly Trends, "Top Branch" Trophy.

### C. Advanced Role & Permission System (RBAC+)
- **Roles**: Owner (Full), Partner (Company focus), Employee (Branch focus).
- **Permission Matrix**: Granular View/Insert/Update/Delete overrides for every page (Dashboard, Entry, Settings, Reports) regardless of base role.
- **Control**: Admin can disable login rights or deactivate specific users instantly.

### D. User Management
- **Instant Create**: Users added via admin panel are ready to log in immediately (No email confirmation).
- **Single Branch/Company Focus**: Simplified data isolation.

## 3. Database Schema
- `companies`: Primary business entity.
- `branches`: Locations linked to a company.
- `profiles`: User details, role, and active status.
- `user_branches`: Many-to-many link for staff assignments.
- `page_permissions`: Page-level overrides per user.
- `daily_entries`: The core transaction table (Unique per branch/date).

## 4. Technical Stack
- **Frontend**: Vite + React.
- **Styling**: Vanilla CSS (Modern, Glassmorphism, Premium Dark UI).
- **Backend**: Supabase (Auth, DB, Functions).
- **API Strategy**: No page reloads (Single Page Application style).

## 5. Implementation Task List

### Phase 1: Foundation & Auth
- [ ] Initialize Clean Vite + React Project.
- [ ] Deploy v2.0 Database Schema (Tables, Functions, RPCs).
- [ ] Implement `admin_create_user_instant` RPC.
- [ ] Finalize standard role-based login flow.

### Phase 2: Core Data Entry
- [ ] Implement Daily Entry Form with validation.
- [ ] Add Branch-switch logic for multi-branch users.
- [ ] Restrict access based on `page_permissions`.

### Phase 3: Premium Dashboard
- [ ] Build high-end Dashboard with Recharts/Framer Motion.
- [ ] Implement real-time status tracking (Entries remaining).
- [ ] Add dynamic metric cards.

### Phase 4: Management & Reports
- [ ] Team Management (User + Detailed Permissions).
- [ ] Branch/Company Management.
- [ ] Detailed Reporting with Date-range & Export filters.
