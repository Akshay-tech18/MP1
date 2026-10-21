# DevPilot: Sprint Feature — Technical Specification & Implementation Plan

> **Document Status**: Ready for Implementation  
> **Target Release**: DevPilot v3.1  
> **Scope**: Full Frontend UI & Backend Integration for Sprint Lifecycle Management

---

## 1. Feature Overview & Objectives

The **Sprint Feature** structures continuous engineering tasks into fixed, goal-driven timeboxes. It equips engineering teams with:
1. **Sprint Creation with Presets**: 1-week, 2-week, and custom cycle presets with auto-calculated start and end dates.
2. **Sprint Command Banner**: A persistent banner atop the Kanban Board showing active sprint name, goal, days remaining countdown, live completion progress bar, and manager action triggers.
3. **Sprint Lifecycle State Machine**:
   - `PLANNED`: Sprint is configured and loaded with tasks from the backlog.
   - `ACTIVE`: Work is underway (enforcing a strict rule: **only one active sprint at a time per workspace**).
   - `COMPLETED`: Work is finalized, achievements celebrated, and unfinished tasks rolled over.
4. **Sprint Completion & Task Rollover Workflow**:
   - Interactive modal detailing completed tasks vs. incomplete work.
   - 1-click rollover to either the **Backlog** (`sprintId = null`) or the **Next Planned Sprint**.
5. **Real-Time Multi-User Synchronization**: Live Socket.IO broadcasts for `sprint:created`, `sprint:updated`, and `sprint:completed`.

---

## 2. Current Architecture & Integration Points

DevPilot already possesses a solid backend foundation that requires zero new database tables:

- **Database Model** (`backend/prisma/schema.prisma`):
  ```prisma
  model Sprint {
    id        String       @id @default(uuid())
    name      String
    goal      String?
    status    SprintStatus @default(PLANNED) // PLANNED | ACTIVE | COMPLETED | CANCELLED
    startDate DateTime
    endDate   DateTime
    projectId String
    project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
    tasks     Task[]
    createdAt DateTime     @default(now())
    updatedAt DateTime     @updatedAt
  }
  ```

- **Existing Backend Endpoints** (`backend/src/modules/sprints/sprint.controller.js`):
  | HTTP Method | Route Path | Purpose |
  | :--- | :--- | :--- |
  | `POST` | `/api/projects/:id/sprints` | Create a new sprint in `PLANNED` status |
  | `GET` | `/api/projects/:id/sprints` | List all sprints for the project |
  | `GET` | `/api/projects/:id/sprints/:sprintId` | Get sprint details with tasks |
  | `PATCH` | `/api/projects/:id/sprints/:sprintId` | Update sprint details / activate sprint |
  | `POST` | `/api/projects/:id/sprints/:sprintId/complete` | Complete sprint and move unfinished tasks |
  | `POST` | `/api/projects/:id/sprints/:sprintId/tasks` | Batch move tasks into this sprint |
  | `DELETE` | `/api/projects/:id/sprints/:sprintId` | Delete sprint and migrate tasks to backlog |

---

## 3. Detailed UI / UX Specifications

### 3.1. Sprint Command Banner (`frontend/src/pages/Board.jsx`)
Positioned directly above the Kanban columns:
- **Left Section**:
  - Sprint Selector Dropdown:
    - `🟢 Sprint 1 (Active)`
    - `🟡 Sprint 2 (Planned)`
    - `⚪ Backlog Only`
    - `🟣 All Tasks`
  - Active Sprint Goal badge (with hover tooltip for long descriptions).
  - Date Range pill: `Oct 20 - Nov 03`.
- **Center Section**:
  - Countdown Chip: `⏱ 5 days remaining` (turns amber if ≤ 2 days, red if overdue).
  - Progress Micro-Bar: `8/12 tasks completed (67%)`.
- **Right Section (Manager Actions)**:
  - If viewing `PLANNED` sprint: **"Start Sprint"** button (`btn-primary`).
  - If viewing `ACTIVE` sprint: **"Complete Sprint"** button (`btn-success` / emerald border).
  - Universal: **"+ New Sprint"** button.

---

### 3.2. Create Sprint Modal (`CreateSprintModal.jsx`)
- **Fields**:
  - **Sprint Name**: e.g., `Sprint 2: Performance & Caching` (auto-suggests `Sprint N+1`).
  - **Duration Presets (Radio / Buttons)**:
    - `[ 1 Week ]` → Automatically sets `endDate = startDate + 7 days`.
    - `[ 2 Weeks ]` (Default) → Automatically sets `endDate = startDate + 14 days`.
    - `[ 4 Weeks ]` → Automatically sets `endDate = startDate + 28 days`.
    - `[ Custom ]` → Unlocks custom date pickers.
  - **Start Date**: Defaults to today (or the end date of the current active sprint).
  - **End Date**: Calculated dynamically from duration preset.
  - **Sprint Goal** (Optional textarea): e.g., `Ship Redis caching and complete DORA metrics dashboard`.
