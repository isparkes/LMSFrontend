# LMS Training Frontend

A Next.js web application for the LMS Training Backend. Provides both a learner UI and an admin dashboard.

## Related Projects

- **[TrainingBackend](../TrainingBackend)** — NestJS API server (must be running on port 3000)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server on port 3001
npm run dev -- -p 3001
```

The backend must be running on `http://localhost:3000`. The frontend's `next.config.ts` proxies `/api/*` and `/uploads/*` requests to it. Run the frontend on a different port (e.g. 3001) to avoid a conflict.

## Tech Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS
- Client-side JWT auth (stored in `localStorage`)

## Authentication

Users have the following fields: `id`, `email`, `firstName`, `lastName`, `role` (`admin` | `learner`).

On login or registration, the JWT and user object are stored in `localStorage`. The `AuthProvider` restores them on page load and exposes `login`, `register`, and `logout` via the `useAuth()` hook.

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/login` | Email + password login |
| `/register` | New account registration (first name, last name, email, password) |

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
| `/admin/lessons/[lessonId]` | Edit lesson content and quiz questions |
| `/admin/uploads` | Upload video files |
| `/admin/users` | View user list |
| `/admin/users/[userId]` | View individual user details |

## Lesson Types

| Type | Behaviour |
|------|-----------|
| `text` | Renders markdown/HTML content |
| `video` | Embeds a video player |
| `quiz` | Interactive quiz via `QuizPlayer` |

## Quiz Features

The `QuizPlayer` component supports:

- **Single-select** (radio) and **multi-select** (checkbox) questions
- **Pass mark** — a minimum percentage required to mark the lesson complete
- **Max attempts** — limits how many times a learner can submit; exhausted attempts show a contact-admin message
- **Randomize questions** — shuffles question order on each attempt using Fisher-Yates
- **Randomize answers** — shuffles answer options independently per question
- **Show correct answers** — controlled by the admin; when disabled, only the selected option is highlighted after submission
- **Previous attempts history** — displays score and pass/fail for each prior attempt

## Quiz Gating (LessonSidebar)

If a quiz lesson has a pass mark set and has not been passed, all subsequent lessons in the course are locked and cannot be navigated to until the quiz is passed.

## Project Structure

```
src/
├── lib/
│   ├── api.ts              API client (fetch wrapper with JWT Bearer auth)
│   └── auth.tsx            AuthProvider + useAuth() hook
├── components/
│   ├── Navbar.tsx           Top navigation bar (links, user name/role badge, logout)
│   ├── ProgressBar.tsx      Reusable percentage progress bar
│   ├── QuizPlayer.tsx       Interactive quiz component (see Quiz Features above)
│   └── LessonSidebar.tsx    Course progress sidebar with quiz gating
└── app/
    ├── layout.tsx           Root layout
    ├── client-layout.tsx    Client-side AuthProvider wrapper
    ├── page.tsx             Home (redirects to /courses or /login)
    ├── login/               Login page
    ├── register/            Registration page
    ├── courses/             Learner course browsing + progress
    ├── lessons/             Lesson viewer
    └── admin/               Admin dashboard pages
```
