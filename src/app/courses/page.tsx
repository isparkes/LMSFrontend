"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ProgressBar from "@/components/ProgressBar";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  ordering: number;
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

export default function CoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    apiFetch<Course[]>("/courses")
      .then((data) => {
        setCourses(data);
        data.forEach((course) => {
          apiFetch<CourseProgress>(`/progress/courses/${course.id}`)
            .then((p) =>
              setProgress((prev) => ({ ...prev, [course.id]: p })),
            )
            .catch(() => {});
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <p className="text-center py-10 text-gray-500">Loading courses...</p>;
  }

  if (error) {
    return <p className="text-center py-10 text-red-600">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Courses</h1>
      {courses.length === 0 ? (
        <p className="text-gray-500">No courses available yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="bg-panel rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
            >
              {course.thumbnail && (
                <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                  {course.thumbnail}
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-lg">{course.title}</h2>
                {course.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {course.description}
                  </p>
                )}
                {!course.isPublished && (
                  <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    Draft
                  </span>
                )}
                {progress[course.id] && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {progress[course.id].completedLessons}/
                        {progress[course.id].totalLessons} lessons
                      </span>
                      <span>{Math.round(progress[course.id].progressPercentage)}%</span>
                    </div>
                    <ProgressBar percentage={progress[course.id].progressPercentage} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