- **Actions**:
  - `Cancel`
  - `Create Sprint` (triggers `POST /api/projects/:id/sprints`)

---

### 3.3. Complete Sprint Modal (`CompleteSprintModal.jsx`)
Triggered when clicking **"Complete Sprint"**:
- **Accomplishment Summary**:
  - `✓ 9 Tasks Completed` (highlighted in emerald).
  - `⚠ 3 Tasks Incomplete` (highlighted in amber).
- **Task Rollover Selector**:
  - *"Select where incomplete tasks should go:"*
    - **Option 1: Move to Backlog** (`sprintId = null`).
    - **Option 2: Move to Next Sprint** (`sprintId = nextPlannedSprint.id`).
- **Actions**:
  - `Cancel`
  - `Complete Sprint & Rollover` (triggers `POST /api/projects/:id/sprints/:sprintId/complete`)

---

### 3.4. Task Assignment & Backlog Quick-Move
1. Inside **Task Detail Modal**:
   - In the sidebar metadata, add a **Sprint** dropdown containing all active & planned sprints + "Backlog".
   - Changing the dropdown immediately updates `task.sprintId`.
2. Inside **Task Card Context Menu (`...`)**:
   - Quick action: *"Move to Active Sprint"* or *"Move to Backlog"*.

---

## 4. Frontend Component Architecture

```
frontend/src/
├── components/
│   ├── sprints/
│   │   ├── SprintCommandBanner.jsx   # Top command strip with countdown & progress
│   │   ├── CreateSprintModal.jsx     # Duration presets (1w/2w) & date picker
│   │   ├── CompleteSprintModal.jsx   # Retrospective & task rollover dialog
│   │   └── SprintDetailsModal.jsx    # Edit sprint name, dates, and goal
└── pages/
    └── Board.jsx                     # Integrate SprintCommandBanner & socket listeners
```

---

## 5. Implementation Steps for Tomorrow

### Step 1: Create Sprint Modals & Components
- Build `CreateSprintModal.jsx` with 1-week and 2-week calculation presets.
- Build `CompleteSprintModal.jsx` with summary stats and rollover destination dropdown.

### Step 2: Build `SprintCommandBanner.jsx`
- Implement days remaining calculation:
  ```javascript
  const getDaysRemaining = (endDate) => {
    const diff = new Date(endDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  ```
- Implement task completion percentage derived from current sprint tasks (`task.status === "COMPLETED"`).

### Step 3: Wire Up `Board.jsx` State & Actions
- Connect `activeSprint` state to `SprintCommandBanner`.
- Implement `handleStartSprint`: calls `PATCH /api/projects/:id/sprints/:sprintId` with `{ status: "ACTIVE" }`.
- Implement `handleCompleteSprint`: calls `POST /api/projects/:id/sprints/:sprintId/complete`.

### Step 4: Real-Time Socket Synchronization
- In `Board.jsx`, listen to:
  - `sprint:created`: Appends new sprint to `sprints` list.
  - `sprint:updated`: Updates sprint in state (name, dates, or status).
  - `sprint:completed`: Updates completed sprint, re-fetches tasks to reflect rollover.

### Step 5: Verification & Quality Assurance
- Run `npm test` on backend.
- Run `npm run build` on frontend.
- Verify full flow:
  1. Create Sprint 1 (2 Weeks preset).
  2. Start Sprint 1 (confirm banner turns green with countdown).
  3. Move tasks into Sprint 1.
  4. Complete 2 tasks, leave 1 task in `TODO`.
  5. Create Sprint 2 (Planned).
  6. Complete Sprint 1 with rollover to Sprint 2.
  7. Verify uncompleted task moved to Sprint 2.

---

## 6. Definition of Done (DoD)

- [ ] Project Managers can create sprints with 1-week, 2-week, or custom duration.
- [ ] Only one sprint can be active at a time per project (backend rule enforced in UI).
- [ ] Active sprint countdown and progress bar render accurately at the top of the Kanban Board.
- [ ] Completing a sprint offers clean task rollover to either the Backlog or the next planned sprint.
- [ ] WebSocket broadcasts keep all teammates' boards synchronized in real-time.
- [ ] 0 linter errors and clean production build.

---

## 7. Microsoft Teams-Style Engineering Meetings & Standups Specification

