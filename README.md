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
- Tailwind CSS v4
- Client-side JWT auth (stored in `localStorage`)

## Skinning

All colours and the body font are controlled by CSS custom properties in `src/app/globals.css`. Edit the `:root` block to rebrand without touching any component code.

| Variable | Default | Purpose |
|----------|---------|---------|
| `--brand` | `#2563eb` | Primary colour — links, buttons, active elements |
| `--brand-dark` | `#1d4ed8` | Primary hover — button hover, darker link hover |
| `--brand-subtle` | `#eff6ff` | Primary tint — selected/highlighted backgrounds |
| `--surface` | `#f9fafb` | Page background |
| `--panel` | `#ffffff` | Card / panel background (forms, sidebars, tables) |
| `--panel-alt` | `#f9fafb` | Table headers, section headers, row hover tint |
| `--text` | `#111827` | Base body text colour |

To use a custom font, add a `@import` for the font at the top of `globals.css` and uncomment the `--brand-font-family` line in `:root`.

The app name shown in the Navbar and browser tab title is defined in `src/lib/brand.ts` (`APP_NAME`).

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
| `/lessons/[lessonId]` | Lesson viewer — text content, video player, PDF viewer, or interactive quiz |

### Admin

All admin routes require `role: admin`. Non-admin users are redirected.

| Route | Description |
|-------|-------------|
| `/admin/courses` | List all courses with ordering controls and enrollment badges, create new |
| `/admin/courses/[courseId]` | Edit course (including enrollment requirement), manage modules with ordering controls |
| `/admin/courses/[courseId]/modules/[moduleId]` | Edit module, manage lessons with ordering controls |
| `/admin/lessons/[lessonId]` | Edit lesson content and quiz questions |
| `/admin/content-library` | Manage uploaded videos and PDFs (list, upload, rename, delete) |
| `/admin/users` | View user list |
| `/admin/users/[userId]` | View individual user details, progress, and manage course enrollments |

## Lesson Types

| Type | Behaviour |
|------|-----------|
| `text` | Renders HTML content with Tailwind prose styles |
| `video` | Embeds a video player pointing to the stored file |
| `pdf` | Embeds a PDF viewer via `<iframe>` |
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
│   ├── auth.tsx            AuthProvider + useAuth() hook
│   └── brand.ts            APP_NAME constant (used in Navbar and page title)
├── components/
│   ├── FilePicker.tsx       Reusable file selector (library browse + upload-new tabs)
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
        ├── courses/         Course list and edit pages
        ├── lessons/         Lesson edit page
        ├── content-library/ Video and PDF library management
        └── users/           User list and detail pages
```
