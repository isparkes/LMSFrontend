"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import FilePicker from "@/components/FilePicker";

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

export default function AdminModuleEditPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;

  const [mod, setMod] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", order: 0 });
  const [lessonForm, setLessonForm] = useState({
    title: "",
    type: "text" as "video" | "text" | "quiz" | "pdf",
    order: 0,
    notes: "",
    content: "",
    videoFilename: "",
    pdfFilename: "",
    passMarkPercentage: 0,
    maxAttempts: 0,
    randomizeQuestions: false,
    randomizeAnswers: false,
    showCorrectAnswers: true,
  });
  const [creatingLesson, setCreatingLesson] = useState(false);

  const loadModule = () => {
    apiFetch<Module>(`/courses/${courseId}/modules/${moduleId}`)
      .then((data) => {
        setMod(data);
        setForm({
          title: data.title,
          description: data.description || "",
          order: data.order,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadModule();
  }, [courseId, moduleId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/courses/${courseId}/modules/${moduleId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadModule();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLesson(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        title: lessonForm.title,
        type: lessonForm.type,
        order: lessonForm.order,
        notes: lessonForm.notes || null,
      };
      if (lessonForm.type === "text") body.content = lessonForm.content;
      if (lessonForm.type === "video")
        body.videoFilename = lessonForm.videoFilename;
      if (lessonForm.type === "pdf")
        body.pdfFilename = lessonForm.pdfFilename;
      if (lessonForm.type === "quiz") {
        body.passMarkPercentage = lessonForm.passMarkPercentage;
        body.maxAttempts = lessonForm.maxAttempts;
        body.randomizeQuestions = lessonForm.randomizeQuestions;
        body.randomizeAnswers = lessonForm.randomizeAnswers;
        body.showCorrectAnswers = lessonForm.showCorrectAnswers;
      }

      await apiFetch(`/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setLessonForm({
        title: "",
        type: "text",
        order: 0,
        notes: "",
        content: "",
        videoFilename: "",
        pdfFilename: "",
        passMarkPercentage: 0,
        maxAttempts: 0,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showCorrectAnswers: true,
      });
      loadModule();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lesson");
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleMoveLesson = async (index: number, direction: "up" | "down") => {
    if (!mod) return;
    const sorted = [...(mod.lessons || [])].sort((a, b) => a.order - b.order);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    // Reorder: move the item to its new position, then assign sequential order values
    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(swapIndex, 0, moved);

    try {
      await Promise.all(
        reordered.map((lesson, i) =>
          apiFetch(`/modules/${moduleId}/lessons/${lesson.id}`, {
            method: "PATCH",
            body: JSON.stringify({ order: i }),
          }),
        ),
      );
      loadModule();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      await apiFetch(`/modules/${moduleId}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      loadModule();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete lesson");
    }
  };

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (!mod) return <p className="text-center py-10 text-red-600">{error}</p>;

  const sortedLessons = [...(mod.lessons || [])].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}`}
        className="text-brand hover:underline text-sm"
      >
        &larr; Back to course
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Edit Module</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form
        onSubmit={handleSave}
        className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) =>
                setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
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

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold text-lg mb-3">Lessons</h2>
        <form onSubmit={handleCreateLesson} className="space-y-3 mb-4 border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Lesson title"
              required
              value={lessonForm.title}
              onChange={(e) =>
                setLessonForm((f) => ({ ...f, title: e.target.value }))
              }
              className="border border-gray-300 rounded px-3 py-2"
            />
            <select
              value={lessonForm.type}
              onChange={(e) =>
                setLessonForm((f) => ({
                  ...f,
                  type: e.target.value as "video" | "text" | "quiz" | "pdf",
                }))
              }
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="text">Text</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="quiz">Quiz</option>
            </select>
            <input
              type="number"
              placeholder="Order"
              min={0}
              value={lessonForm.order}
              onChange={(e) =>
                setLessonForm((f) => ({
                  ...f,
                  order: parseInt(e.target.value) || 0,
                }))
              }
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <textarea
            placeholder="Notes (optional) — supports HTML and plain URLs (auto-linked)"
            value={lessonForm.notes}
            onChange={(e) =>
              setLessonForm((f) => ({ ...f, notes: e.target.value }))
            }
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
          />
          {lessonForm.type === "text" && (
            <textarea
              placeholder="Lesson content (HTML)"
              value={lessonForm.content}
              onChange={(e) =>
                setLessonForm((f) => ({ ...f, content: e.target.value }))
              }
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          )}
          {lessonForm.type === "video" && (
            <FilePicker
              type="video"
              value={lessonForm.videoFilename}
              onChange={(filename) =>
                setLessonForm((f) => ({ ...f, videoFilename: filename }))
              }
              onError={setError}
            />
          )}
          {lessonForm.type === "pdf" && (
            <FilePicker
              type="pdf"
              value={lessonForm.pdfFilename}
              onChange={(filename) =>
                setLessonForm((f) => ({ ...f, pdfFilename: filename }))
              }
              onError={setError}
            />
          )}
          {lessonForm.type === "quiz" && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Pass Mark (%):
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={lessonForm.passMarkPercentage}
                onChange={(e) =>
                  setLessonForm((f) => ({
                    ...f,
                    passMarkPercentage: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-24 border border-gray-300 rounded px-3 py-2"
              />
              <span className="text-xs text-gray-500">0 = no pass requirement</span>
            </div>
          )}
          {lessonForm.type === "quiz" && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Max Attempts:
              </label>
              <input
                type="number"
                min={0}
                value={lessonForm.maxAttempts}
                onChange={(e) =>
                  setLessonForm((f) => ({
                    ...f,
                    maxAttempts: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-24 border border-gray-300 rounded px-3 py-2"
              />
              <span className="text-xs text-gray-500">0 = unlimited</span>
            </div>
          )}
          {lessonForm.type === "quiz" && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={lessonForm.randomizeQuestions}
                onChange={(e) =>
                  setLessonForm((f) => ({ ...f, randomizeQuestions: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              Randomize question order
            </label>
          )}
          {lessonForm.type === "quiz" && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={lessonForm.randomizeAnswers}
                onChange={(e) =>
                  setLessonForm((f) => ({ ...f, randomizeAnswers: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              Randomize answer order
            </label>
          )}
          {lessonForm.type === "quiz" && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={lessonForm.showCorrectAnswers}
                onChange={(e) =>
                  setLessonForm((f) => ({ ...f, showCorrectAnswers: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              Show correct answers after submission
            </label>
          )}
          <button
            type="submit"
            disabled={creatingLesson}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {creatingLesson ? "Creating..." : "Add Lesson"}
          </button>
        </form>

        <div className="space-y-2">
          {sortedLessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className="flex items-center gap-2 border rounded p-3"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveLesson(index, "up")}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-xs leading-none"
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleMoveLesson(index, "down")}
                  disabled={index === sortedLessons.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-25 text-xs leading-none"
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/lessons/${lesson.id}?moduleId=${moduleId}`}
                  className="text-brand hover:underline font-medium"
                >
                  {lesson.title}
                </Link>
                <span className="text-xs text-gray-400 ml-2 uppercase">
                  {lesson.type}
                </span>
              </div>
              <button
                onClick={() => handleDeleteLesson(lesson.id)}
                className="text-red-600 hover:text-red-800 text-sm shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
          {sortedLessons.length === 0 && (
            <p className="text-gray-400 text-sm">No lessons yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
