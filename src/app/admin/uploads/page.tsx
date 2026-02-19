"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

interface UploadResult {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export default function AdminUploadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const data = await apiFetch<UploadResult>("/uploads/video", {
        method: "POST",
        body: formData,
      });
      setResult(data);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Video File
          </label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Allowed: MP4, WebM, OGG, QuickTime. Max 100 MB.
          </p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="font-semibold text-green-800 mb-2">Upload Successful</h2>
          <dl className="text-sm space-y-1">
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Filename:</dt>
              <dd className="font-mono text-green-700">{result.filename}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Original:</dt>
              <dd>{result.originalName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Size:</dt>
              <dd>{(result.size / 1024 / 1024).toFixed(2)} MB</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Type:</dt>
              <dd>{result.mimetype}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-gray-600">
            Use the filename above when creating a video lesson.
          </p>
        </div>
      )}
    </div>
  );
}
