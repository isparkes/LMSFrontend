# LMS Training Frontend — Specification

## Overview

A Next.js 16 (App Router) single-page application that provides two interfaces for a Learning Management System:

- **Learner interface** — browse and complete courses, lessons, and quizzes; track progress
- **Admin dashboard** — manage courses, modules, lessons, quiz questions, uploads, and users

All data is fetched from a NestJS backend API. The frontend is stateless; authentication is handled entirely via JWT stored in `localStorage`.

---

## Architecture

### Tech Stack

| Concern | Technology |
|---------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Client-side JWT (`localStorage`) |
| State | React `useState` / `useContext` |
| API | Proxied via Next.js rewrites |

### API Proxy

`next.config.ts` rewrites all `/api/*` and `/uploads/*` requests to `http://localhost:3000` (the backend). The frontend must run on a different port (e.g. `npm run dev -- -p 3001`).

### Layout

Every page is wrapped in `ClientLayout`, which provides:

- `AuthProvider` — loads/persists the JWT and user from `localStorage`
- `Navbar` — top navigation with links and logout
- `<main>` — constrained to `max-w-6xl`, padded

---

## Authentication

### User Model

```ts
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "learner";
}
```

### Storage

On login or registration, the JWT (`accessToken`) and serialised `User` object are written to `localStorage` under the keys `token` and `user`. The `AuthProvider` restores them on mount.

### API Client (`src/lib/api.ts`)

`apiFetch<T>(path, options)` wraps `fetch`:

- Prepends `/api` to `path`
- Attaches `Authorization: Bearer <token>` if a token is present
- Sets `Content-Type: application/json` unless the body is `FormData`
- Returns parsed JSON, or `undefined` for 204 responses
- Throws `ApiError(status, message)` on non-OK responses

### Auth Context (`src/lib/auth.tsx`)

Exposed via `useAuth()`:

| Member | Type | Description |
|--------|------|-------------|
| `user` | `User \| null` | Currently signed-in user |
| `token` | `string \| null` | JWT |
| `loading` | `boolean` | True while restoring from `localStorage` |
| `login(email, password)` | `async` | POST `/auth/login`, stores token and user |
| `register(email, password, firstName, lastName)` | `async` | POST `/auth/register`, stores token and user |
| `logout()` | `void` | Clears `localStorage`, resets state |

---

## Routing

### Home (`/`)

Waits for `AuthProvider` to finish loading, then redirects:

- Authenticated → `/courses`
- Unauthenticated → `/login`

### Public Routes

#### Login (`/login`)

Form fields: `email`, `password` (both required). Calls `login()`, redirects to `/courses` on success. Shows an inline error on failure. Links to `/register`.

#### Register (`/register`)

Form fields: `firstName`, `lastName` (side by side), `email`, `password` (min 8 characters, enforced by `minLength` attribute and hint text). Calls `register()`, redirects to `/courses` on success. Links to `/login`.

---

### Learner Routes

#### Course Catalogue (`/courses`)

- Fetches `GET /courses` — all published courses (admin sees draft courses too, rendered with a "Draft" badge)
- For each course, fetches `GET /progress/courses/:id` in parallel to load per-course progress
- Displays courses in a responsive 1/2/3-column grid
- Each card shows: thumbnail (rendered as text if set), title, description (2-line clamp), draft badge if unpublished, and a progress bar with completed/total lesson counts

#### Course Detail (`/courses/[courseId]`)

- Fetches `GET /courses/:id` and `GET /progress/courses/:id` in parallel
- Displays modules in `order` sequence; each module lists its lessons in `order` sequence
- Each lesson is a link to `/lessons/:id?moduleId=:moduleId&courseId=:courseId`
- Lesson type icons: 🎬 video, 📄 text, ❓ quiz, 📑 pdf
- Locked lessons (see Quiz Gating) are shown with 🔒 and are not clickable
- "View Progress" button links to `/courses/:id/progress`

#### Course Progress (`/courses/[courseId]/progress`)

- Fetches `GET /progress/courses/:id`
- Shows overall progress bar (completed lessons / total)
- Per-module breakdown: module title, completed/total, per-module progress bar
- Per-lesson rows: completion indicator (✓ or empty circle), lesson title, type badge, quiz score (as percentage), completion date

#### Lesson Viewer (`/lessons/[lessonId]`)

**Required query parameters:** `moduleId` (without this the page shows "Lesson not found"), `courseId` (optional; enables sidebar and prev/next navigation)

On load (when `moduleId` and `courseId` are present), three requests are made in parallel:

1. `GET /modules/:moduleId/lessons/:lessonId` — lesson data
2. `GET /courses/:courseId` — course structure, used to build prev/next lesson references
3. `GET /progress/courses/:courseId` — used to determine which lessons are locked and whether the current lesson is already complete

