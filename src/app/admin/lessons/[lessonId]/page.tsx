"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import FilePicker from "@/components/FilePicker";

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  multiSelect: boolean;
  correctOptionIndices: number[] | null;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "quiz" | "pdf";
  content: string | null;
  videoFilename: string | null;
  pdfFilename: string | null;
  notes: string | null;
  passMarkPercentage: number;
  maxAttempts: number;
  questionsToShow: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showCorrectAnswers: boolean;
  moduleId: string;
  quizQuestions: QuizQuestion[];
}

interface UserAttemptSummary {
  id: string;
  name: string;
  email: string;
  attemptCount: number;
  bestScore: number;
  passed: boolean;
}

export default function AdminLessonEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get("moduleId") || "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: "",
    notes: "",
    content: "",
    videoFilename: "",
    pdfFilename: "",
    passMarkPercentage: 0,
    maxAttempts: 0,
    questionsToShow: 0,
    randomizeQuestions: false,
    randomizeAnswers: false,
    showCorrectAnswers: true,
  });

  const [questionForm, setQuestionForm] = useState({
    questionText: "",
    options: ["", ""],
    correctOptionIndex: 0,
    multiSelect: false,
    correctOptionIndices: [] as number[],
    order: 0,
  });
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [userAttempts, setUserAttempts] = useState<UserAttemptSummary[]>([]);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const loadLesson = async () => {
    if (!moduleId) {
      setError("Lesson not found");
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<Lesson>(
        `/modules/${moduleId}/lessons/${lessonId}/admin`,
      );
      setLesson(data);
      setForm({
        title: data.title,
        notes: data.notes || "",
        content: data.content || "",
        videoFilename: data.videoFilename || "",
        pdfFilename: data.pdfFilename || "",
        passMarkPercentage: data.passMarkPercentage || 0,
        maxAttempts: data.maxAttempts || 0,
        questionsToShow: data.questionsToShow || 0,
        randomizeQuestions: data.randomizeQuestions || false,
        randomizeAnswers: data.randomizeAnswers || false,
        showCorrectAnswers: data.showCorrectAnswers !== false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  const loadUserAttempts = async () => {
    try {
      const data = await apiFetch<UserAttemptSummary[]>(
        `/lessons/${lessonId}/attempts/admin`,
      );
      setUserAttempts(data);
    } catch {
      setUserAttempts([]);
    }
  };

  useEffect(() => {
    loadLesson();
    loadUserAttempts();
  }, [lessonId, moduleId]);

  const handleResetAttempts = async (userId: string) => {
    if (!confirm("Reset all attempts for this user? They will be able to retake the quiz.")) return;
    setResettingUserId(userId);
    try {
      await apiFetch(`/lessons/${lessonId}/reset-attempts/${userId}`, {
        method: "POST",
      });
      loadUserAttempts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset attempts");
    } finally {
      setResettingUserId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { title: form.title, notes: form.notes || null };
      if (lesson?.type === "text") body.content = form.content;
      if (lesson?.type === "video") body.videoFilename = form.videoFilename;
      if (lesson?.type === "pdf") body.pdfFilename = form.pdfFilename;
      if (lesson?.type === "quiz") {
        body.passMarkPercentage = form.passMarkPercentage;
        body.maxAttempts = form.maxAttempts;
        body.questionsToShow = form.questionsToShow;
        body.randomizeQuestions = form.randomizeQuestions;
        body.randomizeAnswers = form.randomizeAnswers;
        body.showCorrectAnswers = form.showCorrectAnswers;
      }

      await apiFetch(`/modules/${moduleId}/lessons/${lessonId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadLesson();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    setQuestionForm((f) => ({ ...f, options: [...f.options, ""] }));
  };

  const handleRemoveOption = (index: number) => {
    if (questionForm.options.length <= 2) return;
    setQuestionForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index),
      correctOptionIndex:
        f.correctOptionIndex >= f.options.length - 1
          ? 0
          : f.correctOptionIndex,
      correctOptionIndices: f.correctOptionIndices
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    }));
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingQuestion(true);
    setError("");
    try {
      await apiFetch(`/lessons/${lessonId}/questions`, {
        method: "POST",
        body: JSON.stringify(questionForm),
      });
      setQuestionForm({
        questionText: "",
        options: ["", ""],
        correctOptionIndex: 0,
        multiSelect: false,
        correctOptionIndices: [],
        order: 0,
      });
      loadLesson();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create question");
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await apiFetch(`/lessons/${lessonId}/questions/${questionId}`, {
        method: "DELETE",
      });
      loadLesson();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete question");
    }
  };

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (!lesson) return <p className="text-center py-10 text-red-600">{error}</p>;

  const sortedQuestions = [...(lesson.quizQuestions || [])].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Edit Lesson{" "}
        <span className="text-sm font-normal text-gray-500 uppercase">
          ({lesson.type})
        </span>
      </h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form
        onSubmit={handleSave}
        className="bg-panel p-4 rounded-lg shadow mb-6 space-y-3"
      >
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
            Notes (HTML, optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
            placeholder="Optional notes shown to learners. Supports HTML and plain URLs (auto-linked)."
          />
        </div>
        {lesson.type === "text" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (HTML)
            </label>
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              rows={8}
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
            />
          </div>
        )}
        {lesson.type === "video" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video
            </label>
            {form.videoFilename && (
              <div className="mb-2">
                <video
                  controls
                  className="w-full rounded max-h-64"
                  src={`/uploads/videos/${form.videoFilename}`}
                />
              </div>
            )}
            <FilePicker
              type="video"
              value={form.videoFilename}
              onChange={(filename) =>
                setForm((f) => ({ ...f, videoFilename: filename }))
              }
              onError={setError}
            />
          </div>
        )}
        {lesson.type === "pdf" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF Document
            </label>
            {form.pdfFilename && (
              <div className="mb-2">
                <iframe
                  src={`/uploads/pdfs/${form.pdfFilename}`}
                  className="w-full h-64 rounded border"
                />
              </div>
            )}
            <FilePicker
              type="pdf"
              value={form.pdfFilename}
              onChange={(filename) =>
                setForm((f) => ({ ...f, pdfFilename: filename }))
              }
              onError={setError}
            />
          </div>
        )}
        {lesson.type === "quiz" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pass Mark (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.passMarkPercentage}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  passMarkPercentage: parseInt(e.target.value) || 0,
                }))
              }
              className="w-32 border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 to allow learners to proceed regardless of score.
            </p>
          </div>
        )}
        {lesson.type === "quiz" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Attempts
            </label>
            <input
              type="number"
              min={0}
              value={form.maxAttempts}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxAttempts: parseInt(e.target.value) || 0,
                }))
              }
              className="w-32 border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 for unlimited attempts.
            </p>
          </div>
        )}
        {lesson.type === "quiz" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.randomizeQuestions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, randomizeQuestions: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              Randomize question order
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When enabled, questions are presented in a random order for each attempt.
            </p>
            {form.randomizeQuestions && (
              <div className="mt-3 ml-6 border-l-2 border-gray-200 pl-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Questions to Show
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.questionsToShow}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      questionsToShow: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-32 border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set to 0 to show all questions. When set, randomly samples this many questions from the bank per attempt. Score is calculated out of the sampled count.
                </p>
              </div>
            )}
          </div>
        )}
        {lesson.type === "quiz" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.randomizeAnswers}
                onChange={(e) =>
                  setForm((f) => ({ ...f, randomizeAnswers: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              Randomize answer order
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When enabled, answer options are presented in a random order for each attempt.
            </p>
          </div>
        )}
        {lesson.type === "quiz" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.showCorrectAnswers}
                onChange={(e) =>
                  setForm((f) => ({ ...f, showCorrectAnswers: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              Show correct answers after submission
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When disabled, learners only see their final score without individual question marking.
            </p>
          </div>
        )}
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

      {lesson.type === "quiz" && (
        <div className="bg-panel p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-3">Quiz Questions</h2>

          <form
            onSubmit={handleCreateQuestion}
            className="space-y-3 mb-4 border-b pb-4"
          >
            <input
              type="text"
              placeholder="Question text"
              required
              value={questionForm.questionText}
              onChange={(e) =>
                setQuestionForm((f) => ({
                  ...f,
                  questionText: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={questionForm.multiSelect}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      multiSelect: e.target.checked,
                      correctOptionIndices: e.target.checked ? [] : [],
                      correctOptionIndex: e.target.checked ? 0 : f.correctOptionIndex,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                Multiple correct answers
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, learners must select all correct answers to get the question right.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Options {questionForm.multiSelect ? "(check all correct answers)" : "(select correct answer)"}:
              </label>
              {questionForm.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  {questionForm.multiSelect ? (
                    <input
                      type="checkbox"
                      checked={questionForm.correctOptionIndices.includes(i)}
                      onChange={() =>
                        setQuestionForm((f) => ({
                          ...f,
                          correctOptionIndices: f.correctOptionIndices.includes(i)
                            ? f.correctOptionIndices.filter((idx) => idx !== i)
                            : [...f.correctOptionIndices, i],
                        }))
                      }
                      title="Mark as correct answer"
                    />
                  ) : (
                    <input
                      type="radio"
                      name="correctOption"
                      checked={questionForm.correctOptionIndex === i}
                      onChange={() =>
                        setQuestionForm((f) => ({
                          ...f,
                          correctOptionIndex: i,
                        }))
                      }
                      title="Mark as correct answer"
                    />
                  )}
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    required
                    value={opt}
                    onChange={(e) =>
                      setQuestionForm((f) => ({
                        ...f,
                        options: f.options.map((o, j) =>
                          j === i ? e.target.value : o,
                        ),
                      }))
                    }
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                  />
                  {questionForm.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="text-brand text-sm hover:underline"
              >
                + Add option
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <label className="text-sm">Order:</label>
              <input
                type="number"
                min={0}
                value={questionForm.order}
                onChange={(e) =>
                  setQuestionForm((f) => ({
                    ...f,
                    order: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-20 border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <button
              type="submit"
              disabled={creatingQuestion}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creatingQuestion ? "Adding..." : "Add Question"}
            </button>
          </form>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {sortedQuestions.map((q, qi) => (
              <div key={q.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <p className="font-medium">
                    {qi + 1}. {q.questionText}
                    {q.multiSelect && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        (Multi-select)
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-red-600 hover:text-red-800 text-sm ml-2"
                  >
                    Delete
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {q.options.map((opt, oi) => {
                    const isCorrect = q.multiSelect && q.correctOptionIndices
                      ? q.correctOptionIndices.includes(oi)
                      : oi === q.correctOptionIndex;
                    return (
                      <li
                        key={oi}
                        className={`text-sm pl-4 ${
                          isCorrect
                            ? "text-green-700 font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        {isCorrect ? "✓ " : "  "}
                        {opt}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {sortedQuestions.length === 0 && (
              <p className="text-gray-400 text-sm">
                No questions yet. Add some above.
              </p>
            )}
          </div>
        </div>
      )}

      {lesson.type === "quiz" && userAttempts.length > 0 && (
        <div className="bg-panel p-4 rounded-lg shadow mt-6">
          <h2 className="font-semibold text-lg mb-3">User Attempts</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">User</th>
                <th className="py-2">Email</th>
                <th className="py-2">Attempts</th>
                <th className="py-2">Best Score</th>
                <th className="py-2">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {userAttempts.map((ua) => (
                <tr key={ua.id} className="border-b">
                  <td className="py-2">{ua.name}</td>
                  <td className="py-2 text-gray-600">{ua.email}</td>
                  <td className="py-2">{ua.attemptCount}</td>
                  <td className="py-2">{Math.round(ua.bestScore * 100)}%</td>
                  <td className="py-2">
                    {ua.passed ? (
                      <span className="text-green-600">Passed</span>
                    ) : (
                      <span className="text-red-600">Not passed</span>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleResetAttempts(ua.id)}
                      disabled={resettingUserId === ua.id}
                      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                    >
                      {resettingUserId === ua.id ? "Resetting..." : "Reset Attempts"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
