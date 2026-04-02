# CloudDeck v3 — Netlify Functions + MongoDB Atlas

> Production-ready AWS Exam Engine: React (Vite) + Netlify Functions (serverless) +
> MongoDB Atlas (multi-zone replication). No servers to manage, global CDN delivery,
> permanent cross-device data persistence.

---

## Architecture

```
Browser (React + Vite)
        │
        │  /api/*  →  netlify.toml redirect
        ▼
Netlify Edge CDN  (150+ PoPs, automatic multi-AZ)
        │
        │  /.netlify/functions/api
        ▼
Netlify Function  (Node.js Lambda)
 ├── lib/db.js        — cached Mongoose connection
 ├── lib/models.js    — User, ExamSet, Question, SessionResult, AuditLog
 ├── lib/auth.js      — JWT sign/verify, authenticate(), requireAdmin()
 ├── lib/parser.js    — resilient Q1–Q64 text parser
 └── lib/seed.js      — seeds admin1234 + starter questions
        │
        │  mongodb+srv (SRV DNS, all replica members auto-discovered)
        ▼
MongoDB Atlas Cluster  (3-node replica set, multi-zone replication)
 ├── users            — bcrypt-hashed passwords, non-explicit deny permissions
 ├── examsets         — title, category, tags, AWS-style metadata Map
 ├── questions        — options[], chooseTwo, correctCount, explanation
 ├── sessionresults   — per-user history, accessible on any device
 └── auditlogs        — CloudTrail-style: actor, action, IP, userAgent
```

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas free cluster (M0) — [create at cloud.mongodb.com](https://cloud.mongodb.com)
- Netlify CLI: `npm install -g netlify-cli`

### 1. Clone and install

```bash
git clone <your-repo-url> clouddeck-netlify
cd clouddeck-netlify

# Install root dependencies (React + Vite)
npm install

# Install function dependencies
cd netlify/functions && npm install && cd ../..
```

### 2. Create `.env` for local dev

```bash
# .env  (git-ignored — never commit this)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/clouddeck?retryWrites=true&w=majority
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Start dev server

```bash
npm run dev
# Netlify CLI starts:
#   React (Vite)       → http://localhost:5173
#   Netlify Functions  → http://localhost:8888/.netlify/functions/api
#   /api/* proxy       → http://localhost:8888/.netlify/functions/api/*
```

### 4. Open app

```
http://localhost:8888

Admin credentials (auto-seeded on first run):
  Username: admin1234
  Password: rootuser@1234
```

---

## Netlify Deployment — Step by Step

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "feat: CloudDeck v3 — Netlify + Atlas"
git remote add origin https://github.com/YOUR_USERNAME/clouddeck-netlify.git
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Choose GitHub → authorise → select your repo
3. Build settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`

### Step 3: Set Environment Variables

In Netlify UI → **Site Settings** → **Environment Variables** → Add:

| Key | Value | Notes |
|-----|-------|-------|
| `MONGODB_URI` | `mongodb+srv://...` | Atlas connection string with `?retryWrites=true&w=majority` |
| `JWT_SECRET` | 64-char random hex | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `NODE_ENV` | `production` | Enables production error handling |

> **Security note**: Environment variables set in Netlify UI are encrypted at rest and injected
> into the Lambda environment at runtime — they never appear in your repository or build logs.

### Step 4: Deploy

```bash
# Auto-deploys on every git push to main
git push origin main
# Netlify rebuilds in ~30s — site live at https://your-site.netlify.app
```

---

## MongoDB Atlas — Multi-Zone Setup

Atlas free tier (M0) uses a 3-node replica set across separate AWS availability zones.
This means:

- **Automatic failover**: if one node goes down, a new primary is elected within seconds
- **retryWrites=true**: write operations are automatically retried on transient network errors
- **w=majority**: writes are acknowledged only after the majority of replica set nodes confirm
- **SRV connection string**: Mongoose discovers all replica members automatically from DNS

Your data is never stored on a single server.

---

## `netlify.toml` Explained

```toml
[build]
  command   = "npm run build"       # Vite production build
  publish   = "dist"                # SPA output directory
  functions = "netlify/functions"   # Serverless function directory

[[redirects]]
  from = "/api/*"
  to   = "/.netlify/functions/api/:splat"
  status = 200    # Transparent proxy — URL stays /api/* in browser

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200    # SPA fallback — React Router handles client-side routing

[[headers]]
  # Security headers on all responses
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
```

---

## API Reference

All endpoints live at `/api/*` (proxied to `/.netlify/functions/api`).

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account, returns JWT |
| `POST` | `/api/auth/login` | — | Sign in, returns JWT |
| `GET`  | `/api/auth/me` | Bearer | Get current user profile |
| `GET`  | `/api/auth/users` | Admin | List all users |
| `PATCH`| `/api/auth/users/:id` | Admin | Update permissions |
| `DELETE`| `/api/auth/users/:id` | Admin | Delete user |

### Exams
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/exams` | Bearer | List published exam sets |
| `GET`  | `/api/exams/:id` | Bearer | Get set + questions |
| `DELETE`| `/api/exams/:id` | Admin | Delete set + questions |
| `POST` | `/api/exams/import` | Admin | Bulk save questions |
| `POST` | `/api/exams/:id/sessions` | Bearer | Save completed session |
| `GET`  | `/api/exams/sessions/mine` | Bearer | Get my session history |

### Utilities
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/import-questions` | Admin | Parse raw text server-side |
| `GET`  | `/api/logs` | Admin | List audit log entries |
| `GET`  | `/api/health` | — | Health check |

---

## Choose Two — State Machine

Questions with exactly **2 correct answers** (`correctCount === 2`) are flagged
`chooseTwo: true` automatically during parsing.

```
Phase: 'picking'
  User clicks WRONG  → option locks RED; user retries (stays 'picking')
  User clicks CORRECT #1 → option turns ACCENT; phase → 'partial'

Phase: 'partial'  (1/2 correct found)
  User clicks WRONG  → option locks RED; user retries (stays 'partial')
  User clicks CORRECT #2 → both turn GREEN; phase → 'done'; explanation appears

Phase: 'done'
  All correct options highlighted GREEN
  Wrong/locked options remain RED
  Other options dimmed
  Explanation revealed
  "Next" button enabled
```

Seeded Choose Two questions: **Q4, Q10, Q19, Q42, Q52**

---

## Technical Verification

| Requirement | Implementation |
|-------------|----------------|
| Q10: S3 + DynamoDB replicate across regions | Seeded with `chooseTwo: true`; both options marked `correct: true` |
| Q30: Standard Reserved Instances = 75% discount | Seeded as single-select; explanation explicitly states "up to 75%" |
| Glacier: most cost-effective for 10-year medical records | Seeded as Q1; explanation cites `~$0.00099/GB/month` |
| Non-explicit deny | `hasPermission()` returns `false` unless explicitly `true`; new users get minimum grants |
| bcrypt password hashing | 12 salt rounds in `User.pre('save')` hook |
| CloudTrail-style audit logging | Every admin action writes to `AuditLog` collection with actor, IP, userAgent |
| Multi-zone HA | MongoDB Atlas 3-node replica set; Netlify global CDN edge |
| Permanent cross-device persistence | JWT + Atlas — any browser with the URL sees the same data |

---

## Project Structure

```
clouddeck-netlify/
├── netlify.toml                          # Build config + redirects + headers
├── package.json                          # React + Vite deps
├── vite.config.js                        # Dev proxy → Netlify CLI port
├── tailwind.config.js                    # Zinc/Slate palette + animations
├── index.html                            # DM Sans + JetBrains Mono fonts
│
├── netlify/functions/
│   ├── api.js                            # Unified Lambda handler — all routes
│   ├── package.json                      # bcryptjs, jsonwebtoken, mongoose
│   └── lib/
│       ├── db.js                         # Cached Atlas connection
│       ├── models.js                     # User, ExamSet, Question, Session, AuditLog
│       ├── auth.js                       # JWT helpers + middleware
│       ├── parser.js                     # Resilient Q1–Q64 text parser
│       └── seed.js                       # admin1234 + verified Q10/Q30/Glacier data
│
├── public/favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx                           # Router + ProtectedRoute + PublicRoute
    ├── index.css                         # Design system (Zinc/Slate, sky accent)
    ├── api/client.js                     # fetch wrapper, JWT injection
    ├── hooks/useAuth.jsx                 # JWT context, can(), isAdmin
    └── components/
        ├── auth/AuthPage.jsx             # Login + Register tabs
        ├── layout/Layout.jsx             # Sidebar + hamburger menu
        ├── quiz/
        │   ├── Dashboard.jsx             # Stats + exam cards
        │   ├── ExamList.jsx              # Browse + filter + category picker
        │   ├── QuizInterface.jsx         # Choose Two state machine + feedback
        │   └── ProgressPage.jsx          # Session history
        └── admin/
            ├── BulkImport.jsx            # Server-parse → Atlas save
            ├── UserManagement.jsx        # RBAC permission grants
            └── AuditLogs.jsx             # CloudTrail-style event log
```

---

*CloudDeck v3 — Serverless. Persistent. Global.*