**Lesson types:**

| Type | Rendering |
|------|-----------|
| `text` | HTML content rendered via `dangerouslySetInnerHTML` with Tailwind prose styles. Manual "Mark as Complete" button. |
| `video` | HTML5 `<video controls>` pointing to `/uploads/videos/:filename`. Falls back to an error message if the video cannot load. Manual "Mark as Complete" button. |
| `pdf` | `<iframe>` at 80 vh pointing to `/uploads/pdfs/:filename`. Manual "Mark as Complete" button. |
| `quiz` | Rendered by `QuizPlayer` component. Completion is automatic on passing (or on any submission if no pass mark is set). |

**Notes panel:** If the lesson has a `notes` field, a collapsible panel is shown below the lesson content. Notes support HTML. Plain URLs are auto-linked. All links open in `_blank` with `noopener noreferrer`.

**Navigation:** Prev/Next buttons are shown when `courseId` is present. The Next button is disabled (shows "Pass the quiz to continue") if:

- The current lesson is a quiz with a pass mark and the learner has not yet passed it, or
- The next lesson is locked by a prior unfinished gating quiz

**Marking complete:** For text, video, and pdf lessons, a "Mark as Complete" button calls `POST /progress/complete` with `{ lessonId }`. Once called, the button shows "Completed!" and is disabled. The `LessonSidebar` is refreshed via an incremented `refreshKey`.

**Sidebar:** When `courseId` is present, a `LessonSidebar` is rendered to the left of the lesson content (hidden below `lg` breakpoint). The sidebar and lesson content share the full viewport width.

---

### Admin Routes

All admin routes are protected by `AdminLayout`, which redirects non-admin users to `/courses`. Admin navigation links: Courses, Users, Upload Video.

#### Manage Courses (`/admin/courses`)

- Lists all courses (title, published/draft badge, order number)
- Create course form: title (required), description (optional), ordering number
- Delete button on each row — confirms "This will also delete all modules and lessons"

#### Edit Course (`/admin/courses/[courseId]`)

Edit form fields:

| Field | Type | Notes |
|-------|------|-------|
| Title | text | Required |
| Thumbnail URL | text | Optional; displayed as text on course cards |
| Description | textarea | Optional |
| Published | checkbox | Unpublished courses show as "Draft" to learners |
| Order | number | Controls sort position in course list |

Module management (below the edit form):

- Lists modules sorted by `order`, each with lesson count and order number
- Add Module inline form: title (required), description, order
- Delete module button — confirms "This will delete all its lessons"
- Each module title links to `/admin/courses/:courseId/modules/:moduleId`

#### Edit Module (`/admin/courses/[courseId]/modules/[moduleId]`)

Edit form fields: title (required), description, order.

Lesson management (below the edit form):

- Lists lessons sorted by `order` with up/down reorder arrows
- Up/down arrows call `PATCH /modules/:moduleId/lessons/:id` with sequential `order` values for all affected lessons
- Delete lesson button
- Add Lesson form fields:

| Field | Shown for |
|-------|-----------|
| Title | All |
| Type | All (text / video / pdf / quiz) |
| Order | All |
| Notes | All (HTML/plain-URL, optional) |
| Content (HTML) | `text` only |
| Video file upload | `video` only — uploads immediately to `POST /uploads/video`, stores returned filename |
| PDF file upload | `pdf` only — uploads immediately to `POST /uploads/pdf`, stores returned filename |
| Pass Mark (%) | `quiz` only — 0 = no requirement |
| Max Attempts | `quiz` only — 0 = unlimited |
| Randomize question order | `quiz` only |
| Randomize answer order | `quiz` only |
| Show correct answers | `quiz` only |

#### Edit Lesson (`/admin/lessons/[lessonId]?moduleId=:moduleId`)

Loads `GET /modules/:moduleId/lessons/:lessonId`.

Edit form: same type-conditional fields as the Add Lesson form. For video and pdf lessons, the current file is previewed (video player or iframe) before the upload input.

**Quiz question management** (quiz lessons only):

Add Question form:

- Question text (required)
- "Multiple correct answers" toggle — switches between radio (single-select) and checkbox (multi-select) correct-answer inputs
- Options list: minimum 2, add/remove buttons. Radio or checkbox beside each to mark it as correct.
- Order number

Question list: shows each question with its options, correct answers highlighted in green. Delete button per question.

**User Attempts table** (quiz lessons only, shown when attempts exist):

Columns: User name, email, attempt count, best score (%), pass/fail status, "Reset Attempts" button.

Reset calls `POST /lessons/:lessonId/reset-attempts/:userId`, allowing the user to retake the quiz.

