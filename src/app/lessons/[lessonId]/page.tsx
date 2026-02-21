"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import QuizPlayer from "@/components/QuizPlayer";
import LessonSidebar from "@/components/LessonSidebar";

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  multiSelect?: boolean;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "quiz" | "pdf";
  content: string | null;
  notes: string | null;
  videoFilename: string | null;
  pdfFilename: string | null;
  passMarkPercentage: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showCorrectAnswers: boolean;
  moduleId: string;
  quizQuestions: QuizQuestion[];
}

interface LessonRef {
  id: string;
  title: string;
  moduleId: string;
}

export default function LessonPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get("moduleId");
  const courseId = searchParams.get("courseId");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<LessonRef | null>(null);
  const [nextLesson, setNextLesson] = useState<LessonRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [nextLessonLocked, setNextLessonLocked] = useState(false);

  useEffect(() => {
    if (!moduleId) {
      setError("Lesson not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setCompleted(false);
    setQuizPassed(false);
    setPrevLesson(null);
    setNextLesson(null);
    setNextLessonLocked(false);

    const fetchLesson = apiFetch<Lesson>(`/modules/${moduleId}/lessons/${lessonId}`);

    const fetchNav = courseId
      ? apiFetch<{
          modules: {
            id: string;
            order: number;
            lessons: { id: string; title: string; order: number }[];
          }[];
        }>(`/courses/${courseId}`).then((course) => {
          const allLessons: LessonRef[] = [];
          const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);
          for (const mod of sortedModules) {
            const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
            for (const l of sortedLessons) {
              allLessons.push({ id: l.id, title: l.title, moduleId: mod.id });
            }
          }
          const idx = allLessons.findIndex((l) => l.id === lessonId);
          const prev = idx > 0 ? allLessons[idx - 1] : null;
          const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
          return { prev, next };
        })
      : Promise.resolve({ prev: null as LessonRef | null, next: null as LessonRef | null });

    // Check if quiz was already passed and compute locked lessons
    const fetchProgress = courseId
      ? apiFetch<{
          modules: {
            lessons: { lessonId: string; completed: boolean; passMarkPercentage: number }[];
          }[];
        }>(`/progress/courses/${courseId}`).then((progress) => {
          const lockedSet = new Set<string>();
          let blocked = false;
          for (const mod of progress.modules) {
            for (const l of mod.lessons) {
              if (l.lessonId === lessonId && l.completed) {
                setQuizPassed(true);
              }
              if (blocked) {
                lockedSet.add(l.lessonId);
              } else if (
                (l.passMarkPercentage || 0) > 0 &&
                !l.completed
              ) {
                blocked = true;
              }
            }
          }
          // We'll check if next lesson is locked after nav is resolved
          return lockedSet;
        }).catch(() => new Set<string>())
      : Promise.resolve(new Set<string>());

    Promise.all([fetchLesson, fetchNav, fetchProgress])
      .then(([lessonData, navData, lockedSet]) => {
        setLesson(lessonData);
        if (navData) {
          setPrevLesson(navData.prev);
          setNextLesson(navData.next);
          if (navData.next && lockedSet.has(navData.next.id)) {
            setNextLessonLocked(true);
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load lesson"))
      .finally(() => setLoading(false));
  }, [lessonId, moduleId, courseId]);

  const handleMarkComplete = async () => {
    setCompleting(true);
    try {
      await apiFetch("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ lessonId }),
      });
      setCompleted(true);
      setSidebarRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark complete");
    } finally {
      setCompleting(false);
    }
  };

  const navQuery = (ref: LessonRef) =>
    `?moduleId=${ref.moduleId}${courseId ? `&courseId=${courseId}` : ""}`;

  const renderNotes = (html: string) => {
    // Auto-link plain URLs that aren't already inside an href or tag
    const linked = html.replace(
      /(?<!="|'>)(https?:\/\/[^\s<>"']+)/g,
      '<a href="$1">$1</a>',
    );
    // Convert newlines to <br> if the content doesn't contain block-level HTML
    const hasBlockHtml = /<(p|div|ul|ol|h[1-6]|table|br)\b/i.test(linked);
    return hasBlockHtml ? linked : linked.replace(/\n/g, "<br>");
  };

  const lessonContent = (
    <>
      {loading && (
        <p className="text-center py-10 text-gray-500">Loading lesson...</p>
      )}
      {error && <p className="text-center py-10 text-red-600">{error}</p>}
      {!loading && !error && lesson && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">{lesson.title}</h1>
              <p className="text-sm text-gray-500 uppercase">{lesson.type} lesson</p>
            </div>
            {courseId && (
              <Link
                href={`/courses/${courseId}`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Back to Course
              </Link>
            )}
          </div>

          {lesson.type === "text" && (
            <div className="bg-white rounded-lg shadow p-6">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: lesson.content || "" }}
              />
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleMarkComplete}
                  disabled={completing || completed}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {completed
                    ? "Completed!"
                    : completing
                      ? "Marking..."
                      : "Mark as Complete"}
                </button>
              </div>
            </div>
          )}

          {lesson.type === "video" && (
            <div className="bg-white rounded-lg shadow p-6">
              {lesson.videoFilename ? (
                <>
                  <video
                    controls
                    className="w-full rounded"
                    src={`/uploads/videos/${lesson.videoFilename.replace(/^videos\//, "")}`}
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const msg = el.parentElement?.querySelector("[data-video-error]");
                      if (msg) (msg as HTMLElement).style.display = "block";
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p
                    data-video-error
                    className="text-red-500 py-4"
                    style={{ display: "none" }}
                  >
                    Failed to load video: {lesson.videoFilename}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">No video file associated with this lesson.</p>
              )}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleMarkComplete}
                  disabled={completing || completed}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {completed
                    ? "Completed!"
                    : completing
                      ? "Marking..."
                      : "Mark as Complete"}
                </button>
              </div>
            </div>
          )}

          {lesson.type === "pdf" && (
            <div className="bg-white rounded-lg shadow p-6">
              {lesson.pdfFilename ? (
                <iframe
                  src={`/uploads/pdfs/${lesson.pdfFilename}`}
                  className="w-full rounded border"
                  style={{ height: "80vh" }}
                />
              ) : (
                <p className="text-gray-500">No PDF file associated with this lesson.</p>
              )}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleMarkComplete}
                  disabled={completing || completed}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {completed
                    ? "Completed!"
                    : completing
                      ? "Marking..."
                      : "Mark as Complete"}
                </button>
              </div>
            </div>
          )}

          {lesson.type === "quiz" && (
            <QuizPlayer
              lessonId={lesson.id}
              questions={lesson.quizQuestions || []}
              passMarkPercentage={lesson.passMarkPercentage || 0}
              maxAttempts={lesson.maxAttempts || 0}
              randomizeQuestions={lesson.randomizeQuestions || false}
              randomizeAnswers={lesson.randomizeAnswers || false}
              showCorrectAnswers={lesson.showCorrectAnswers !== false}
              onPassed={() => {
                setQuizPassed(true);
                setNextLessonLocked(false);
                setSidebarRefreshKey((k) => k + 1);
              }}
            />
          )}

          {lesson.notes && (
            <div className="bg-white rounded-lg shadow mt-6">
              <button
                onClick={() => setNotesOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span>Notes</span>
                <span className="text-gray-400 text-sm">{notesOpen ? "▲" : "▼"}</span>
              </button>
              {notesOpen && (
                <div className="px-4 pb-4">
                  <div
                    className="prose max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all"
                    dangerouslySetInnerHTML={{ __html: renderNotes(lesson.notes) }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === "A" && !(target as HTMLAnchorElement).target) {
                        (target as HTMLAnchorElement).target = "_blank";
                        (target as HTMLAnchorElement).rel = "noopener noreferrer";
                      }
                    }}
                    ref={(el) => {
                      if (!el) return;
                      el.querySelectorAll("a").forEach((a) => {
                        a.target = "_blank";
                        a.rel = "noopener noreferrer";
                      });
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {(prevLesson || nextLesson) && (() => {
            const quizBlocked =
              lesson.type === "quiz" &&
              (lesson.passMarkPercentage || 0) > 0 &&
              !completed &&
              !quizPassed;
            const nextBlocked = quizBlocked || nextLessonLocked;
            return (
              <nav className="flex items-center justify-between mt-8 pt-6 border-t">
                {prevLesson ? (
                  <Link
                    href={`/lessons/${prevLesson.id}${navQuery(prevLesson)}`}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <span aria-hidden="true">&larr;</span>
                    <span className="text-sm">{prevLesson.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {nextLesson ? (
                  nextBlocked ? (
                    <span className="flex items-center gap-2 text-gray-400 cursor-not-allowed">
                      <span className="text-sm">
                        {quizBlocked
                          ? "Pass the quiz to continue"
                          : "Complete the required quiz to continue"}
                      </span>
                      <span aria-hidden="true">&rarr;</span>
                    </span>
                  ) : (
                    <Link
                      href={`/lessons/${nextLesson.id}${navQuery(nextLesson)}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <span className="text-sm">{nextLesson.title}</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  )
                ) : (
                  <span />
                )}
              </nav>
            );
          })()}
        </div>
      )}
    </>
  );

  if (!courseId) {
    return <div className="max-w-3xl mx-auto">{lessonContent}</div>;
  }

  return (
    <div className="flex gap-6 -mx-4 -my-6 px-4 py-6">
      <LessonSidebar
        courseId={courseId}
        currentLessonId={lessonId}
        refreshKey={sidebarRefreshKey}
      />
      <div className="flex-1 min-w-0">{lessonContent}</div>
    </div>
  );
}
