"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Module {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: { id: string }[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  ordering: number;
  modules: Module[];
}

export default function AdminCourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnail: "",
    isPublished: false,
    ordering: 0,
  });

  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    order: 0,
  });
  const [creatingModule, setCreatingModule] = useState(false);

  const loadCourse = () => {
    apiFetch<Course>(`/courses/${courseId}`)
      .then((data) => {
        setCourse(data);
        setForm({
          title: data.title,
          description: data.description || "",
          thumbnail: data.thumbnail || "",
          isPublished: data.isPublished,
          ordering: data.ordering,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadCourse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingModule(true);
    try {
      await apiFetch(`/courses/${courseId}/modules`, {
        method: "POST",
        body: JSON.stringify(moduleForm),
      });
      setModuleForm({ title: "", description: "", order: 0 });
      loadCourse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create module");
    } finally {
      setCreatingModule(false);
    }
  };

  const handleMoveModule = async (index: number, direction: "up" | "down") => {
    if (!course) return;
    const sorted = [...course.modules].sort((a, b) => a.order - b.order);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(swapIndex, 0, moved);

    try {
      await Promise.all(
        reordered.map((mod, i) =>
          apiFetch(`/courses/${courseId}/modules/${mod.id}`, {
            method: "PATCH",
            body: JSON.stringify({ order: i }),
          }),
        ),
      );
      loadCourse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    try {
      await apiFetch(`/courses/${courseId}/modules/${moduleId}`, {
        method: "DELETE",
      });
      loadCourse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete module");
    }
  };

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (!course) return <p className="text-center py-10 text-red-600">{error}</p>;

  const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);

  return (
    <div>
      <Link href="/admin/courses" className="text-brand hover:underline text-sm">
        &larr; Back to courses
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Edit Course</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form
        onSubmit={handleSave}
        className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail URL
            </label>
            <input
              type="text"
              value={form.thumbnail}
              onChange={(e) =>
                setForm((f) => ({ ...f, thumbnail: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPublished: e.target.checked }))
              }
            />
            <span className="text-sm">Published</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm">Order:</label>
            <input
              type="number"
              min={0}
              value={form.ordering}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  ordering: parseInt(e.target.value) || 0,
                }))
              }
              className="w-20 border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-semibold text-lg mb-3">Modules</h2>
        <form
          onSubmit={handleCreateModule}
          className="flex gap-3 items-end mb-4"
        >
          <input
            type="text"
            placeholder="Module title"
            required
            value={moduleForm.title}
            onChange={(e) =>
              setModuleForm((f) => ({ ...f, title: e.target.value }))
            }
            className="border border-gray-300 rounded px-3 py-2 flex-1"
          />
          <input
            type="text"
            placeholder="Description"
            value={moduleForm.description}
            onChange={(e) =>
              setModuleForm((f) => ({ ...f, description: e.target.value }))
            }
            className="border border-gray-300 rounded px-3 py-2 flex-1"
          />
          <input
            type="number"
            placeholder="Order"
            min={0}
            value={moduleForm.order}
            onChange={(e) =>
              setModuleForm((f) => ({
                ...f,
                order: parseInt(e.target.value) || 0,
              }))
            }
            className="border border-gray-300 rounded px-3 py-2 w-20"
          />
          <button
            type="submit"
            disabled={creatingModule}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
          >
            Add Module
          </button>
        </form>

        <div className="space-y-2">
          {sortedModules.map((mod, index) => (
            <div
              key={mod.id}
              className="flex items-center gap-2 border rounded p-3"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveModule(index, "up")}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-xs leading-none"
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleMoveModule(index, "down")}
                  disabled={index === sortedModules.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-xs leading-none"
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/courses/${courseId}/modules/${mod.id}`}
                  className="text-brand hover:underline font-medium"
                >
                  {mod.title}
                </Link>
                <span className="text-xs text-gray-400 ml-2">
                  {(mod.lessons || []).length} lessons
                </span>
              </div>
              <button
                onClick={() => handleDeleteModule(mod.id)}
                className="text-red-600 hover:text-red-800 text-sm shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
          {sortedModules.length === 0 && (
            <p className="text-gray-400 text-sm">No modules yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
