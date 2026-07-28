# DevPilot — Project Documentation

**Intelligent Software Project Management System with GitHub Activity Analysis and Bug Prediction**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Objectives](#2-core-objectives)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Module 1 — Authentication & Authorization](#5-module-1--authentication--authorization)
6. [Module 2 — User Management](#6-module-2--user-management)
7. [Module 3 — Project Management](#7-module-3--project-management)
8. [Module 4 — Sprint Management](#8-module-4--sprint-management)
9. [Module 5 — Task Management](#9-module-5--task-management)
10. [Module 6 — GitHub Integration](#10-module-6--github-integration)
11. [Module 7 — Automated Task Tracking](#11-module-7--automated-task-tracking)
12. [Module 8 — Bug Prediction (Machine Learning)](#12-module-8--bug-prediction-machine-learning)
13. [Module 9 — Analytics & Reporting](#13-module-9--analytics--reporting)
14. [Module 10 — Communication & Collaboration](#14-module-10--communication--collaboration)
15. [Real-Time System](#15-real-time-system)
16. [Database Design](#16-database-design)
17. [API Design](#17-api-design)
18. [Security Design](#18-security-design)
19. [Deployment Architecture](#19-deployment-architecture)
20. [Project Folder Structure](#20-project-folder-structure)

---

## 1. Project Overview

DevPilot is a full-stack, AI-powered software project management platform designed specifically for software development teams. It combines the collaborative task management experience of tools like ClickUp and Notion with deep GitHub integration and a machine learning engine that predicts which parts of a codebase are most likely to contain bugs.

The platform is built to address a real gap in the market: most project management tools are generic and disconnected from the actual development workflow happening in version control systems. DevPilot bridges that gap by automatically synchronising GitHub activity directly into the project workspace — commits update task statuses, pull requests are tracked in real time, and contributor patterns feed a machine learning model that continuously assesses code risk.

The system supports four distinct user roles — Admin, Manager, Developer, and QA Tester — each with appropriate levels of access to project data, settings, and analytics. Teams can plan sprints, manage Kanban boards, chat in real time, run video meetings, and view detailed reports, all within one unified workspace.

---

## 2. Core Objectives

### Primary Goals

**Unified Workspace.** Eliminate the context-switching penalty by combining project planning, task tracking, GitHub activity, team communication, and analytics into one platform. Developers should not need to switch between Jira, GitHub, Slack, and Google Meet to do their daily work.

**Automatic Development Activity Sync.** When a developer commits code with a task reference in the commit message (e.g. `#TASK-21 Fixed login validation`), the platform automatically detects the reference, moves the task to the "In Review" state, and logs the commit against the task — without any manual input from the developer.

**Machine Learning Bug Risk Assessment.** By analysing commit frequency, code churn, contributor diversity, pull request activity, and historical bug-fix patterns per file, the ML system predicts which source files carry the highest risk of containing defects. This gives teams early warning before bugs reach production.

**Real-Time Collaboration.** All activity — task status changes, new comments, GitHub pushes, chat messages — propagates instantly to all connected team members through a WebSocket system, keeping every team member's view of the project current without page refreshes.

**Research and Academic Value.** The ML module is designed with academic rigour: two models (XGBoost and Random Forest) are trained and evaluated side-by-side, with a full classification report (Accuracy, Precision, Recall, F1-Score per risk class, Confusion Matrix) generated to support research documentation and project viva presentations.

### Secondary Goals

- Reduce manual project status update overhead through GitHub automation
- Provide data-driven sprint retrospectives through built-in analytics
- Support agile methodologies (Scrum sprints, Kanban boards, backlog management)
- Maintain a full immutable audit trail of all project activity
- Deliver a production-grade, deployable application using free-tier cloud services

---

## 3. System Architecture

DevPilot follows a three-service architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│         React.js SPA (Vercel)                           │
│   Dashboard · Kanban · Analytics · Chat · Bug Risk      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS + WSS
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND LAYER                         │
│           Node.js + Express.js (Render)                 │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Auth   │ │ Projects │ │  Tasks   │ │  GitHub   │  │
│  │  Service │ │  Service │ │  Service │ │  Service  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Sprints  │ │  Users   │ │   Chat   │ │    ML     │  │
│  │  Service │ │  Service │ │  Service │ │  Bridge   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                                                         │
│          Socket.IO (/project namespace)                 │
└──────┬───────────────────────────┬───────────────────────┘
       │ Prisma ORM                │ HTTP
┌──────▼───────┐          ┌────────▼───────────────────────┐
│  PostgreSQL  │          │     ML SERVICE LAYER           │
│  (Neon Tech) │          │   Python + FastAPI (Render)    │
│              │          │                                │
│  12 tables   │          │  XGBoost Classifier (primary)  │
│  UUID PKs    │          │  Random Forest (baseline)      │
│  JSON fields │          │  /predict  /predict/batch      │
│  Indexes     │          │  /health                       │
└──────────────┘          └────────────────────────────────┘
```

### Data Flow — GitHub to Task Update

```
Developer pushes commit
        │
        ▼
GitHub sends webhook POST to /api/webhooks/github
        │
        ▼
HMAC-SHA256 signature verified against repo's stored secret
        │
        ▼
Commit message parsed for #TASK-xx references
        │
        ▼
Matching task found in DB → status set to IN_REVIEW
        │
        ▼
Commit record stored and linked to task
        │
        ▼
Socket.IO emits task:updated to all project room members
        │
        ▼
Activity log entry created
```

### Data Flow — Bug Prediction

```
Manager triggers prediction for a repository
        │
        ▼
ML Bridge queries DB: commits, PRs, file paths
        │
        ▼
Feature extraction: commit_frequency, code_churn,
num_contributors, pr_count, bug_fix_ratio per file
        │
        ▼
HTTP POST to Python FastAPI /predict/batch
        │
        ▼
XGBoost model returns: risk_level, confidence, risk_score
Random Forest model returns: risk_level, confidence (comparison)
        │
        ▼
Results stored in prediction_results table
        │
        ▼
Socket.IO emits ml:batch_prediction to project room
        │
        ▼
Frontend displays ranked bug risk dashboard
```

---

## 4. Technology Stack

### Backend

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 18+ | Server-side JavaScript |
| Framework | Express.js 4 | HTTP routing and middleware |
| ORM | Prisma 5 | Type-safe database access and migrations |
| Database | PostgreSQL (Neon Tech) | Primary data store — cloud-hosted, serverless |
| Real-time | Socket.IO 4 | WebSocket server with room-based namespaces |
| Authentication | Passport.js | Google OAuth and GitHub OAuth strategies |
| Tokens | JSON Web Tokens (JWT) | Stateless auth — access tokens (15m) + refresh tokens (7d) |
| Validation | Zod | Schema validation for all request bodies |
| Logging | Winston | Structured logging — console (dev) + JSON files (prod) |
| HTTP Client | Axios | ML service bridge HTTP calls |
| GitHub API | Octokit REST | Repository management and webhook registration |

### ML Service

| Layer | Technology | Purpose |
|---|---|---|
| Framework | FastAPI | Python REST API for model serving |
| Server | Uvicorn | ASGI server for FastAPI |
| Primary Model | XGBoost | Gradient boosted trees — highest F1 on structured data |
| Baseline Model | Random Forest | Ensemble baseline for comparison |
| Data Processing | Pandas, NumPy | Feature matrix construction |
| ML Library | Scikit-learn | Training pipeline, cross-validation, evaluation |
| Validation | Pydantic | Request/response schema enforcement |

### Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React.js 18 | Component-based SPA |
| Build Tool | Vite | Fast dev server and optimised production builds |
| State | Zustand | Lightweight global state management |
| Routing | React Router v6 | Client-side navigation |
| HTTP | Axios | API calls with JWT interceptor |
| WebSocket | socket.io-client | Real-time event subscription |
| Charts | Recharts | Dashboard analytics visualisations |
| Drag & Drop | @hello-pangea/dnd | Kanban board drag-and-drop |
| Video/Voice | ZegoCloud UIKit | One-to-one and group video/audio calls |
| Styling | Tailwind CSS | Utility-first responsive design |

### DevOps & Tooling

| Tool | Purpose |
|---|---|
| GitHub | Version control, CI trigger |
| Vercel | Frontend deployment |
| Render | Backend (Node.js) + ML service (Python) deployment |
| Neon Tech | Serverless PostgreSQL — free tier with 0.5 GB storage |
| Postman | API testing and documentation |
| Prisma Studio | Visual database browser during development |
| VS Code | Primary IDE |

---

## 5. Module 1 — Authentication & Authorization

### Overview

The authentication system supports two OAuth providers (Google and GitHub) and issues short-lived JWT access tokens with longer-lived refresh tokens. All tokens are stored in `httpOnly` cookies — not in localStorage — which prevents XSS token theft.

### OAuth Flows

**Google OAuth** is implemented using `passport-google-oauth20`. The user clicks "Login with Google", is redirected to Google's consent screen, and is returned to the callback URL with a profile containing their name, email, and avatar. The system performs an `upsert` on the Users table — either creating a new account or updating the existing one — using `googleId` as the unique identifier.

**GitHub OAuth** is implemented using `passport-github2` with the scopes `user:email` and `repo`. In addition to profile data, the GitHub access token is stored (encrypted) against the user record. This token is later used by Octokit to register webhooks and fetch repository data on the user's behalf.

### JWT Token Strategy

Access tokens expire after 15 minutes to limit the window of exposure if intercepted. Refresh tokens expire after 7 days. Both are stored in `httpOnly`, `sameSite: strict`, `secure: true` (in production) cookies. When an access token expires, the frontend automatically calls `POST /api/auth/refresh` using the refresh cookie to obtain a new pair without requiring the user to log in again.

The token payload contains three fields only: `{ id, email, role }`. The `role` field is used by the RBAC middleware on every protected route.

### Role-Based Access Control (RBAC)

Four roles exist at the system level:

**ADMIN** — Full access to all endpoints. Can list all users, change any user's role, delete projects, and access all analytics. Typically the system owner or technical lead.

**MANAGER** — Can create projects, manage project members, create and complete sprints, and access full project analytics. Cannot change system-level user roles.

**DEVELOPER** — Can create and update tasks, post comments, link repositories, and view analytics. Cannot delete projects or manage team members.

**QA_TESTER** — Can view all project data, update task statuses (particularly to mark items as tested or blocked), and post comments. Read-heavy role focused on quality verification.

In addition to system roles, each user has a per-project role stored in the `ProjectMember` table (`MANAGER`, `DEVELOPER`, `QA_TESTER`, `VIEWER`). This allows, for example, a system-level DEVELOPER to act as MANAGER within a specific project they own.

### Security Details

- Webhook payloads from GitHub are verified using HMAC-SHA256 (`X-Hub-Signature-256` header) before any processing occurs. This prevents spoofed webhook attacks.
- Rate limiting is applied to all `/api` routes: 100 requests per 15 minutes per IP.
- The global error handler never exposes stack traces in production responses.
- `helmet.js` sets secure HTTP headers on every response (CSP, HSTS, X-Frame-Options, etc.).

---

## 6. Module 2 — User Management

### Overview

User management handles profile information, user search (used when adding members to projects), role administration, and per-user statistics.

### User Profile

Every user has a `name`, `email`, `avatar` (URL), and a system `role`. Avatar URLs default to a generated avatar via DiceBear API. Users can update their name and avatar URL through the `PATCH /api/users/me` endpoint.

### User Search

The `GET /api/users/search?q=<query>` endpoint allows authenticated users to search for colleagues by name or email. This is the primary mechanism for adding members to a project — the manager searches for a user, selects them, and assigns them a project role.

### User Statistics

The `GET /api/users/me/stats` endpoint returns a personal summary:
- Total tasks assigned
- Tasks completed
- Completion rate (as a percentage)
- Number of comments posted
- Number of projects the user belongs to

These statistics are computed directly from DB aggregations on every request — no caching — which keeps them always current.

### Role Administration

Only ADMINs can change a user's system-level role via `PATCH /api/users/:id/role`. ADMINs cannot change their own role (preventing accidental self-demotion).

---

## 7. Module 3 — Project Management

### Overview

Projects are the top-level container for all work in DevPilot. A project contains members, sprints, tasks, repositories, messages, analytics, and activity logs. Everything else in the system is scoped to a project.

### Project Lifecycle

Projects move through a defined status progression: `PLANNING → ACTIVE → ON_HOLD → COMPLETED` (or `CANCELLED` at any point). The status is manually set by the project owner or manager and reflects the overall state of the work.

### Progress Calculation

Project progress is not a simple count of completed tasks — it uses a weighted formula that accounts for task priority:

```
Weight: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1

Progress = (Sum of weights of COMPLETED tasks) /
           (Sum of weights of ALL tasks) × 100
```

This means completing a CRITICAL task contributes four times as much to the progress percentage as completing a LOW task, giving a more meaningful representation of how much meaningful work has been done.

### Project Dashboard Metrics

The project dashboard aggregates six key metrics:
- Total tasks and breakdown by status (TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, BLOCKED)
- Active sprint name and its completion percentage
- Commit trend — number of commits per day over the last 30 days
- Recent activity feed — last 20 project events (task changes, commits, member additions)
- Bug risk summary — count of files at each risk level (LOW, MEDIUM, HIGH, CRITICAL)

### Team Membership

Each project has an owner (who is automatically added as MANAGER) and a list of members. Members are added by ADMIN or MANAGER role holders. Removing a member does not delete their tasks — tasks remain assigned but can be reassigned. The project owner cannot be removed from the project membership.

---

## 8. Module 4 — Sprint Management

### Overview

Sprints implement the Scrum agile methodology. A sprint is a fixed-duration work period (typically 1–4 weeks) containing a subset of the project's tasks. DevPilot enforces the rule that only one sprint can be ACTIVE per project at any time.

### Sprint Lifecycle

Sprints progress through four states: `PLANNED → ACTIVE → COMPLETED` (or `CANCELLED`). A sprint is planned in advance with a name, goal, start date, and end date. When the team is ready to begin, the sprint is activated. At the end of the sprint period, the manager runs the "Complete Sprint" action.

### Sprint Completion

When a sprint is completed, two things happen automatically:

1. All tasks with status COMPLETED remain as completed.
2. All tasks that are still in progress (TODO, IN_PROGRESS, IN_REVIEW, BLOCKED) are moved to the project backlog — their `sprintId` is set to null. They are not deleted.

The completion response includes a count of how many tasks were moved to backlog, which is useful for sprint retrospective discussions ("we moved 4 unfinished tasks to backlog — why?").

### Backlog

The backlog is the collection of all tasks in a project that are not assigned to any sprint (`sprintId = null`). Tasks can be moved from the backlog into an existing sprint via the `POST /api/projects/:id/sprints/:sprintId/tasks` endpoint, which accepts an array of task IDs. This supports the sprint planning ceremony where the team selects which backlog items to include in the upcoming sprint.

### Sprint Completion Statistics

For each sprint, the system computes:
- Total tasks in sprint
- Completed tasks count
- Completion percentage
- Breakdown by status and priority
- Per-assignee completed vs total tasks (useful for sprint retrospective)

---

## 9. Module 5 — Task Management

### Overview

Tasks are the fundamental unit of work in DevPilot. Every task belongs to a project and optionally to a sprint. Tasks support a full lifecycle from creation through completion, with comments, commit linkage, and activity history.

### Task Properties

Each task has: a title and description, a priority level (LOW, MEDIUM, HIGH, CRITICAL), a status, a reporter (who created it), an optional assignee, an optional due date, a sprint assignment, and a floating-point `orderIndex` that determines its position on the Kanban board.

### Task Status Flow

```
TODO → IN_PROGRESS → IN_REVIEW → COMPLETED
              ↕
           BLOCKED
```

Tasks can move freely between states. The `BLOCKED` status indicates a task that cannot proceed due to an external dependency. Moving a task to BLOCKED does not remove it from its sprint — it remains visible on the Kanban board with a visual indicator.

Status changes are automatically logged to the activity log with the previous and new status, enabling a full audit trail of how each task progressed.

### Kanban Board

The Kanban board displays tasks in five columns, one per status. Within each column, tasks are ordered by their `orderIndex` floating-point value. When a developer drags a task to a new position (within a column or to a different column), the frontend sends a `PATCH /api/projects/:id/tasks/reorder` request with an array of `{ id, orderIndex }` updates. The backend applies all updates in a single Prisma transaction.

The floating-point gap strategy (1000, 2000, 3000...) means that inserting a task between positions 2000 and 3000 assigns it 2500 — no need to re-number the entire list. This makes reorders extremely fast.

### Task Comments

Every task has a comment thread. Comments are ordered chronologically and include the commenter's name and avatar. Comments are linked to both the task and the user, and are cascade-deleted if the task is deleted.

### Drag-and-Drop Persistence

The `@hello-pangea/dnd` library manages the drag interaction on the frontend. On `onDragEnd`, the handler determines if the task moved to a different column (status change) or just reordered within the same column (orderIndex change only), constructs the minimal update payload, and sends it to the API. A Socket.IO event (`task:reordered`) is emitted to the project room so all connected team members see the board update in real time without a page refresh.

### Task Editing Collaboration

When a user opens a task detail panel, a `task:editing` WebSocket event is broadcast to other project members, who see a visual indicator that the task is being edited. When the user closes or saves the task, a `task:editing_done` event clears the indicator. This prevents two people from overwriting each other's edits.

---

## 10. Module 6 — GitHub Integration

### Overview

The GitHub integration module connects repositories to projects, registers webhooks, and continuously syncs repository activity into the DevPilot database. The integration is built on the GitHub REST API via the Octokit SDK and GitHub's webhook delivery system.

### Repository Linking

A project manager links a GitHub repository by providing the `owner/repo` string (e.g. `devpilot-team/devpilot`). The system:

1. Uses the logged-in user's stored GitHub OAuth token to fetch repository metadata from the GitHub API.
2. Generates a random 32-byte HMAC secret for this specific repository.
3. Registers a webhook on GitHub pointing to `/api/webhooks/github` with the events `push`, `pull_request`, and `issues` enabled.
4. Stores the repository record (including the webhook secret) in the `repositories` table.

Multiple repositories can be linked to a single project — useful for microservice architectures where multiple repos contribute to one product.

### Commit Tracking

Every push event from GitHub delivers a payload containing an array of commit objects. For each commit, DevPilot:

- Extracts the SHA, message, author name, timestamp, and list of modified files.
- Performs an `upsert` using `(repoId, sha)` as the unique key — this makes commit ingestion idempotent, so GitHub retry deliveries do not create duplicate records.
- Stores the list of modified files as a JSON array in the `filesChanged` column (used later by the ML feature extractor).

### Pull Request Tracking

PR events (`opened`, `closed`, `merged`, `synchronize`) update a `PullRequest` record in the database. The `state` column reflects the current state: `OPEN`, `CLOSED`, or `MERGED`. The `mergedAt` timestamp is recorded for MERGED PRs. Like commits, PR upserts use `(repoId, githubPrNumber)` as the unique key.

### Branch and Contributor Monitoring

The Octokit integration allows fetching branch information and contributor statistics directly from the GitHub API on demand. These are not stored in a dedicated table (to avoid stale data) but are fetched live and presented in the GitHub Activity page.

### Webhook Security

Every incoming webhook request is verified before any processing occurs. The `verifyGitHubWebhook` middleware:

1. Reads the `X-Hub-Signature-256` header.
2. Looks up the Repository record using the `repository.id` field from the payload.
3. Computes HMAC-SHA256 of the raw request body using that repository's stored `webhookSecret`.
4. Uses `crypto.timingSafeEqual` to compare the computed signature against the header value — timing-safe comparison prevents timing attacks.

If verification fails, the request returns 401 and no processing occurs. Because Express is configured with `express.raw()` on the webhook route (before `express.json()`), the raw bytes are preserved for accurate HMAC computation.

---

## 11. Module 7 — Automated Task Tracking

### Overview

This module provides the automated bridge between GitHub commit activity and DevPilot task states. It eliminates the need for developers to manually update task statuses after committing code.

### Commit Convention

Developers reference tasks in commit messages using the format `#TASK-N` where N is any number:

```
#TASK-21 Fixed login validation on email field
#TASK-5 #TASK-6 Resolved redirect bug after OAuth callback  
feat: #TASK-33 Add rate limiting to auth endpoints
```

Multiple task references in a single commit message are supported. All referenced tasks will be updated.

### Parsing Logic

The commit message parser uses the regular expression `/#?(TASK-\d+)/gi` applied to the full commit message string. Results are deduplicated (the same task ID appearing twice in one message is only processed once). The parser is case-insensitive — `#task-21` and `#TASK-21` are treated identically.

### Automatic Status Transition

When a task reference is successfully resolved to a task in the database:

- If the task is in `TODO` or `IN_PROGRESS`, it is automatically moved to `IN_REVIEW`.
- If the task is already `IN_REVIEW` or `COMPLETED`, it is left unchanged (no regression).
- A `COMMIT_LINKED` activity log entry is created containing the commit SHA and message.
- The commit record's `taskId` field is updated to link the commit to the task.
- A `task:updated` Socket.IO event is emitted to the project room, so all team members see the status change in real time.

### Edge Case Handling

**Missing task IDs:** Commits without any task reference are stored as orphan commits (no `taskId`). They still appear in the repository activity feed.

**Invalid references:** If a commit contains `#TASK-999` but no task with that title pattern exists in the project, a warning is logged and processing continues with the next commit.

**Multiple references:** Each reference is processed independently in sequence. If two referenced tasks exist, both are moved to IN_REVIEW and both get activity log entries.

**Bug fix detection:** The parser also flags commits whose messages contain bug-fix keywords (`fix`, `bug`, `patch`, `hotfix`, `resolve`, etc.). This flag is used by the ML feature extractor to compute the `bug_fix_ratio` feature for each file.

---

## 12. Module 8 — Bug Prediction (Machine Learning)

### Overview

The bug prediction system is a Python-based machine learning service that analyses development activity patterns to predict which source files in a repository carry the highest risk of containing defects. It uses an XGBoost classifier as the primary model and Random Forest as a comparison baseline.

### Why These Algorithms

**XGBoost** (Extreme Gradient Boosting) was selected as the primary model because it consistently achieves top-tier performance on structured, tabular datasets with the kind of features available from version control history. It handles class imbalance well, supports feature importance analysis (useful for explaining predictions), and trains quickly on datasets of this size.

**Random Forest** is included as a comparison baseline because it is widely used in software defect prediction research, making it appropriate for academic benchmarking. Including both models means the project can report a model comparison table in its research documentation.

### Feature Engineering

Five features are computed per source file:

**commit_frequency** — The number of commits touching this file per week over the last 30 days. Files with high commit frequency are changing rapidly, which correlates with defect introduction.

**code_churn** — The total number of lines added plus lines deleted across all commits touching this file. High churn indicates the file's logic is unstable or frequently refactored.

**num_contributors** — The number of distinct authors who have committed changes to this file. Files touched by many contributors have a higher risk of integration bugs and misunderstood interfaces.

**pr_count** — The number of pull requests that included this file. This captures the volume of reviewed changes and is a proxy for how contentious or complex the file's logic is.

**bug_fix_ratio** — The proportion of all commits touching this file whose messages contain bug-fix keywords. A file where 40% of commits are bug fixes is inherently more defect-prone than one where only 5% are.

### Risk Classification

The model outputs one of four risk classes:

| Risk Level | Meaning | Recommended Action |
|---|---|---|
| LOW | File is stable and rarely touched | Routine code review is sufficient |
| MEDIUM | Moderate churn detected | Ensure unit tests cover recent changes |
| HIGH | High activity and bug history | Prioritise thorough review, add integration tests |
| CRITICAL | Extremely bug-prone pattern | Refactor recommended; do not merge without full review |

### Model Comparison Output

After both models produce a prediction for a file, the API response includes a `model_comparison` object:

```json
{
  "xgboost_risk": "HIGH",
  "xgboost_confidence": 0.83,
  "rf_risk": "HIGH",
  "rf_confidence": 0.76,
  "agreement": true
}
```

When the two models disagree on a file's risk level, the dashboard highlights the disagreement — these files warrant particular attention.

### Training Pipeline

The training pipeline (`train.py`) supports two data sources:

**PROMISE Repository Datasets** — Public defect datasets (KC1, KC2, CM1, Eclipse, Mozilla) that contain file-level defect labels. These are the gold standard for software defect prediction research and provide a realistic training set before the team's own project data accumulates.

**Synthetic Dataset** — If no CSV is present in the `training/dataset/` directory, a 1,000-sample synthetic dataset is generated with realistic distributions that mirror real defect data patterns. This ensures the service is always trainable for demonstration purposes.

The training uses 5-fold stratified cross-validation before the final model fit, and splits 20% of data as a held-out test set. Both models are saved as `.pkl` files in the `models/` directory.

### Evaluation Report

The `evaluate.py` script generates a full academic-standard evaluation:

- Per-class Precision, Recall, F1-Score for all four risk classes
- Overall Accuracy and weighted F1-Score for each model
- Confusion Matrix showing true vs predicted labels
- Summary comparison table highlighting which model outperforms the other and by how much on weighted F1

This output is designed to be directly usable in a research paper or academic project report.

### Batch Prediction

The batch prediction endpoint (`POST /predict/batch`) accepts up to 50 files in a single request and returns predictions for all of them, along with a summary count of files at each risk level. This is used when the manager triggers a full repository scan from the DevPilot dashboard.

### Result Persistence

Every prediction result is stored in the `prediction_results` table with the raw feature values alongside the prediction. This serves two purposes: the dashboard can display historical predictions without re-running the model, and the stored feature values can be used to retrain the model with real-world labelled data over time.

---

## 13. Module 9 — Analytics & Reporting

### Overview

The analytics module provides data-driven visibility into project health, sprint performance, developer activity, and code risk — all computed from data already stored in the DevPilot database.

### Project Dashboard Analytics

The project dashboard aggregates five data groups in a single API call:

**Task Distribution by Status** — A grouped count of tasks in each status (TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, BLOCKED). Displayed as a pie chart on the frontend. Provides an immediate snapshot of whether work is flowing through the pipeline or accumulating in a bottleneck state.

**Active Sprint Completion** — The name, goal, total task count, completed task count, and completion percentage for the currently active sprint. Displayed as a progress bar.

**Commit Trend (30-day)** — A time-series of commit counts aggregated by day over the last 30 days. Computed using a raw PostgreSQL `DATE_TRUNC` query for efficiency. Displayed as a bar chart showing development velocity.

**Recent Activity Feed** — The last 20 activity log entries with user name and avatar, action type, and metadata. Displays as a chronological event stream showing what has happened in the project recently.

**Bug Risk Summary** — Count of files at each risk level (LOW, MEDIUM, HIGH, CRITICAL) from the most recent prediction run. A quick visual indicator of code health.

### Sprint Report

The sprint report for any historical sprint provides:
- Task breakdown by status (how many finished, how many blocked)
- Task breakdown by priority (were critical items addressed?)
- Per-assignee performance: total tasks assigned vs completed for that sprint
- Timeline of when tasks were completed during the sprint

This supports the sprint retrospective ceremony with quantitative data.

### Bug Risk Analytics

A ranked list of all files in a repository ordered by risk level (CRITICAL first) and confidence score. Each row shows the file path, risk level, confidence percentage, the raw feature values that drove the prediction, and the recommendation text from the ML model.

### Visualisation Types

| Chart | Data | Library |
|---|---|---|
| Task status distribution | Pie/Donut | Recharts PieChart |
| Sprint progress | Progress bar | Recharts ProgressBar |
| Commit frequency (30d) | Bar chart | Recharts BarChart |
| Bug risk per file | Horizontal bar | Recharts BarChart |
| Sprint burndown | Area chart | Recharts AreaChart |
| Contributor activity | Radar chart | Recharts RadarChart |

---

## 14. Module 10 — Communication & Collaboration

### Overview

The communication module provides real-time text messaging within project workspaces and video/voice calling through the ZegoCloud SDK. It is designed to reduce the need for external tools like Slack or Teams for project-internal communication.

### Team Chat (Group Messaging)

Every project has a group chat channel. All messages sent to the group channel are stored in the `messages` table with `isGroup = true` and `receiverId = null`. Messages are delivered in real time to all connected project members through Socket.IO's room broadcast system.

The group channel supports infinite scroll pagination — the initial load fetches the most recent 50 messages, and older messages are loaded on demand using a cursor-based pagination approach (passing the ID of the oldest loaded message as a cursor).

### Direct Messaging

Team members can send private messages to each other within the project context. DMs are stored with `isGroup = false` and a specific `receiverId`. They are delivered via a targeted Socket.IO event to the specific recipient's connected socket, while also being stored persistently in the database for message history.

### Typing Indicators

When a user begins typing in the chat input, a `chat:typing` WebSocket event is broadcast to the rest of the project room with the user's ID and a boolean flag. The frontend displays a "User X is typing..." indicator. The event is also sent when typing stops, clearing the indicator. This is entirely ephemeral — typing indicators are not stored in the database.

### File Sharing

Messages in the communication module support file attachment metadata. When a team member shares a file, the file URL is embedded in the message content. File storage itself is handled by an external provider (e.g. Cloudinary or S3 pre-signed URLs) — DevPilot stores the resulting URL.

### Video and Voice Calling (ZegoCloud)

Video and voice calling is integrated through the ZegoCloud UIKit for React. ZegoCloud handles all WebRTC complexity — signalling, STUN/TURN, codec negotiation — so DevPilot only needs to generate a room token on the backend and pass it to the frontend.

Call types supported:
- **One-to-one calls** — Direct video or audio call between two team members
- **Group calls** — Multi-participant video meetings for sprint ceremonies, standups, or retrospectives
- **Meeting rooms** — Persistent rooms that any project member can join

The ZegoCloud App ID and server secret are stored as environment variables. Meeting room IDs are derived from the project UUID, ensuring each project has a dedicated, persistent meeting room URL.

---

## 15. Real-Time System

### Architecture

Real-time features are built on Socket.IO 4 using a single `/project` namespace. When a user opens a project workspace on the frontend, their socket client emits a `join_project` event with the project UUID. The backend adds that socket to a Socket.IO room keyed by the project UUID. All real-time events are then broadcast to the room — not to all connected users — ensuring each user only receives events relevant to their current project.

### Authentication Guard

Every socket connection in the `/project` namespace is authenticated by a JWT middleware applied at the namespace level. The client sends the access token in the `socket.handshake.auth.token` field during the initial WebSocket handshake. If the token is missing or invalid, the connection is rejected before any room events can be processed.

### Event Catalogue

| Event Name | Direction | Trigger |
|---|---|---|
| `task:created` | Server → Client | New task created via REST API |
| `task:updated` | Server → Client | Task status, assignee, or field changed |
| `task:deleted` | Server → Client | Task deleted |
| `task:reordered` | Server → Client | Kanban drag-and-drop reorder |
| `task:comment_added` | Server → Client | New comment posted on a task |
| `task:editing` | Client → All others | User opened a task edit panel |
| `task:editing_done` | Client → All others | User closed or saved the task edit panel |
| `sprint:created` | Server → Client | New sprint created |
| `sprint:updated` | Server → Client | Sprint details or status changed |
| `sprint:completed` | Server → Client | Sprint marked as complete |
| `project:updated` | Server → Client | Project name, status, or settings changed |
| `project:member_added` | Server → Client | New member added to project |
| `project:member_removed` | Server → Client | Member removed from project |
| `github:commit` | Server → Client | GitHub push event processed |
| `github:pull_request` | Server → Client | PR opened, merged, or closed |
| `chat:message` | Bidirectional | New chat message (group or DM) |
| `chat:typing` | Client → Others | Typing started or stopped |
| `ml:prediction` | Server → Client | Single file prediction complete |
| `ml:batch_prediction` | Server → Client | Full repository batch prediction complete |
| `user:offline` | Server → Client | A project member disconnected |

### Graceful Degradation

If a client loses its WebSocket connection (network interruption, mobile background), Socket.IO automatically attempts reconnection with exponential backoff. During the disconnected period, the client falls back to REST API polling (if implemented) or simply shows a "reconnecting..." banner. All state changes that occurred while disconnected are visible when the client refreshes the data after reconnecting.

---

## 16. Database Design

### Design Principles

- All primary keys are UUIDs (`@default(uuid())`) — no sequential integers exposed in URLs
- Every many-to-one relation has an explicit `onDelete` behaviour (Cascade, SetNull, or Restrict)
- Composite indexes on the most common query patterns (project + status, sprint + status)
- JSON columns used for flexible data (filesChanged on Commit, metadata on ActivityLog)
- Immutable tables (ActivityLog) have no `updatedAt` field by design

### Entity Summary

| Table | Rows (typical) | Key Indexes |
|---|---|---|
| users | Hundreds | email, githubId, googleId |
| projects | Dozens | ownerId, status |
| project_members | project × members | projectId, userId, unique(projectId+userId) |
| sprints | 10–50 per project | projectId, status, startDate+endDate |
| tasks | Hundreds per project | projectId+status (composite), sprintId+status (composite), assigneeId |
| task_comments | Thousands | taskId, userId |
| repositories | 1–10 per project | projectId, githubRepoId (unique) |
| commits | Thousands per repo | repoId, taskId, committedAt, unique(repoId+sha) |
| pull_requests | Hundreds per repo | repoId, state, unique(repoId+githubPrNumber) |
| messages | Thousands per project | projectId, senderId, projectId+isGroup (composite) |
| prediction_results | 50 per scan run | repoId, riskLevel, repoId+filePath (composite) |
| activity_logs | One per event | projectId, userId, entityType+entityId (composite), createdAt |

### Cascade Delete Strategy

When a project is deleted, everything owned by it cascades: members, sprints, tasks, repositories, messages, activity logs, commits, PRs, and prediction results. This is intentional — a deleted project removes all its data cleanly.

When a user is deleted: tasks they reported are blocked by a `Restrict` constraint (must reassign reporter first). Tasks they were assigned to have their `assigneeId` set to null (`SetNull`). Comments they wrote are cascade-deleted. Messages they sent are cascade-deleted.

When a sprint is deleted: tasks in the sprint have their `sprintId` set to null (moved to backlog) — they are not deleted. This is handled explicitly in the service layer before the sprint delete operation.

---

## 17. API Design

### Design Philosophy

All endpoints return a consistent response envelope:

```json
{
  "success": true | false,
  "message": "Human-readable status",
  "data": { ... }
}
```

Errors include an `errors` array for validation failures:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "endDate", "message": "endDate must be after startDate" }
  ]
}
```

### Core Endpoint Groups

| Group | Base Path | Key Operations |
|---|---|---|
| Auth | `/api/auth` | OAuth callbacks, refresh, logout, me |
| Users | `/api/users` | Profile, search, stats, role change |
| Projects | `/api/projects` | CRUD, members, progress |
| Sprints | `/api/projects/:id/sprints` | CRUD, complete, backlog, move tasks |
| Tasks | `/api/projects/:id/tasks` | CRUD, reorder, comments |
| GitHub | `/api/webhooks` + `/api` | Webhook receiver, link repo, commits, PRs |
| Analytics | `/api/projects/:id/analytics` | Dashboard, sprint report, bug risk |
| ML | `/api/repos` + `/api/ml` | Predict file, batch predict, history, health |
| Messages | `/api/projects/:id/messages` | Group messages, DMs |
| Health | `/health` + `/health/db` | Liveness and DB readiness probes |

### Pagination

List endpoints that may return large result sets use cursor-based pagination via a `cursor` query parameter (the ID of the last item seen) rather than page-number pagination. This is more efficient for append-heavy datasets like messages and activity logs.

---

## 18. Security Design

### Authentication Security
- JWT access tokens stored in `httpOnly` cookies — inaccessible to JavaScript, immune to XSS
- Refresh tokens stored separately in `httpOnly` cookies with longer expiry
- Tokens are signed with 64-byte random secrets (separate secrets for access and refresh)
- OAuth state parameter used to prevent CSRF attacks during login flow

### API Security
- Helmet.js sets HTTP security headers on every response (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- CORS origin whitelist — only the configured frontend origin is allowed
- Rate limiting: 100 requests per 15 minutes per IP on all `/api` routes
- Request body size limit: 10 MB (prevents large payload attacks)
- Zod schema validation on all POST/PATCH request bodies — unknown fields are stripped

### GitHub Webhook Security
- HMAC-SHA256 signature verification before any webhook payload processing
- Timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing oracle attacks
- Per-repository secrets (not a single shared secret) — compromising one repo's secret doesn't affect others
- Raw body preservation before JSON parsing for accurate HMAC computation

### Data Security
- GitHub access tokens are stored encrypted at the application level before database insertion
- Webhook secrets never appear in API responses — they are write-only from the client perspective
- All DB queries go through Prisma's prepared statement system — no raw string interpolation, immune to SQL injection
- The `SAFE_SELECT` pattern in user queries ensures sensitive fields (githubToken, googleId) never appear in responses

---

## 19. Deployment Architecture

### Services and Platforms

| Service | Platform | Free Tier Limits |
|---|---|---|
| React frontend | Vercel | Unlimited deployments, 100 GB bandwidth/month |
| Node.js backend | Render | 750 hours/month free instance |
| Python ML service | Render | 750 hours/month free instance (separate service) |
| PostgreSQL | Neon Tech | 0.5 GB storage, 10 hours compute/month |

### Neon PostgreSQL Configuration

Neon provides serverless PostgreSQL with two connection strings: a pooled connection (through PgBouncer, for runtime queries) and a direct connection (for Prisma migrations, which are incompatible with PgBouncer's transaction mode). Both are stored as separate environment variables (`DATABASE_URL` and `DIRECT_URL`). SSL mode is required for all connections.

### Environment Variables

The backend requires 18 environment variables grouped into: Database URLs, JWT secrets, Google OAuth credentials, GitHub OAuth credentials, GitHub webhook global secret, ML service URL and key, ZegoCloud credentials, CORS origins, rate limiting parameters, and server port.

### GitHub Webhook Registration

For local development, a tool like `ngrok` or `smee.io` is used to expose the local server to the internet for GitHub webhook delivery. In production, Render provides a stable HTTPS URL that is registered directly with GitHub.

### Deployment Order

1. Deploy Neon PostgreSQL, run `prisma migrate dev` via `DIRECT_URL`
2. Deploy Python ML service on Render, run `train.py` (or deploy with pre-trained `.pkl` files)
3. Deploy Node.js backend on Render with all environment variables set
4. Deploy React frontend on Vercel with `VITE_API_URL` pointing to the Render backend URL
5. Register GitHub webhooks on each connected repository pointing to the Render backend URL

---

## 20. Project Folder Structure

```
devpilot/
├── backend/
│   ├── server.js                     # Entry point — HTTP + Socket.IO
│   ├── app.js                        # Express setup — all routes mounted
│   ├── package.json
│   ├── .env                          # Never committed to Git
│   ├── .env.example                  # Template with all variable names
│   ├── prisma/
│   │   ├── schema.prisma             # All 12 models defined here
│   │   ├── seed.js                   # Demo data seeder
│   │   └── migrations/               # Auto-generated by prisma migrate
│   └── src/
│       ├── config/
│       │   ├── db.js                 # Prisma client singleton
│       │   ├── passport.js           # Google + GitHub OAuth strategies
│       │   ├── socket.js             # Socket.IO namespace setup
│       │   └── constants.js          # All enums, socket event names
│       ├── middleware/
│       │   ├── auth.middleware.js    # protect() and checkRole()
│       │   ├── rbac.middleware.js    # Role-based access control
│       │   ├── webhook.middleware.js # GitHub HMAC verification
│       │   ├── validate.middleware.js# Zod schema validation
│       │   └── error.middleware.js   # Global error handler
│       ├── utils/
│       │   ├── response.utils.js     # Standardised response helpers
│       │   ├── jwt.utils.js          # Token sign/verify/refresh
│       │   ├── crypto.utils.js       # HMAC verification
│       │   └── logger.js             # Winston logger
│       └── modules/
│           ├── auth/                 # auth.routes/controller/service
│           ├── users/                # user.routes/controller/service/validator
│           ├── projects/             # project.routes/controller/service/validator
│           ├── sprints/              # sprint.routes/controller/service/validator
│           ├── tasks/                # task.routes/controller/service/validator
│           ├── github/               # github.routes/controller/service
│           │   ├── webhook.handler.js
│           │   └── commit.parser.js
│           ├── analytics/            # analytics.routes/service
│           ├── ml/                   # ml.routes/controller/service
│           └── communication/        # message.routes/service + chat.socket.js
│
├── ml-service/
│   ├── main.py                       # FastAPI app entry
│   ├── requirements.txt
│   ├── .env
│   ├── models/
│   │   ├── xgboost_model.pkl         # Trained primary model
│   │   └── random_forest_model.pkl   # Trained baseline model
│   ├── app/
│   │   ├── schemas.py                # Pydantic request/response models
│   │   ├── predictor.py              # Load models, run prediction
│   │   └── feature_extractor.py     # Feature engineering
│   └── training/
│       ├── train.py                  # Train both models, save pkl
│       ├── evaluate.py               # Classification report + comparison
│       └── dataset/                  # Place CSV training data here
│
└── frontend/
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── components/               # Reusable UI components
        ├── pages/                    # One component per route
        ├── hooks/                    # useSocket, useAuth, useKanban
        ├── store/                    # Zustand global state
        ├── api/                      # Axios instances + per-module API files
        └── utils/                    # dateUtils, progressCalc
```

---

*DevPilot is a research and academic capstone project demonstrating the integration of modern full-stack web development with machine learning for software quality prediction.*
