# DevPilot Codebase Audit: Bugs, Security Vulnerabilities & Improvement Roadmap
**Audit Date**: October 20, 2026  
**Audited By**: Antigravity Assistant  
**Target Repository**: DevPilot Full-Stack Workspace (`backend/`, `frontend/`, `ml-service/`)

---

## Table of Contents
1. [Executive Summary & Architecture Context](#1-executive-summary--architecture-context)
2. [Critical & High-Severity Bugs](#2-critical--high-severity-bugs)
   - [2.1 Unique Constraint Violation in GitHub OAuth & PAT Linking (P2002)](#21-unique-constraint-violation-in-github-oauth--pat-linking-p2002)
   - [2.2 Cross-Tenant GitHub Token Leakage (Severe Privacy/Security Breach)](#22-cross-tenant-github-token-leakage-severe-privacysecurity-breach)
   - [2.3 Missing RBAC Authorization on Documents and Nexus AI Routes](#23-missing-rbac-authorization-on-documents-and-nexus-ai-routes)
   - [2.4 OAuth Redirect URI Crash with Multi-Origin CORS Configurations](#24-oauth-redirect-uri-crash-with-multi-origin-cors-configurations)
   - [2.5 Multi-Task Commit Reference Overwrite](#25-multi-task-commit-reference-overwrite)
   - [2.6 Octokit Commit Sync Strips `filesChanged`, Disabling ML Bug Predictions](#26-octokit-commit-sync-strips-fileschanged-disabling-ml-bug-predictions)
   - [2.7 ML Microservice OpenMP Dependency Failure & Missing Model Binaries](#27-ml-microservice-openmp-dependency-failure--missing-model-binaries)
   - [2.8 Potential `TypeError` Crash in Batch Prediction Handler](#28-potential-typeerror-crash-in-batch-prediction-handler)
   - [2.9 Kanban Task Card Editing Lock Never Cleared on Close](#29-kanban-task-card-editing-lock-never-cleared-on-close)
   - [2.10 Chat Channels Isolated in Client `localStorage`](#210-chat-channels-isolated-in-client-localstorage)
   - [2.11 Unrestricted Message Channel Deletion](#211-unrestricted-message-channel-deletion)
   - [2.12 Inconsistent Express Router Parameter Naming](#212-inconsistent-express-router-parameter-naming)
3. [Medium-Severity Bugs & Functional Disconnects](#3-medium-severity-bugs--functional-disconnects)
   - [3.1 Timesheets Feature Is an Unpersisted Client-Side Mock](#31-timesheets-feature-is-an-unpersisted-client-side-mock)
   - [3.2 Missing JWT Refresh Token Strategy](#32-missing-jwt-refresh-token-strategy)
   - [3.3 Default Frontend `.env` Hardcodes Private Tailscale Endpoint](#33-default-frontend-env-hardcodes-private-tailscale-endpoint)
   - [3.4 Commit List Missing Task Relations in Analytics](#34-commit-list-missing-task-relations-in-analytics)
   - [3.5 Base64 PDF Upload Body-Size Limitation](#35-base64-pdf-upload-body-size-limitation)
   - [3.6 Inverted Filter Logic for "Workspace Docs"](#36-inverted-filter-logic-for-workspace-docs)
   - [3.7 Documentation Discrepancies](#37-documentation-discrepancies)
4. [Comprehensive Strategic Improvements](#4-comprehensive-strategic-improvements)
   - [4.1 Database & Architecture Enhancements](#41-database--architecture-enhancements)
   - [4.2 Security, Multi-Tenancy & Auth Hardening](#42-security-multi-tenancy--auth-hardening)
   - [4.3 GitHub Integration & ML Engine Expansion](#43-github-integration--ml-engine-expansion)
   - [4.4 Frontend Performance & UX Polish](#44-frontend-performance--ux-polish)
   - [4.5 DevOps, Containerization & Automated Testing](#45-devops-containerization--automated-testing)

---

## 1. Executive Summary & Architecture Context

**DevPilot** is an intelligent software project management suite designed to connect agile project tracking, version control telemetry (GitHub), real-time collaboration (WebSockets, WebRTC), and machine learning defect prediction.

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT TIER (frontend/)              │
│       React 19 + Vite 8 + Tailwind CSS + Zustand       │
│  Kanban Board · Chat · Analytics · Docs · Nexus AI     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (REST) + WebSockets (/project)
┌───────────────────────────▼────────────────────────────┐
│                  APPLICATION TIER (backend/)           │
│        Node.js + Express 4 + Prisma ORM 5 + Socket.IO  │
│  Auth (OAuth/JWT) · Tasks · Sprints · Webhooks · RAG   │
└─────────────┬────────────────────────────┬─────────────┘
              │ Prisma Client              │ HTTP POST
┌─────────────▼──────────────┐  ┌──────────▼─────────────┐
│      PERSISTENCE TIER      │  │    INTELLIGENCE TIER   │
│   PostgreSQL (Neon Cloud)  │  │      (ml-service/)     │
│   with pgvector extension  │  │   Python 3 + FastAPI   │
│   12 relational models     │  │ XGBoost, RF, CodeBERT  │
└────────────────────────────┘  └────────────────────────┘
```

The system was audited across all services. The findings below document all bugs found, their root causes, and explicit remediation steps.

---

## 2. Critical & High-Severity Bugs

### 2.1 Unique Constraint Violation in GitHub OAuth & PAT Linking (P2002)
- **Impact**: Critical — Any user attempting to link a GitHub account or Personal Access Token (PAT) to an existing profile crashes with an unhandled 500 error.
- **Affected Files**:
  - `backend/src/modules/auth/auth.controller.js` (lines 78–96)
  - `backend/src/config/passport.js` (lines 105–138)
  - `backend/src/modules/github/github.controller.js` (lines 81–87)
- **Root Cause**:
  `githubId` is marked `@unique` in `prisma/schema.prisma`. When an authenticated user triggers GitHub OAuth linking:
  1. Passport's `GitHubStrategy` verify callback executes first. Because the GitHub user's email does not match the Google email, Passport creates/updates a separate user record with that `githubId`.
  2. `githubCallback` in `auth.controller.js` then runs and attempts to update the existing user record:
     ```javascript
     await prisma.user.update({
       where: { id: decoded.id },
       data: {
         githubId: req.user.githubId,
         githubToken: req.user.githubToken,
       },
     });
     ```
  3. Prisma throws error `P2002: Unique constraint failed on the fields: (githubId)` because the newly created user record already holds that `githubId`.
  4. The same vulnerability occurs in `connectGitHubToken` in `github.controller.js` when connecting a PAT that already exists in the database.
- **Remediation**:
  In `githubCallback` and `connectGitHubToken`, verify if another user record holds the `githubId`. If it does, cleanly merge the records or clear the stale account before updating:
  ```javascript
  const existingWithGithub = await prisma.user.findUnique({
    where: { githubId: String(ghUser.id) }
  });
  if (existingWithGithub && existingWithGithub.id !== currentUserId) {
    // Re-associate or delete orphaned account
    await prisma.user.update({
      where: { id: existingWithGithub.id },
      data: { githubId: null, githubToken: null }
    });
  }
  ```

---

### 2.2 Cross-Tenant GitHub Token Leakage (Severe Privacy/Security Breach)
- **Impact**: Critical — Complete breakdown of multi-tenant isolation.
- **Affected File**: `backend/src/modules/github/github.service.js` (lines 62–73)
- **Root Cause**:
  In `resolveGitHubToken()`:
  ```javascript
  // 4. Fallback: Any user in system with a github token (best-effort for shared spaces)
  const anyUser = await prisma.user.findFirst({
    where: { githubToken: { not: null } },
    select: { githubToken: true }
  });
  if (anyUser?.githubToken) {
    try {
      return decrypt(anyUser.githubToken);
    } catch (e) { ... }
  }
  ```
  If no member in a project has linked GitHub, the backend fetches the decrypted token of an arbitrary user from any workspace in the entire database to perform GitHub actions.
- **Remediation**:
  Remove Fallback 4 entirely. If neither the requesting user, project owner, nor any project member has a token, return an explicit error:
  `400 Bad Request: No valid GitHub token linked to this project.`

---

### 2.3 Missing RBAC Authorization on Documents and Nexus AI Routes
- **Impact**: High — Unauthorized data access and resource tampering across projects.
- **Affected Files**:
  - `backend/src/modules/documents/document.routes.js` (lines 14–22)
  - `backend/src/modules/nexus/nexus.routes.js` (lines 17–21)
- **Root Cause**:
  Unlike `tasks`, `sprints`, and `analytics` routes which enforce `checkProjectRole()`, `document.routes.js` and `nexus.routes.js` only apply `protect` (authentication).
- **Remediation**:
  Apply project-level RBAC middleware to both routers:
  ```javascript
  // document.routes.js
  router.use(protect);
  router.use(checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"));

  // Restrict mutations to non-viewers
  router.post("/", checkProjectRole("MANAGER", "DEVELOPER"), createDocument);
  router.post("/upload-pdf", checkProjectRole("MANAGER", "DEVELOPER"), uploadPdfDocument);
  router.post("/bulk-delete", checkProjectRole("MANAGER"), deleteDocuments);
  ```

---

### 2.4 OAuth Redirect URI Crash with Multi-Origin CORS Configurations
- **Impact**: High — Users fail to log in or link GitHub if multiple CORS origins are configured.
- **Affected File**: `backend/src/modules/auth/auth.controller.js` (lines 94 & 108)
- **Root Cause**:
  `getClientUrl()` correctly parses comma-separated origins, but lines 94 and 108 bypass it:
  ```javascript
  res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/dashboard?github=connected`);
  ```
  If `CORS_ORIGIN="http://localhost:3000,http://localhost:5173"`, it redirects to:
  `http://localhost:3000,http://localhost:5173/dashboard?github=connected`, an invalid URL.
- **Remediation**:
  Replace both lines with `getClientUrl()`:
  ```javascript
  return res.redirect(`${getClientUrl()}/dashboard?github=connected`);
  ```

---

### 2.5 Multi-Task Commit Reference Overwrite
- **Impact**: High — Commit linkage is lost for all but the last referenced task in a commit message.
- **Affected File**: `backend/src/modules/github/commit.parser.js` (lines 32–52)
- **Root Cause**:
  The `Commit` model in `schema.prisma` defines `taskId String?` as a one-to-many relationship:
  ```javascript
  for (const taskNumber of taskNumbers) {
    ...
    await prisma.commit.update({
      where: { id: commitRecord.id },
      data: { taskId: task.id }
    });
  }
  ```
  When a developer pushes `#TASK-10 #TASK-11`, the first iteration links task 10, but the second iteration overwrites `taskId` with task 11.
- **Remediation**:
  Create an explicit join table `TaskCommit` in `schema.prisma` for many-to-many task-to-commit linking:
  ```prisma
  model TaskCommit {
    id        String   @id @default(uuid())
    taskId    String
    task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
    commitId  String
    commit    Commit   @relation(fields: [commitId], references: [id], onDelete: Cascade)
    createdAt DateTime @default(now())

    @@unique([taskId, commitId])
  }
  ```

---

### 2.6 Octokit Commit Sync Strips `filesChanged`, Disabling ML Bug Predictions
- **Impact**: High — The machine learning bug risk predictor cannot analyze repositories populated via manual or scheduled sync.
- **Affected File**: `backend/src/modules/github/github.service.js` (lines 149–150)
- **Root Cause**:
  In `syncCommitsForRepository`, commits are fetched via `octokit.repos.listCommits()`, which only returns metadata (author, sha, message) without files. The code writes:
  ```javascript
  filesChanged: []
  ```
  The ML feature extractor in `ml.controller.js` (lines 54–72) calculates `code_churn`, `commit_frequency`, and `bug_fix_ratio` by reading `commit.filesChanged`. Since `filesChanged` is empty, the prediction scan finds zero files.
- **Remediation**:
  During commit synchronization, fetch the specific commit details using `octokit.repos.getCommit({ owner, repo, ref: sha })` to extract `commit.files.map(f => f.filename)`:
  ```javascript
  const detail = await octokit.repos.getCommit({ owner, repo, ref: c.sha });
  const filesChanged = detail.data.files ? detail.data.files.map(f => f.filename) : [];
  ```

---

### 2.7 ML Microservice OpenMP Dependency Failure & Missing Model Binaries
- **Impact**: High — The Python defect prediction microservice fails to train or execute on macOS and falls back to hardcoded heuristic rules.
- **Affected Files**:
  - `ml-service/app/predictor.py` (lines 10–15)
  - `ml-service/training/train.py`
- **Root Cause**:
  1. The `ml-service/models/` directory is missing. No serialized models (`xgboost_model.pkl`, `random_forest_model.pkl`, `hybrid_model.pkl`) are bundled.
  2. In `ml-service/venv`, importing `xgboost` on macOS fails:
     ```
     xgboost._c_api.XGBoostError: XGBoost Library (libxgboost.dylib) could not be loaded.
     Reason: Library not loaded: @rpath/libomp.dylib
     ```
     `libomp` (OpenMP) is required by XGBoost.
- **Remediation**:
  1. Provide a `Dockerfile` for `ml-service` installing `libgomp1` (Linux) / OpenMP so deployments are platform-independent.
  2. Train models and commit the baseline `.pkl` files to `ml-service/models/`.

---

### 2.8 Potential `TypeError` Crash in Batch Prediction Handler
- **Impact**: Medium-High — Causes repository scan to abort if file names undergo path normalization.
- **Affected File**: `backend/src/modules/ml/ml.controller.js` (lines 196–210)
- **Root Cause**:
  ```javascript
  const feat = sortedFiles.find(f => f.file_path === pred.file_path);
  return prisma.predictionResult.upsert({
    ...
    update: {
      commitFrequency: feat.commit_frequency, // Throws TypeError if feat is undefined
  ```
- **Remediation**:
  Add a fallback default object to prevent unhandled exceptions:
  ```javascript
  const feat = sortedFiles.find(f => f.file_path === pred.file_path) || {
    commit_frequency: 0,
    code_churn: 0,
    num_contributors: 1,
    pr_count: 0,
    bug_fix_ratio: 0
  };
  ```

---

### 2.9 Kanban Task Card Editing Lock Never Cleared on Close
- **Impact**: Medium-High — When a user closes a task card modal, the task remains locked as "being edited" for all other team members.
- **Affected File**: `frontend/src/pages/Board.jsx` (lines 241–244)
- **Root Cause**:
  ```javascript
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetails(selectedTaskId);
      if (socket && currentProject) {
        socket.emit(SocketEvent.TASK_EDITING, { projectId: currentProject.id, taskId: selectedTaskId });
      }
    } else {
      if (socket && currentProject && selectedTaskId) { // selectedTaskId is ALWAYS null here!
        socket.emit(SocketEvent.TASK_EDITING_DONE, { projectId: currentProject.id, taskId: selectedTaskId });
      }
      setTaskDetails(null);
    }
  }, [selectedTaskId]);
  ```
- **Remediation**:
  Track `prevTaskId` using a `useRef` to emit `TASK_EDITING_DONE` with the previous task ID when `selectedTaskId` becomes null:
  ```javascript
  const prevTaskIdRef = React.useRef(selectedTaskId);
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetails(selectedTaskId);
      if (socket && currentProject) {
        socket.emit(SocketEvent.TASK_EDITING, { projectId: currentProject.id, taskId: selectedTaskId });
      }
    } else if (prevTaskIdRef.current && socket && currentProject) {
      socket.emit(SocketEvent.TASK_EDITING_DONE, { projectId: currentProject.id, taskId: prevTaskIdRef.current });
      setTaskDetails(null);
      setComments([]);
    }
    prevTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);
  ```

---

### 2.10 Chat Channels Isolated in Client `localStorage`
- **Impact**: High — Multi-user collaboration is broken for channels; newly created channels are invisible to other team members.
- **Affected File**: `frontend/src/store/useChannelStore.js` (lines 8–27)
- **Root Cause**:
  `useChannelStore` stores channel lists in the browser's `localStorage` (`devpilot_channels_<projectId>`). There is no `Channel` table in `schema.prisma`.
- **Remediation**:
  Add a `Channel` model to `prisma/schema.prisma` and implement channel CRUD routes on the backend.

---

### 2.11 Unrestricted Message Channel Deletion
- **Impact**: High — Any viewer or developer can delete all messages in a project channel.
- **Affected File**: `backend/src/modules/communication/message.routes.js` (lines 15–19)
- **Root Cause**:
  The router applies `checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER")` globally, with no additional check on `router.delete("/channels/:channelId", deleteChannelMessages)`.
- **Remediation**:
  Apply `checkProjectRole("MANAGER")` directly to the delete endpoint:
  ```javascript
  router.delete("/channels/:channelId", checkProjectRole("MANAGER"), deleteChannelMessages);
  ```

---

### 2.12 Inconsistent Express Router Parameter Naming
- **Impact**: Medium — Parameter misalignment between routes and controllers.
- **Affected File**: `backend/app.js` (lines 96–103)
- **Root Cause**:
  ```javascript
  projectRouter.use("/:id/sprints", sprintRouter);
  projectRouter.use("/:id/tasks", taskRouter);
  projectRouter.use("/:projectId/documents", documentRouter);
  projectRouter.use("/:projectId/nexus", nexusRouter);
  ```
  `sprints` and `tasks` use `/:id/`, while `documents` and `nexus` use `/:projectId/`.
- **Remediation**:
  Standardize on `/:projectId/` across all nested routers in `backend/app.js`.

---

## 3. Medium-Severity Bugs & Functional Disconnects

### 3.1 Timesheets Feature Is an Unpersisted Client-Side Mock
- **Affected File**: `frontend/src/pages/Timesheets.jsx` (lines 96–147)
- **Detail**: The UI displays hardcoded mock hours (`[0, 8, 7.5, 8, 6, 0, 0]`). Clicking "Log Hours" only mutates React local state. There is no `Timesheet` table in the database and no backend endpoints. Data is lost upon navigation or refresh.

### 3.2 Missing JWT Refresh Token Strategy
- **Affected Files**: `backend/src/utils/jwt.utils.js`, `backend/src/modules/auth/auth.routes.js`
- **Detail**: Project documentation describes a short-lived access token + 7-day refresh token strategy with automatic refreshing via `POST /api/auth/refresh`. The codebase only issues a single 24-hour access token, and the refresh endpoint is never implemented.

### 3.3 Default Frontend `.env` Hardcodes Private Tailscale Endpoint
- **Affected File**: `frontend/.env`
- **Detail**: `VITE_API_URL` defaults to `https://paradeshi.tail7c638e.ts.net/api`. New developers cloning the project cannot connect to the backend locally until manually editing `.env`. A `.env.example` file is missing.

### 3.4 Commit List Missing Task Relations in Analytics
- **Affected Files**:
  - `frontend/src/pages/Analytics.jsx` (lines 889–893)
  - `backend/src/modules/analytics/analytics.controller.js` (lines 160–199)
- **Detail**: The frontend renders task badges using `commit.task.taskNumber`. The backend's `getDashboardMetrics` query does not include the `task` relation, so commit badges never render.

### 3.5 Base64 PDF Upload Body-Size Limitation
- **Affected File**: `backend/src/modules/documents/document.controller.js` (lines 200–220)
- **Detail**: PDFs are uploaded as Base64 strings inside JSON. Express has a 10MB JSON body limit. Factoring in 33% Base64 overhead, files larger than ~7MB fail with an HTTP 413 error.

### 3.6 Inverted Filter Logic for "Workspace Docs"
- **Affected Files**:
  - `frontend/src/pages/Docs.jsx` (lines 362–373)
  - `backend/src/modules/documents/document.controller.js` (lines 60–62)
- **Detail**: "Workspace Docs" filters strictly by `authorId !== user.id`. Users expecting to view all team documents find their own documents omitted.

### 3.7 Documentation Discrepancies
- The documentation references **ZegoCloud UIKit**, but the implementation uses **`@jitsi/react-sdk`** (Jitsi Meet).
- Typo in project root filename: `ppt_projecct.md`.

---

## 4. Comprehensive Strategic Improvements

### 4.1 Database & Architecture Enhancements
1. **Persistent `Channel` Entity**:
   Add a relational model in `schema.prisma` with `name`, `topic`, `projectId`, and `isDefault` so channels are synchronized across all connected team members.
2. **`TimesheetEntry` Model & Endpoints**:
   Create a table linking `userId`, `taskId`, `projectId`, `date`, `hoursLogged`, and `note`, with endpoints for team timesheet logging and capacity aggregation.
3. **Many-to-Many `TaskCommit` Association**:
   Decouple commits from single tasks so that multi-task commit messages link to all referenced tasks simultaneously.

### 4.2 Security, Multi-Tenancy & Auth Hardening
1. **Dual-Token Auth**:
   Implement 15-minute access tokens and 7-day refresh tokens stored in `httpOnly`, `SameSite=Strict` cookies, with a dedicated `POST /api/auth/refresh` endpoint and token rotation.
2. **Strict Project Isolation**:
   Add `checkProjectRole` middleware across all document, Nexus AI, and channel routes. Remove global fallback credentials from `resolveGitHubToken()`.
3. **Role Elevation Guard**:
   Ensure only users with `MANAGER` role in a project can delete channels, repositories, or sprints.

### 4.3 GitHub Integration & ML Engine Expansion
1. **Full Commit File Ingestion**:
   During manual and periodic syncs, fetch commit file diffs using `octokit.repos.getCommit()` so `filesChanged` is populated for ML feature extraction.
2. **Expose CodeBERT Semantic Prediction in API**:
   The Python service already implements a hybrid CodeBERT + AST classifier (`/predict/code`). Expose this via a `POST /api/projects/:id/ml/scan-code` endpoint so teams can scan source files directly.
3. **Containerize ML Service**:
   Add a `Dockerfile` for `ml-service` with Debian/Ubuntu base and `libgomp1` installed to resolve OS-specific OpenMP dependency issues.

### 4.4 Frontend Performance & UX Polish
1. **Route-Based Code Splitting**:
   The production JS bundle is currently **1.3 MB**. Implement dynamic `React.lazy()` imports for routes (`Dashboard`, `Board`, `Analytics`, `Docs`, `NexusAi`, `Chat`, `Timesheets`, `Teams`) to reduce initial bundle size below 250 KB.
2. **Multipart Streaming for PDF Uploads**:
   Replace Base64 JSON parsing with `multer` to stream large PDF files directly to memory/disk without memory pressure.
3. **Developer Onboarding Config**:
   Add `frontend/.env.example` pointing to `http://localhost:5001/api`.

### 4.5 DevOps, Containerization & Automated Testing
1. **Integration Test Coverage**:
   Expand test coverage beyond the single health check test to cover:
   - Webhook HMAC verification and `#TASK-N` parsing.
   - Kanban fractional reordering transactions.
   - Project RBAC boundaries and invite lifecycles.
2. **Root `docker-compose.yml`**:
   Provide a unified Compose file defining `backend`, `frontend`, `ml-service`, and `postgres` with `pgvector` enabled for zero-config local setup.
