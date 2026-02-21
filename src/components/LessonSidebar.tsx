"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import ProgressBar from "./ProgressBar";

interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  lessonType: string;
  completed: boolean;
  passMarkPercentage: number;
}

interface ModuleProgress {
  moduleId: string;
  moduleTitle: string;
  totalLessons: number;
  completedLessons: number;
  lessons: LessonProgress[];
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  modules: ModuleProgress[];
}

interface LessonSidebarProps {
  courseId: string;
  currentLessonId: string;
  refreshKey?: number;
}

export default function LessonSidebar({
  courseId,
  currentLessonId,
  refreshKey,
}: LessonSidebarProps) {
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  useEffect(() => {
    apiFetch<CourseProgress>(`/progress/courses/${courseId}`)
      .then(setProgress)
      .catch(() => {});
  }, [courseId, refreshKey]);

  // Build a set of locked lesson IDs based on quiz gates
  const lockedLessons = new Set<string>();
  if (progress) {
    let blocked = false;
    for (const mod of progress.modules) {
      for (const lesson of mod.lessons) {
        if (blocked) {
          lockedLessons.add(lesson.lessonId);
        } else if (
          lesson.lessonType === "quiz" &&
          (lesson.passMarkPercentage || 0) > 0 &&
          !lesson.completed
        ) {
          // This quiz is a gate — all lessons after it are locked
          blocked = true;
        }
      }
    }
  }

  if (!progress) return null;

  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <div className="sticky top-6 bg-panel rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <Link
            href={`/courses/${courseId}`}
            className="font-semibold text-sm hover:text-brand line-clamp-2"
          >
            {progress.courseTitle}
          </Link>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>
              {progress.completedLessons}/{progress.totalLessons} completed
            </span>
            <span>{progress.progressPercentage}%</span>
          </div>
          <ProgressBar percentage={progress.progressPercentage} className="mt-1" />
        </div>

        <nav className="max-h-[calc(100vh-12rem)] overflow-y-auto">
          {progress.modules.map((mod) => (
            <div key={mod.moduleId}>
              <div className="px-4 py-2 bg-panel-alt border-b">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase truncate">
                    {mod.moduleTitle}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {mod.completedLessons}/{mod.totalLessons}
                  </span>
                </div>
              </div>
              <ul className="divide-y divide-gray-100">
                {mod.lessons.map((lesson) => {
                  const isCurrent = lesson.lessonId === currentLessonId;
                  const isLocked = lockedLessons.has(lesson.lessonId);

                  if (isLocked) {
                    return (
                      <li key={lesson.lessonId}>
                        <span className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 bg-gray-200">
                            🔒
                          </span>
                          <span className="truncate">{lesson.lessonTitle}</span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={lesson.lessonId}>
                      <Link
                        href={`/lessons/${lesson.lessonId}?moduleId=${mod.moduleId}&courseId=${courseId}`}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                          isCurrent
                            ? "bg-brand-subtle text-brand-dark font-medium border-l-2 border-brand"
                            : "hover:bg-panel-alt text-gray-700"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                            lesson.completed
                              ? "bg-green-500 text-white"
                              : isCurrent
                                ? "bg-brand-subtle border border-brand"
                                : "bg-gray-200"
                          }`}
                        >
                          {lesson.completed ? "✓" : ""}
                        </span>
                        <span className="truncate">{lesson.lessonTitle}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
