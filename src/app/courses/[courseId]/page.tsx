"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "quiz" | "pdf";
  order: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  modules: Module[];
}

interface ProgressLesson {
  lessonId: string;
  completed: boolean;
  passMarkPercentage: number;
}

interface ProgressModule {
  moduleId: string;
  lessons: ProgressLesson[];
}

interface CourseProgress {
  modules: ProgressModule[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [lockedLessons, setLockedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Course>(`/courses/${courseId}`),
      apiFetch<CourseProgress>(`/progress/courses/${courseId}`).catch(() => null),
    ])
      .then(([courseData, progressData]) => {
        setCourse(courseData);

        // Compute locked lessons from progress data
        if (progressData) {
          const locked = new Set<string>();
          let blocked = false;
          for (const mod of progressData.modules) {
            for (const lesson of mod.lessons) {
              if (blocked) {
                locked.add(lesson.lessonId);
              } else if (
                (lesson.passMarkPercentage || 0) > 0 &&
                !lesson.completed
              ) {
                blocked = true;
              }
            }
          }
          setLockedLessons(locked);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (error) return <p className="text-center py-10 text-red-600">{error}</p>;
  if (!course) return null;

  const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="text-gray-600 mt-1">{course.description}</p>
          )}
        </div>
        <Link
          href={`/courses/${courseId}/progress`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          View Progress
        </Link>
      </div>

      <div className="space-y-4">
        {sortedModules.map((mod) => {
          const sortedLessons = [...mod.lessons].sort(
            (a, b) => a.order - b.order,
          );
          return (
            <div key={mod.id} className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">{mod.title}</h2>
                {mod.description && (
                  <p className="text-gray-500 text-sm">{mod.description}</p>
                )}
              </div>
              <ul className="divide-y">
                {sortedLessons.map((lesson) => {
                  const isLocked = lockedLessons.has(lesson.id);

                  if (isLocked) {
                    return (
                      <li key={lesson.id}>
                        <span className="flex items-center gap-3 px-4 py-3 text-gray-400 cursor-not-allowed">
                          <span className="text-lg">🔒</span>
                          <span>{lesson.title}</span>
                          <span className="ml-auto text-xs uppercase">
                            {lesson.type}
                          </span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/lessons/${lesson.id}?moduleId=${mod.id}&courseId=${courseId}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg">
                          {lesson.type === "video" && "🎬"}
                          {lesson.type === "text" && "📄"}
                          {lesson.type === "quiz" && "❓"}
                          {lesson.type === "pdf" && "📑"}
                        </span>
                        <span>{lesson.title}</span>
                        <span className="ml-auto text-xs text-gray-400 uppercase">
                          {lesson.type}
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {sortedLessons.length === 0 && (
                  <li className="px-4 py-3 text-gray-400 text-sm">
                    No lessons in this module yet.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
        {sortedModules.length === 0 && (
          <p className="text-gray-500">No modules in this course yet.</p>
        )}
      </div>
    </div>
  );
}
