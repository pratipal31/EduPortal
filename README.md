# 🎓 EduPortal — Teacher & Student Quiz Management Platform


## Overview

Teacher & student quiz management with AI-powered explanations and analytics.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white) ![Clerk](https://img.shields.io/badge/Clerk-7B61FF?style=flat-square) ![Grok](https://img.shields.io/badge/Grok-FFCC00?style=flat-square) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

---

EduPortal is a full-stack system providing teacher and student portals. Teachers can author smart quizzes (with optional AI-generated explanations) and monitor class performance. Students can take quizzes, get immediate feedback, and track progress over time.

## Live demo

- Deployment: [EduPortal (live)](https://edu-portals.vercel.app/)


## 🚀 Features (Summarized)

### 👩‍🏫 Teacher Features
- Create quizzes with multiple question types:
  - MCQ, True/False, Fill in the Blanks, Short/Long Answers
- Set difficulty levels, time limits, and pass criteria  
- Auto-generate intelligent explanations via **Grok API**  
- Manage students, results, and leaderboard  
- View analytics with charts and class-wide statistics  
- Data securely stored and synced using **Supabase**

### 🧑‍🎓 Student Features
- Attempt quizzes assigned by teachers in real-time  
- View instant results and AI-generated feedback  


## Tech stack

- Frontend: Next.js 14, React, Tailwind CSS, ShadCN UI, Framer Motion
- Backend & DB: Supabase (Postgres + Auth)
- Auth: Clerk
- AI: Grok API (integration for explanations)
- Icons/UI: Lucide, ShadCN components
- Deployment: Vercel

## Project structure (high level)

Below is a concise, consistent tree view of the app folder and top-level files. Use this as a quick map of the main areas of the project.

```
app/
├─ api/                      # server API routes
│  ├─ groq/
│  │  └─ route.ts            # AI / Grok route handler
│  ├─ sync-user/
│  │  └─ route.ts            # user sync endpoint
│  └─ webhooks/user/
│     └─ route.ts            # auth/webhook handlers
├─ pages-Student/            # student-facing pages & components
│  ├─ AvailableQuiz/page.tsx
│  ├─ Leaderboard/page.tsx
│  ├─ Profile/page.tsx
│  ├─ Progress/page.tsx
│  ├─ Result/page.tsx
│  ├─ StudentDashboard/page.tsx
│  └─ layout.tsx
├─ pages-Teacher/            # teacher-facing pages & components
│  ├─ Analytics/page.tsx
│  ├─ CreateQuiz/page.tsx
│  ├─ Leaderboard/page.tsx
│  ├─ MyQuiz/page.tsx
│  ├─ Results/page.tsx
│  ├─ ShowStudents/page.tsx
│  ├─ TeacherDashboard/page.tsx
│  └─ layout.tsx
├─ components/               # shared UI and view-specific components
│  ├─ student/
│  │  ├─ Dashboard.tsx
│  │  └─ Navbar.tsx
│  ├─ teacher/
│  │  ├─ Dashboard.tsx
│  │  └─ Navbar.tsx
│  ├─ ui/                    # shared UI primitives (buttons, inputs, etc.)
│  └─ AuthRedirector.tsx
├─ globals.css               # global styles
├─ layout.tsx                # app-level layout
└─ page.tsx                  # main landing page

Note: This is a high-level overview — some files/folders may differ in the repo.

How to view the project tree locally
- On Windows (cmd.exe):

```bat
tree /F /A
```

- On macOS/Linux or Git Bash:

```bash
ls -R
```

These commands print the folder tree so you can verify the exact layout on your machine.


## Install & run (local dev)

1. Install dependencies (pick one):

```bash
npm install
# or
bun install
```

1. Start the dev server:

```bash
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to preview the app.

## Helpful links

- Next.js docs: [https://nextjs.org/docs](https://nextjs.org/docs)
- Vercel (deploy): [https://vercel.com/new?framework=next.js](https://vercel.com/new?framework=next.js)

