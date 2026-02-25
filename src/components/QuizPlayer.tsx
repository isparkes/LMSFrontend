"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  multiSelect?: boolean;
  order: number;
}

interface QuizResultItem {
  questionId: string;
  selectedOptionIndex?: number;
  selectedOptionIndices?: number[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  multiSelect?: boolean;
  isCorrect: boolean;
}

interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  passed: boolean;
  passMarkPercentage: number;
  maxAttempts: number;
  attemptsTaken: number;
  showCorrectAnswers: boolean;
  results: QuizResultItem[];
}

interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

export default function QuizPlayer({
  lessonId,
  questions,
  passMarkPercentage = 0,
  maxAttempts = 0,
  randomizeQuestions = false,
  randomizeAnswers = false,
  showCorrectAnswers = true,
  allowRetryAfterPass = false,
  onPassed,
}: {
  lessonId: string;
  questions: Question[];
  passMarkPercentage?: number;
  maxAttempts?: number;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  showCorrectAnswers?: boolean;
  allowRetryAfterPass?: boolean;
  onPassed?: () => void;
}) {
  const [shuffleKey, setShuffleKey] = useState(0);

  // Fisher-Yates shuffle helper
  const fisherYates = (length: number): number[] => {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };

  const sorted = useMemo(() => {
    const ordered = [...questions].sort((a, b) => a.order - b.order);
    if (!randomizeQuestions) return ordered;
    const arr = [...ordered];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, randomizeQuestions, shuffleKey]);

  // Per-question option shuffle: maps display index -> original index
  // optionOrders[questionId] = [originalIdx0, originalIdx1, ...]
  const optionOrders = useMemo(() => {
    if (!randomizeAnswers) return {};
    const map: Record<string, number[]> = {};
    for (const q of sorted) {
      map[q.id] = fisherYates(q.options.length);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, randomizeAnswers, shuffleKey]);

  // Helper to get display options for a question
  const getDisplayOptions = (q: Question): { text: string; originalIndex: number }[] => {
    const order = optionOrders[q.id];
    if (!order) return q.options.map((text, i) => ({ text, originalIndex: i }));
    return order.map((origIdx) => ({ text: q.options[origIdx], originalIndex: origIdx }));
  };

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [attemptsExhausted, setAttemptsExhausted] = useState(false);
  const [hasPreviouslyPassed, setHasPreviouslyPassed] = useState(false);

  const loadAttempts = () => {
    if (passMarkPercentage > 0 || maxAttempts > 0) {
      apiFetch<QuizAttempt[]>(`/lessons/${lessonId}/attempts`)
        .then((data) => {
          setAttempts(data);
          if (maxAttempts > 0 && data.length >= maxAttempts) {
            const hasPassed = data.some((a) => a.passed);
            if (!hasPassed) setAttemptsExhausted(true);
          }
          if (passMarkPercentage > 0 && !allowRetryAfterPass) {
            setHasPreviouslyPassed(data.some((a) => a.passed));
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadAttempts();
  }, [lessonId, passMarkPercentage, maxAttempts]);

  // answers and multiAnswers store ORIGINAL indices
  const handleSelect = (questionId: string, originalIndex: number) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: originalIndex }));
  };

  const handleMultiToggle = (questionId: string, originalIndex: number) => {
    if (result) return;
    setMultiAnswers((prev) => {
      const current = prev[questionId] || [];
      const next = current.includes(originalIndex)
        ? current.filter((i) => i !== originalIndex)
        : [...current, originalIndex];
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async () => {
    const singleCount = Object.keys(answers).length;
    const multiCount = Object.keys(multiAnswers).filter(
      (id) => multiAnswers[id].length > 0,
    ).length;
    const singleQuestions = sorted.filter((q) => !q.multiSelect).length;
    const multiQuestions = sorted.filter((q) => q.multiSelect).length;
    if (singleCount < singleQuestions || multiCount < multiQuestions) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const submissionAnswers = sorted.map((q) => {
        if (q.multiSelect) {
          return {
            questionId: q.id,
            selectedOptionIndices: multiAnswers[q.id] || [],
          };
        }
        return {
          questionId: q.id,
          selectedOptionIndex: answers[q.id],
        };
      });
      const data = await apiFetch<QuizResult>(
        `/lessons/${lessonId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers: submissionAnswers }),
        },
      );
      setResult(data);
      if (data.passed && onPassed) {
        onPassed();
      }
      if (data.maxAttempts > 0 && data.attemptsTaken >= data.maxAttempts && !data.passed) {
        setAttemptsExhausted(true);
      }
      loadAttempts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      setError(msg);
      if (msg.includes("Maximum number of attempts")) {
        setAttemptsExhausted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setMultiAnswers({});
    setResult(null);
    setError("");
    setShuffleKey((k) => k + 1);
  };

  const attemptsUsed = attempts.length;
  const canSubmit = !attemptsExhausted && !hasPreviouslyPassed;

  return (
    <div className="space-y-6">
      {(passMarkPercentage > 0 || maxAttempts > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {passMarkPercentage > 0 && (
            <span>
              Pass mark: {passMarkPercentage}%.{" "}
            </span>
          )}
          {maxAttempts > 0 && (
            <span>
              Attempts: {attemptsUsed}/{maxAttempts} used.{" "}
            </span>
          )}
        </div>
      )}

      {attemptsExhausted && !result?.passed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          You have used all {maxAttempts} attempts. Contact your administrator to reset your attempts.
        </div>
      )}

      {hasPreviouslyPassed && !result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          You have already passed this quiz.
        </div>
      )}

      {sorted.map((q, qi) => {
        const questionResult = result?.results.find(
          (r) => r.questionId === q.id,
        );
        const isMulti = q.multiSelect;
        const correctSet = questionResult?.multiSelect
          ? new Set(questionResult.correctOptionIndices || [])
          : null;
        const selectedMulti = multiAnswers[q.id] || [];
        const displayOptions = getDisplayOptions(q);

        return (
          <div key={q.id} className="bg-panel border rounded-lg p-4">
            <p className="font-medium mb-3">
              {qi + 1}. {q.questionText}
              {isMulti && (
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (Select all that apply)
                </span>
              )}
            </p>
            <div className="space-y-2">
              {displayOptions.map(({ text: opt, originalIndex: oi }) => {
                const selected = isMulti
                  ? selectedMulti.includes(oi)
                  : answers[q.id] === oi;

                const shouldShowMarking = result?.showCorrectAnswers !== false;
                let optClass = "border-gray-300 hover:border-brand";
                if (result && questionResult && shouldShowMarking) {
                  if (isMulti && correctSet) {
                    if (correctSet.has(oi)) {
                      optClass = "border-green-500 bg-green-50";
                    } else if (selected) {
                      optClass = "border-red-500 bg-red-50";
                    }
                  } else {
                    if (oi === questionResult.correctOptionIndex) {
                      optClass = "border-green-500 bg-green-50";
                    } else if (selected && !questionResult.isCorrect) {
                      optClass = "border-red-500 bg-red-50";
                    }
                  }
                } else if (result && !shouldShowMarking && selected) {
                  optClass = "border-gray-400 bg-panel-alt";
                } else if (selected) {
                  optClass = "border-brand bg-brand-subtle";
                }

                return (
                  <button
                    key={oi}
                    onClick={() =>
                      isMulti
                        ? handleMultiToggle(q.id, oi)
                        : handleSelect(q.id, oi)
                    }
                    disabled={!!result || attemptsExhausted}
                    className={`w-full text-left p-3 border rounded ${optClass} transition-colors flex items-center gap-3`}
                  >
                    {isMulti ? (
                      <span
                        className={`w-4 h-4 border rounded-sm flex-shrink-0 flex items-center justify-center ${
                          selected
                            ? "bg-brand border-brand text-white"
                            : "border-gray-400"
                        }`}
                      >
                        {selected && "✓"}
                      </span>
                    ) : (
                      <span
                        className={`w-4 h-4 border rounded-full flex-shrink-0 ${
                          selected
                            ? "border-brand border-4"
                            : "border-gray-400"
                        }`}
                      />
                    )}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result ? (
        <div
          className={`border rounded-lg p-4 ${
            result.passed
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p className="text-lg font-semibold">
            Score: {result.correctAnswers}/{result.totalQuestions} (
            {Math.round(result.score * 100)}%)
          </p>
          {result.passed ? (
            <p className="text-green-700 mt-1">
              {passMarkPercentage > 0 ? "Passed! You may proceed." : "Quiz completed!"}
            </p>
          ) : (
            <p className="text-red-700 mt-1">
              {passMarkPercentage > 0
                ? `You need ${passMarkPercentage}% to pass.`
                : ""}
              {attemptsExhausted
                ? " No attempts remaining."
                : " Please try again."}
            </p>
          )}
          {!attemptsExhausted && (allowRetryAfterPass || !result.passed) && (
            <button
              onClick={handleRetry}
              className="mt-3 bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark"
            >
              Retry Quiz
            </button>
          )}
        </div>
      ) : (
        canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-brand text-white px-6 py-2 rounded hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Answers"}
          </button>
        )
      )}

      {attempts.length > 0 && (
        <div className="bg-panel border rounded-lg p-4">
          <h3 className="font-medium mb-2">Previous Attempts ({attempts.length})</h3>
          <div className="space-y-1 text-sm">
            {attempts.map((attempt, i) => (
              <div key={attempt.id} className="flex justify-between text-gray-600">
                <span>
                  Attempt {attempts.length - i}: {Math.round(attempt.score * 100)}%
                  {attempt.passed ? (
                    <span className="text-green-600 ml-2">Passed</span>
                  ) : (
                    <span className="text-red-600 ml-2">Failed</span>
                  )}
                </span>
                <span className="text-gray-400">
                  {new Date(attempt.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
