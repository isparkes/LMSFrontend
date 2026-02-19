"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import ProgressBar from "@/components/ProgressBar";

interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  lessonType: string;
  completed: boolean;
  score: number | null;
  completedAt: string | null;
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

export default function CourseProgressPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<CourseProgress>(`/progress/courses/${courseId}`)
      .then(setProgress)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (error) return <p className="text-center py-10 text-red-600">{error}</p>;
  if (!progress) return null;

  return (
    <div>
      <Link
        href={`/courses/${courseId}`}
        className="text-blue-600 hover:underline text-sm"
      >
        &larr; Back to course
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">{progress.courseTitle}</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Overall Progress</span>
          <span className="text-sm text-gray-600">
            {progress.completedLessons}/{progress.totalLessons} lessons (
            {progress.progressPercentage}%)
          </span>
        </div>
        <ProgressBar percentage={progress.progressPercentage} />
      </div>

      <div className="space-y-4">
        {progress.modules.map((mod) => (
          <div key={mod.moduleId} className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">{mod.moduleTitle}</h2>
                <span className="text-sm text-gray-500">
                  {mod.completedLessons}/{mod.totalLessons}
                </span>
              </div>
              <ProgressBar
                percentage={
                  mod.totalLessons > 0
                    ? Math.round(
                        (mod.completedLessons / mod.totalLessons) * 100,
                      )
                    : 0
                }
                className="mt-2"
              />
            </div>
            <ul className="divide-y">
              {mod.lessons.map((lesson) => (
                <li
                  key={lesson.lessonId}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        lesson.completed
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {lesson.completed ? "✓" : ""}
                    </span>
                    <Link
                      href={`/lessons/${lesson.lessonId}`}
                      className="hover:text-blue-600"
                    >
                      {lesson.lessonTitle}
                    </Link>
                    <span className="text-xs text-gray-400 uppercase">
                      {lesson.lessonType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {lesson.score !== null && (
                      <span>Score: {Math.round(lesson.score * 100)}%</span>
                    )}
                    {lesson.completedAt && (
                      <span className="ml-2">
                        {new Date(lesson.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
