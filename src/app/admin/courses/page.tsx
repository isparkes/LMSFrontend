"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  requireEnrollment: boolean;
  ordering: number;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", ordering: 0 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = () => {
    apiFetch<Course[]>("/courses")
      .then((data) => {
        setCourses(data);
        const nextOrder = data.length > 0 ? Math.max(...data.map(c => c.ordering)) + 1 : 0;
        setForm(f => ({ ...f, ordering: nextOrder }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await apiFetch("/courses", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(f => ({ ...f, title: "", description: "" }));
      loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const sortedCourses = [...courses].sort((a, b) => a.ordering - b.ordering);

  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedCourses.length) return;

    const reordered = [...sortedCourses];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(swapIndex, 0, moved);

    try {
      await Promise.all(
        reordered.map((course, i) =>
          apiFetch(`/courses/${course.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ordering: i }),
          }),
        ),
      );
      loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course? This will also delete all modules and lessons."))
      return;
    try {
      await apiFetch(`/courses/${id}`, { method: "DELETE" });
      loadCourses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Courses</h1>

      <form
        onSubmit={handleCreate}
        className="bg-panel p-4 rounded-lg shadow mb-6 space-y-3"
      >
        <h2 className="font-semibold">Create New Course</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Course title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="number"
            placeholder="Order"
            min={0}
            value={form.ordering}
            onChange={(e) =>
              setForm((f) => ({ ...f, ordering: parseInt(e.target.value) || 0 }))
            }
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Course"}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-panel rounded-lg shadow">
          <table className="w-full text-left">
            <thead className="border-b bg-panel-alt">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Published</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Enrollment</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Order</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedCourses.map((course, index) => (
                <tr key={course.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-brand hover:underline font-medium"
                    >
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        course.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        course.requireEnrollment
                          ? "bg-brand-subtle text-brand-dark"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {course.requireEnrollment ? "Enrollment required" : "Open"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-xs leading-none"
                        title="Move up"
                      >
                        &#9650;
                      </button>
                      <button
                        onClick={() => handleMove(index, "down")}
                        disabled={index === sortedCourses.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-xs leading-none"
                        title="Move down"
                      >
                        &#9660;
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No courses yet. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
