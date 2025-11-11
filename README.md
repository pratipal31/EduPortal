# 🎓 EduPortal – Teacher & Student Quiz Management Platform

EduPortal is a full-stack quiz management system built with **Next.js**, **Supabase**, **Clerk**, and **Grok API**.  
It enables teachers to create intelligent quizzes with AI-powered explanations and allows students to take quizzes, track scores, and view analytics.

---

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
- Track performance trends and quiz history  
- Compete on live leaderboards  
- View detailed analytics on progress and accuracy

### 📊 Analytics
- Interactive dashboards for both **teachers** and **students**  
- Real-time score tracking, averages, and trends  
- Insights on best/worst-performing quizzes and students  

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | Next.js 14, React, Tailwind CSS, ShadCN UI, Framer Motion |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Authentication** | Clerk |
| **AI Integration** | Grok API |
| **Icons/UI** | Lucide Icons, ShadCN Components |
| **Deployment** | Vercel |

---

## 📂 Folder Structure

app/
├── api/
│ ├── groq/
│ │ └── route.ts
│ ├── sync-user/
│ │ └── route.ts
│ └── webhooks/user/
│ └── route.ts
│
├── pages-Student/
│ ├── AvailableQuiz/page.tsx
│ ├── Leaderboard/page.tsx
│ ├── Profile/page.tsx
│ ├── Progress/page.tsx
│ ├── Result/page.tsx
│ ├── StudentDashboard/page.tsx
│ └── layout.tsx
│
├── pages-Teacher/
│ ├── Analytics/page.tsx
│ ├── CreateQuiz/page.tsx
│ ├── Leaderboard/page.tsx
│ ├── MyQuiz/page.tsx
│ ├── Results/page.tsx
│ ├── ShowStudents/page.tsx
│ ├── TeacherDashboard/page.tsx
│ └── layout.tsx
│
├── components/
│ ├── student/
│ │ ├── Dashboard.tsx
│ │ └── Navbar.tsx
│ ├── teacher/
│ │ ├── Dashboard.tsx
│ │ └── Navbar.tsx
│ ├── ui/
│ └── AuthRedirector.tsx
│
├── globals.css
├── layout.tsx
└── page.tsx

---


First, install dependencies:
```bash
npm i
# or 
bun i


Then, run the development server:
```bash
npm run dev
# or
bun run dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
