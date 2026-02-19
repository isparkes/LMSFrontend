# LMS Training Frontend

A Next.js web application for the LMS Training Backend. Provides both a learner UI and an admin dashboard.

## Related Projects

- **[TrainingBackend](../TrainingBackend)** — NestJS API server (must be running)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev
```

The backend API must be running on `http://localhost:3000`. The frontend's `next.config.ts` proxies `/api/*` and `/uploads/*` requests to the backend.

## Tech Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS
- Client-side JWT auth (localStorage)

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/login` | Email + password login |
| `/register` | New account registration |

### Learner

| Route | Description |
|-------|-------------|
| `/courses` | Browse available courses |
| `/courses/[courseId]` | Course detail with modules and lesson list |
| `/courses/[courseId]/progress` | Progress tracking with per-module breakdown |
| `/lessons/[lessonId]` | Lesson viewer — text content, video player, or interactive quiz |

### Admin

All admin routes require `role: admin`. Non-admin users are redirected.

| Route | Description |
|-------|-------------|
| `/admin/courses` | List all courses, create new |
| `/admin/courses/[courseId]` | Edit course, manage modules |
| `/admin/courses/[courseId]/modules/[moduleId]` | Edit module, manage lessons |
| `/admin/lessons/[lessonId]` | Edit lesson, manage quiz questions |
| `/admin/uploads` | Upload video files |
| `/admin/users` | View user list |

## Project Structure

```
src/
├── lib/
│   ├── api.ts              API client (fetch with JWT auth)
│   └── auth.tsx            Auth context (login, register, logout)
├── components/
│   ├── Navbar.tsx           Top navigation bar
│   ├── ProgressBar.tsx      Reusable progress bar
│   ├── QuizPlayer.tsx       Interactive quiz component
│   └── LessonSidebar.tsx    Lesson navigation sidebar
└── app/
    ├── layout.tsx           Root layout
    ├── client-layout.tsx    Client-side auth provider wrapper
    ├── page.tsx             Home (redirects to /courses or /login)
    ├── login/               Login page
    ├── register/            Registration page
    ├── courses/             Learner course browsing + progress
    ├── lessons/             Lesson viewer
    └── admin/               Admin dashboard pages
```
