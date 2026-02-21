"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

interface UserOverview {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "learner";
  createdAt: string;
  lastLoginAt: string | null;
  courses: CourseProgress[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<UserOverview[]>("/progress/admin/overview")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (error)
    return <p className="text-center py-10 text-red-600">{error}</p>;

  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      user.email.toLowerCase().includes(q) ||
      user.firstName.toLowerCase().includes(q) ||
      user.lastName.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-80"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 font-medium text-gray-700">Role</th>
              <th className="px-4 py-3 font-medium text-gray-700">Registered</th>
              <th className="px-4 py-3 font-medium text-gray-700">Last Login</th>
              <th className="px-4 py-3 font-medium text-gray-700">Overall Progress</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const totalLessons = user.courses.reduce((s, c) => s + c.totalLessons, 0);
              const completedLessons = user.courses.reduce((s, c) => s + c.completedLessons, 0);
              const overallPct = totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

              return (
                <tr key={user.userId} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {totalLessons > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                          <div
                            className="bg-brand h-2 rounded-full transition-all"
                            style={{ width: `${overallPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {completedLessons}/{totalLessons}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No lessons</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.userId}`}
                      className="text-brand hover:text-brand-dark text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
