"use client";

export default function ProgressBar({
  percentage,
  className = "",
}: {
  percentage: number;
  className?: string;
}) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className="bg-brand h-2.5 rounded-full transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
