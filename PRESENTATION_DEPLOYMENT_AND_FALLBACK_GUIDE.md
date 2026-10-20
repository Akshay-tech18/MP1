# DevPilot Presentation Deployment & Emergency Fallback Guide

**Audience**: DevPilot Engineering & Presentation Team  
**Date**: October 20, 2026  
**Objective**: Guarantee 100% uptime during live presentations by establishing an automated Primary Deployment on the Private Server and an instant 30-second Localhost + Neon Cloud Fallback plan.

---

## 1. High-Level Architecture: Plan A vs. Plan B

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PLAN A: PRIMARY (Private Server)                    │
│                                                                        │
│   All components self-hosted on private server via Tailscale / HTTPS   │
│   URL: https://paradeshi.tail7c638e.ts.net                             │
│   ├── Frontend:  Served as built static SPA (dist/) on port 443/80    │
│   ├── Backend:   Node.js / Express API on port 5001 (/api)            │
│   ├── WebSocket: Socket.IO Gateway (/project)                         │
│   └── Database:  PostgreSQL (100.93.90.24:18869/agent_db)             │
│                                                                        │
│   ✨ Benefits: Zero CORS issues, first-party cookies, unified domain  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
               IF PRIVATE SERVER / TAILSCALE DROPS AT VENUE
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               PLAN B: EMERGENCY FALLBACK (Local + Neon Cloud)          │
│                                                                        │
│   Trigger: Campus/venue Wi-Fi blocks Tailscale or server laptop sleeps │
│   Location: Directly on presentation machine                           │
│   ├── Frontend:  http://localhost:3000 (Vite Dev Server)              │
│   ├── Backend:   http://localhost:5001 (Node.js Express)              │
│   └── Database:  Neon Cloud PostgreSQL (Public SSL with pgvector)     │
│                                                                        │
│   ✨ Benefits: 0% dependency on VPN, instant recovery in 30 seconds    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Will Bug Fixes Work in Both Environments?

**Yes, 100%.** Every fix we implement is designed to be **environment-agnostic**:
- **CORS Handling**: Supports comma-separated origins (`http://localhost:3000`, `https://paradeshi.tail7c638e.ts.net`).
- **Authentication**: Supports both cross-site tokens and same-origin cookies seamlessly.
- **Database Layer**: Prisma ORM connects identically to local Postgres, Tailscale Postgres, or Neon Cloud using connection strings.

---

## 3. Plan A: Primary Setup (Full Private Server)

### Step 1: Build Frontend for Private Server
On the machine deploying to the server, run:
```bash
cd frontend
# Ensure frontend/.env points to your private server or relative path
npm run build
```
This generates the optimized production bundle in `frontend/dist/`.

### Step 2: Serve Frontend on Private Server
Either via Nginx, Caddy, or by having Express serve static files from `frontend/dist/`:
```bash
# Example Nginx reverse proxy configuration:
# location / {
#   root /path/to/frontend/dist;
#   try_files $uri $uri/ /index.html;
# }
# location /api {
#   proxy_pass http://localhost:5001;
# }
# location /project {
#   proxy_pass http://localhost:5001;
#   proxy_http_version 1.1;
#   proxy_set_header Upgrade $http_upgrade;
#   proxy_set_header Connection "upgrade";
# }
```

### Step 3: Server `.env` Checklist
- **`backend/.env`**:
  ```env
  PORT=5001
  NODE_ENV=production
  DATABASE_URL="postgresql://postgres:7e793928afdc17096e35391b3e1f593a@100.93.90.24:18869/agent_db?sslmode=disable"
  CORS_ORIGIN="https://paradeshi.tail7c638e.ts.net,http://localhost:3000"
  ```
- **`frontend/.env`**:
  ```env
  VITE_API_URL=https://paradeshi.tail7c638e.ts.net/api
  VITE_SOCKET_URL=https://paradeshi.tail7c638e.ts.net/project
  ```

---

## 4. Plan B: Emergency 30-Second Fallback Runbook

If you arrive at the presentation venue and Tailscale is blocked by the network or the private server is unreachable:

### Step 1: Switch `backend/.env` to Neon Cloud
Open `backend/.env` on your presentation laptop:
```env
PORT=5001
NODE_ENV=development

# Comment out private server DB and use Neon Cloud:
# DATABASE_URL="postgresql://postgres:...@100.93.90.24:18869/agent_db?sslmode=disable"
DATABASE_URL="postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

CORS_ORIGIN="http://localhost:3000"
```

### Step 2: Switch `frontend/.env` to Localhost
Open `frontend/.env` on your presentation laptop:
```env
# Comment out private server:
# VITE_API_URL=https://paradeshi.tail7c638e.ts.net/api
# VITE_SOCKET_URL=https://paradeshi.tail7c638e.ts.net/project

# Enable localhost:
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001/project
```

### Step 3: Launch Both Services Locally
In Terminal 1:
```bash
cd backend
npm run dev
# Running on http://localhost:5001
```

In Terminal 2:
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

Open `http://localhost:3000` in your browser. The entire platform is now running locally with live cloud database persistence!

---

## 5. Synchronizing Private Database to Neon Cloud

To ensure Neon Cloud has the exact same projects, sprints, tasks, and users as your private server, run this sync command **the night before demo day**:

### Option 1: Quick Prisma Push to Neon
Point `DATABASE_URL` in `backend/.env` to your Neon database URL, then run:
```bash
cd backend
npx prisma db push
```

### Option 2: Full Data Dump & Restore
Dump private database and restore directly into Neon Cloud:
```bash
# 1. Export data from private server
pg_dump -h 100.93.90.24 -p 18869 -U postgres -d agent_db -F c -b -v -f devpilot_backup.dump

# 2. Restore into Neon Cloud
pg_restore -d "postgresql://neondb_owner:PASSWORD@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require" --clean --no-owner --no-acl devpilot_backup.dump
```

---

## 6. Presentation Day "Life-Savers"

### 1. The 1-Click Mock Login (Zero OAuth Dependency)
If Google or GitHub OAuth throws `redirect_uri_mismatch` due to domain changes, **do not panic**:
- On `http://localhost:3000/login` or `https://paradeshi.tail7c638e.ts.net/login`, click **"Switch to Demo Account"**.
- Click **Maria Manager** (`manager@devpilot.com`) or **Devon Developer** (`developer@devpilot.com`).
- This executes `/api/auth/mock-login`, issuing a valid 24-hour JWT token and immediately loading the real dashboard, tasks, analytics, and chat!

### 2. Phone Hotspot Backup
If the university/conference Wi-Fi has strict port filtering, turn on your personal phone's Wi-Fi hotspot. Connect your presentation laptop to it. Both Tailscale (Plan A) and Neon Cloud (Plan B) work unrestricted over cellular hotspots.

### 3. Quick Cloudflare Tunnel (If Evaluators Want Live Links on Their Phones)
If professors or audience members want to test the app on their own phones without Tailscale:
```bash
npx cloudflared tunnel --url http://localhost:5001
```
This gives you an instant public HTTPS URL (e.g. `https://demo-session.trycloudflare.com`) with valid SSL in 5 seconds.

---

## 7. Emergency Checklist (15 Minutes Before Demo)

- [ ] Private server is awake (disable sleep/hibernate if laptop lid is closed).
- [ ] Tailscale app shows **Connected** (green dot).
- [ ] Open `https://paradeshi.tail7c638e.ts.net` in an incognito window to verify clean load.
- [ ] Verify `npm run dev` in `backend/` and `frontend/` works locally as a standby.
- [ ] Confirm Neon Cloud credentials are saved in `backend/.env.backup` for immediate switching if needed.