#### Upload Video (`/admin/uploads`)

Standalone video upload form. Accepts MP4, WebM, OGG, QuickTime; max 100 MB. On success displays the stored filename, original name, file size, and MIME type. The filename is what should be entered when creating a video lesson.

Note: video and PDF uploads are also available inline on the Edit Module and Edit Lesson pages.

#### Users (`/admin/users`)

- Fetches `GET /progress/admin/overview` — all users with their course progress
- Client-side search by name or email
- Table columns: name, email, role badge, registration date, last login date (or "Never"), overall progress bar (all courses combined), "View" link

#### User Detail (`/admin/users/[userId]`)

Fetches `GET /users/:userId` and `GET /progress/admin/users/:userId` in parallel.

**User info panel:** name, email, role badge, registration date, last login date.

**Change Password panel:** new password + confirm password fields (min 8 chars). Calls `PATCH /users/:userId/password` with `{ password }`.

**Course Progress panels:** one collapsible panel per course. Collapsed state shows course title and overall progress bar. Expanded state shows:

- "Reset Course" button — calls `DELETE /progress/admin/users/:userId/courses/:courseId`
- Per-module sections, each with a "Reset Module" button — calls `DELETE /progress/admin/users/:userId/modules/:moduleId`
- Per-lesson rows: completion indicator, title, type badge
- For quiz lessons: attempt count (out of max if set), best score, pass/fail badge, "Reset" button — calls `POST /lessons/:lessonId/reset-attempts/:userId`

---

## Content Model

### Hierarchy

```
Course
  └── Module (ordered)
        └── Lesson (ordered, typed)
              └── QuizQuestion (quiz lessons only, ordered)
```

### Course Fields

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| title | string | |
| description | string \| null | |
| thumbnail | string \| null | URL/text, displayed on course card |
| isPublished | boolean | Unpublished = "Draft" |
| ordering | number | Sort position |

### Module Fields

| Field | Type |
|-------|------|
| id | string |
| title | string |
| description | string \| null |
| order | number |

### Lesson Fields

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| title | string | |
| type | `"text" \| "video" \| "quiz" \| "pdf"` | |
| content | string \| null | HTML; text lessons only |
| notes | string \| null | HTML; shown to learners in collapsible panel |
| videoFilename | string \| null | Stored filename; video lessons only |
| pdfFilename | string \| null | Stored filename; pdf lessons only |
| passMarkPercentage | number | 0 = no requirement; quiz lessons only |
| maxAttempts | number | 0 = unlimited; quiz lessons only |
| randomizeQuestions | boolean | quiz lessons only |
| randomizeAnswers | boolean | quiz lessons only |
| showCorrectAnswers | boolean | quiz lessons only |
| moduleId | string | |
| quizQuestions | QuizQuestion[] | quiz lessons only |

### QuizQuestion Fields

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| questionText | string | |
| options | string[] | Minimum 2 |
| multiSelect | boolean | |
| correctOptionIndex | number | Single-select questions |
| correctOptionIndices | number[] \| null | Multi-select questions |
| order | number | |

---

## Quiz System

### Learner Flow

1. `QuizPlayer` renders questions sorted by `order` (shuffled if `randomizeQuestions`)
2. Answer options are shown in original order unless `randomizeAnswers` is set, in which case they are shuffled independently per question using Fisher-Yates
3. Shuffles are re-applied on retry (different seed each time)
4. **Single-select questions** use radio-style buttons; **multi-select questions** use checkbox-style buttons and show "(Select all that apply)"
5. All questions must be answered before submission
6. On submit, answers are sent to `POST /lessons/:lessonId/submit` with original (not display) option indices
7. If `showCorrectAnswers` is true, correct options are highlighted green and incorrect selected options red; otherwise only the selected option is highlighted grey
8. Score is shown as `correct / total (percentage%)`
9. If `passMarkPercentage > 0` and the learner passes, `onPassed` callback fires (marks lesson complete, refreshes sidebar)
10. "Retry Quiz" resets state; shuffle re-randomises

### Attempt Limits

- If `passMarkPercentage > 0` or `maxAttempts > 0`, `QuizPlayer` fetches `GET /lessons/:lessonId/attempts` on mount to check existing attempts
- If `maxAttempts > 0` and the learner has used all attempts without passing, quiz inputs are disabled and a message directs them to contact an admin
- Admin can reset attempts via the lesson edit page or user detail page

### Quiz Gating

A quiz with `passMarkPercentage > 0` that has not been passed acts as a gate. All lessons that appear after it in the flat ordered list of course lessons are locked:

