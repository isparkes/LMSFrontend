"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "learner";
  createdAt: string;
  lastLoginAt: string | null;
}

interface QuizInfo {
  attemptCount: number;
  maxAttempts: number;
  passMarkPercentage: number;
  bestScore: number | null;
  passed: boolean;
}

interface LessonProgress {
  lessonId: string;
  lessonTitle: string;
  lessonType: "video" | "text" | "quiz" | "pdf";
  completed: boolean;
  score: number | null;
  completedAt: string | null;
  quiz: QuizInfo | null;
}

interface ModuleProgress {
  moduleId: string;
  moduleTitle: string;
  totalLessons: number;
  completedLessons: number;
  lessons: LessonProgress[];
}

interface CourseDetailedProgress {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  modules: ModuleProgress[];
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [progress, setProgress] = useState<CourseDetailedProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [resettingLessonId, setResettingLessonId] = useState<string | null>(
    null,
  );
  const [resettingCourseId, setResettingCourseId] = useState<string | null>(null);
  const [resettingModuleId, setResettingModuleId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<UserDetail>(`/users/${userId}`),
      apiFetch<CourseDetailedProgress[]>(`/progress/admin/users/${userId}`),
    ])
      .then(([u, p]) => {
        setUser(u);
        setProgress(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch(`/users/${userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      setPasswordSuccess("Password changed successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError(
        e instanceof Error ? e.message : "Failed to change password",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResetAttempts = async (lessonId: string) => {
    if (
      !confirm(
        "Reset all quiz attempts for this user on this lesson? They will be able to retake the quiz.",
      )
    )
      return;
    setResettingLessonId(lessonId);
    try {
      await apiFetch(`/lessons/${lessonId}/reset-attempts/${userId}`, {
        method: "POST",
      });
      const updated = await apiFetch<CourseDetailedProgress[]>(
        `/progress/admin/users/${userId}`,
      );
      setProgress(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset attempts");
    } finally {
      setResettingLessonId(null);
    }
  };

  const handleResetCourse = async (courseId: string, courseTitle: string) => {
    if (
      !confirm(
        `Reset all progress for "${courseTitle}"? This will clear all lesson completions and quiz attempts for this user on this course.`,
      )
    )
      return;
    setResettingCourseId(courseId);
    try {
      await apiFetch(`/progress/admin/users/${userId}/courses/${courseId}`, {
        method: "DELETE",
      });
      const updated = await apiFetch<CourseDetailedProgress[]>(
        `/progress/admin/users/${userId}`,
      );
      setProgress(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset course progress");
    } finally {
      setResettingCourseId(null);
    }
  };

  const handleResetModule = async (moduleId: string, moduleTitle: string) => {
    if (
      !confirm(
        `Reset all progress for module "${moduleTitle}"? This will clear all lesson completions and quiz attempts for this user in this module.`,
      )
    )
      return;
    setResettingModuleId(moduleId);
    try {
      await apiFetch(`/progress/admin/users/${userId}/modules/${moduleId}`, {
        method: "DELETE",
      });
      const updated = await apiFetch<CourseDetailedProgress[]>(
        `/progress/admin/users/${userId}`,
      );
      setProgress(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset module progress");
    } finally {
      setResettingModuleId(null);
    }
  };

  if (loading)
    return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (!user)
    return <p className="text-center py-10 text-red-600">{error || "User not found"}</p>;

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
      >
        &larr; Back to Users
      </Link>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {user.firstName} {user.lastName}
        </h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user.email}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              user.role === "admin"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {user.role}
          </span>
          <span>Registered {new Date(user.createdAt).toLocaleDateString()}</span>
          <span>
            Last login:{" "}
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString()
              : "Never"}
          </span>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold text-lg mb-3">Change Password</h2>
        <form onSubmit={handleChangePassword} className="flex gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm w-56"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm w-56"
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
        {passwordError && (
          <p className="text-red-600 text-sm mt-2">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-green-600 text-sm mt-2">{passwordSuccess}</p>
        )}
      </div>

      {/* Course Progress */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Course Progress</h2>
        {progress.length === 0 && (
          <p className="text-gray-400 text-sm">No courses available.</p>
        )}
        {progress.map((course) => {
          const expanded = expandedCourses.has(course.courseId);
          return (
            <div
              key={course.courseId}
              className="bg-white rounded-lg shadow"
            >
              <button
                onClick={() => toggleCourse(course.courseId)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="font-medium truncate">
                    {course.courseTitle}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="bg-gray-200 rounded-full h-2 w-24">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${course.progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {course.completedLessons}/{course.totalLessons} lessons
                    </span>
                  </div>
                </div>
                <span className="text-gray-400 text-sm ml-2">
                  {expanded ? "▲" : "▼"}
                </span>
              </button>
              {expanded && course.completedLessons > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetCourse(course.courseId, course.courseTitle);
                  }}
                  disabled={resettingCourseId === course.courseId}
                  className="text-red-600 hover:text-red-800 text-xs px-4 py-1 disabled:opacity-50"
                >
                  {resettingCourseId === course.courseId
                    ? "Resetting..."
                    : "Reset Course"}
                </button>
              )}

              {expanded && (
                <div className="px-4 pb-4 space-y-4">
                  {course.modules.map((mod) => (
                    <div key={mod.moduleId}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">
                          {mod.moduleTitle}
                          <span className="text-gray-400 font-normal ml-2">
                            ({mod.completedLessons}/{mod.totalLessons})
                          </span>
                        </h3>
                        {mod.completedLessons > 0 && (
                          <button
                            onClick={() =>
                              handleResetModule(mod.moduleId, mod.moduleTitle)
                            }
                            disabled={resettingModuleId === mod.moduleId}
                            className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                          >
                            {resettingModuleId === mod.moduleId
                              ? "Resetting..."
                              : "Reset Module"}
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {mod.lessons.map((lesson) => (
                          <div
                            key={lesson.lessonId}
                            className="flex items-center justify-between py-1.5 px-3 rounded text-sm hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {lesson.completed ? (
                                <span className="text-green-600 flex-shrink-0">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-gray-300 flex-shrink-0">
                                  ○
                                </span>
                              )}
                              <span className="truncate">
                                {lesson.lessonTitle}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  lesson.lessonType === "quiz"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : lesson.lessonType === "video"
                                      ? "bg-blue-100 text-blue-700"
                                      : lesson.lessonType === "pdf"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {lesson.lessonType}
                              </span>
                            </div>

                            {lesson.quiz && (
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-500">
                                  {lesson.quiz.attemptCount}
                                  {lesson.quiz.maxAttempts > 0
                                    ? `/${lesson.quiz.maxAttempts}`
                                    : ""}{" "}
                                  attempts
                                </span>
                                {lesson.quiz.bestScore !== null && (
                                  <span className="text-xs text-gray-500">
                                    Best: {Math.round(lesson.quiz.bestScore * 100)}%
                                  </span>
                                )}
                                {lesson.quiz.attemptCount > 0 && (
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      lesson.quiz.passed
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {lesson.quiz.passed ? "Passed" : "Failed"}
                                  </span>
                                )}
                                {lesson.quiz.attemptCount > 0 && (
                                  <button
                                    onClick={() =>
                                      handleResetAttempts(lesson.lessonId)
                                    }
                                    disabled={
                                      resettingLessonId === lesson.lessonId
                                    }
                                    className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                                  >
                                    {resettingLessonId === lesson.lessonId
                                      ? "Resetting..."
                                      : "Reset"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