### 7.1. Feature Overview & Objectives
Expands DevPilot's existing ad-hoc Jitsi video calls into a complete **Scheduled Engineering Meeting & Standup Engine** (inspired by Microsoft Teams and Google Meet):
1. **Scheduled Team Ceremonies**:
   - Daily Standups (15-min recurring).
   - Sprint Planning & Backlog Grooming (tied to Sprint start).
   - Sprint Demo & Retrospective (tied to Sprint completion).
   - Architecture & PR Review Syncs.
2. **Interactive In-Channel Meeting Cards**:
   - Scheduling a meeting posts a live interactive card directly to the relevant channel (e.g., `#engineering-sprints`).
   - Live state badges: `Upcoming (countdown)` | `Live Now (Pulsing green + attendee count)` | `Completed`.
   - 1-Click **"Join Call"** button that directly launches the existing WebRTC Jitsi modal.
3. **Live "Meet Now" Channel Banners**:
   - When a call starts in a channel, a persistent top banner alerts active channel members:
     `📹 Call in progress: Sprint Sync (3 on call) — [ Join Call ]`
4. **Meeting Action Items → 1-Click Kanban Tasks**:
   - Any discussion point or meeting note can be converted directly into a `TODO` card on the active Sprint Board with one click.
5. **Calendar View Integration**:
   - Scheduled meetings render alongside task due dates and active sprint date ranges on the Board Calendar view.
6. **5-Minute Pre-Call In-App Toast & Audio Cue**:
   - Automated Socket.IO countdown trigger alerting members 5 minutes prior to scheduled start.

---

### 7.2. Proposed Database Model (`schema.prisma`)

```prisma
enum MeetingType {
  STANDUP
  SPRINT_PLANNING
  SPRINT_RETRO
  ARCHITECTURE_REVIEW
  AD_HOC
}

enum MeetingRecurrence {
  NONE
  DAILY_WEEKDAYS
  WEEKLY
}

model Meeting {
  id          String            @id @default(uuid())
  title       String
  description String?           // Markdown meeting agenda
  type        MeetingType       @default(STANDUP)
  startTime   DateTime
  endTime     DateTime
  recurrence  MeetingRecurrence @default(NONE)
  roomName    String            // Jitsi unique room name
  
  projectId   String
  project     Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  channelId   String?           // Associated chat channel
  hostId      String
  host        User              @relation(fields: [hostId], references: [id])
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([projectId, startTime])
  @@index([channelId])
  @@map("meetings")
}
```

---

### 7.3. Component Architecture & UI Elements

```
frontend/src/
├── components/
│   ├── meetings/
│   │   ├── ScheduleMeetingModal.jsx   # Meeting creation with duration presets & recurrence
│   │   ├── MeetingChatCard.jsx        # Interactive rich card embedded in channel messages
│   │   ├── InChannelLiveBanner.jsx    # "Call in progress" persistent channel header
│   │   └── InCallChatDrawer.jsx       # Collapsible side chat & code snippet drawer
│   └── VideoMeetingModal.jsx          # Existing Jitsi WebRTC modal (enhanced with room routing)
```

---

### 7.4. Implementation Steps for Tomorrow (Phase 2)

#### Step 1: Meeting Model & API Routes
- Add `Meeting` model to `schema.prisma` and run `prisma generate`.
- Create `backend/src/modules/meetings/`:
  - `POST /api/projects/:id/meetings`: Schedule meeting & emit `meeting:scheduled`.
  - `GET /api/projects/:id/meetings`: List upcoming & past meetings.
  - `DELETE /api/projects/:id/meetings/:meetingId`: Cancel meeting.

#### Step 2: Schedule Meeting Modal (`ScheduleMeetingModal.jsx`)
- Quick duration presets: `[ 15 min ]` (Standup) | `[ 30 min ]` | `[ 45 min ]` | `[ 1 hour ]`.
- Recurrence selector: `Does not repeat` | `Daily (Weekdays)` | `Weekly`.
- Target channel dropdown (auto-fills current channel).

#### Step 3: Interactive In-Channel Meeting Cards (`MeetingChatCard.jsx`)
- When a meeting is created, seed a system message with `type: "MEETING"` in `messages` table.
- Renders an interactive glassmorphic card in `Chat.jsx` with date/time, attendee avatars, and live "Join Call" button.

#### Step 4: Meeting Action Item to Task Converter
- Inside meeting notes, add a `+ Turn into Task` shortcut that pre-populates the Task Creation modal on the active sprint.

#### Step 5: Calendar Sync in `Board.jsx`
- Merge `meetings` array into `calendarDate` days in `Board.jsx:563` so meetings display in purple badges alongside task deadline pills.