- Locked lessons show 🔒 on the course detail page and in the sidebar, and cannot be navigated to
- The "Next" navigation button on the lesson page is replaced by "Pass the quiz to continue"

Gating is computed client-side from the progress API response, which includes `passMarkPercentage` and `completed` per lesson. An incomplete quiz lesson with `passMarkPercentage > 0` triggers gating for all subsequent lessons regardless of module boundary.

---

## Components

### `Navbar`

Shows the LMS logo (links to `/`). When authenticated:

- "Courses" link (always)
- "Admin" link (admin users only)
- User name with role badge
- Logout button (calls `logout()`, redirects to `/login`)

When unauthenticated: Login and Register links.

### `ProgressBar`

```tsx
<ProgressBar percentage={number} className?: string />
```

Renders a blue filled bar (Tailwind `bg-blue-600`) on a grey track. Width is set via inline `style`. Includes a CSS transition.

### `LessonSidebar`

Sticky sidebar (hidden below `lg`). Fetches `GET /progress/courses/:courseId` on mount and when `refreshKey` changes.

Shows:

- Course title (links back to course detail)
- Overall progress: completed/total + percentage + `ProgressBar`
- Per-module sections: module title, completed/total count
- Per-lesson list items: completion dot (green ✓ if complete, grey if not), lesson title
  - Current lesson highlighted with blue left border
  - Locked lessons (quiz gating) shown with 🔒, not clickable
  - Unlocked lessons link to `/lessons/:lessonId?moduleId=:moduleId&courseId=:courseId`

### `QuizPlayer`

See [Quiz System](#quiz-system) above.

---

## API Endpoints Consumed

| Method | Path | Used by |
|--------|------|---------|
| POST | `/auth/login` | Login page |
| POST | `/auth/register` | Register page |
| GET | `/courses` | Course list, admin courses |
| POST | `/courses` | Admin — create course |
| GET | `/courses/:id` | Course detail, lesson page nav, admin edit |
| PATCH | `/courses/:id` | Admin — edit course |
| DELETE | `/courses/:id` | Admin — delete course |
| POST | `/courses/:id/modules` | Admin — create module |
| GET | `/courses/:id/modules/:id` | Admin — edit module |
| PATCH | `/courses/:id/modules/:id` | Admin — edit module / reorder lessons |
| DELETE | `/courses/:id/modules/:id` | Admin — delete module |
| GET | `/modules/:id/lessons/:id` | Lesson page, admin edit lesson |
| POST | `/modules/:id/lessons` | Admin — create lesson |
| PATCH | `/modules/:id/lessons/:id` | Admin — edit lesson / reorder |
| DELETE | `/modules/:id/lessons/:id` | Admin — delete lesson |
| POST | `/lessons/:id/questions` | Admin — add quiz question |
| DELETE | `/lessons/:id/questions/:id` | Admin — delete quiz question |
| POST | `/lessons/:id/submit` | Quiz — submit answers |
| GET | `/lessons/:id/attempts` | Quiz — load prior attempts |
| GET | `/lessons/:id/attempts/admin` | Admin lesson — view all user attempts |
| POST | `/lessons/:id/reset-attempts/:userId` | Admin — reset user quiz attempts |
| POST | `/progress/complete` | Lesson page — mark lesson complete |
| GET | `/progress/courses/:id` | Course detail, progress page, lesson page, sidebar |
| GET | `/progress/admin/overview` | Admin users list |
| GET | `/progress/admin/users/:id` | Admin user detail |
| DELETE | `/progress/admin/users/:id/courses/:id` | Admin — reset course progress |
| DELETE | `/progress/admin/users/:id/modules/:id` | Admin — reset module progress |
| GET | `/users/:id` | Admin user detail |
| PATCH | `/users/:id/password` | Admin — change user password |
| POST | `/uploads/video` | Admin — upload video file |
| POST | `/uploads/pdf` | Admin — upload PDF file |

---

## File Uploads

### Video

- Accepted MIME types: `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime`
- Max size: 100 MB (enforced by backend)
- Endpoint: `POST /uploads/video` (multipart, field name `video`)
- Response: `{ filename, originalName, size, mimetype }`
- Stored filename is referenced in lesson as `videoFilename`
- Served at `/uploads/videos/:filename`

### PDF

- Accepted MIME type: `application/pdf`
- Max size: 50 MB (enforced by backend)
- Endpoint: `POST /uploads/pdf` (multipart, field name `pdf`)
- Response: `{ filename }`
- Stored filename is referenced in lesson as `pdfFilename`
- Served at `/uploads/pdfs/:filename`

Uploads can be made from:
- The dedicated `/admin/uploads` page (video only)
- Inline on the Edit Module page when creating a lesson
- Inline on the Edit Lesson page when changing a lesson's file
