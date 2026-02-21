"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface LibraryFile {
  filename: string;
  sizeBytes: number;
}

interface FilePickerProps {
  type: "video" | "pdf";
  value: string;
  onChange: (filename: string) => void;
  onError?: (msg: string) => void;
}

function formatSize(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export default function FilePicker({
  type,
  value,
  onChange,
  onError,
}: FilePickerProps) {
  const [mode, setMode] = useState<"library" | "upload">("library");
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const endpoint = type === "video" ? "/uploads/videos" : "/uploads/pdfs";

  useEffect(() => {
    setLoadingLibrary(true);
    apiFetch<LibraryFile[]>(endpoint)
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoadingLibrary(false));
  }, [endpoint]);

  const filtered = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase()),
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const field = type === "video" ? "video" : "pdf";
      const uploadEndpoint = type === "video" ? "/uploads/video" : "/uploads/pdf";
      formData.append(field, file);
      const data = await apiFetch<{ filename: string }>(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
      // Refresh library then select the new file
      const updated = await apiFetch<LibraryFile[]>(endpoint);
      setFiles(updated);
      onChange(data.filename);
      setMode("library");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Current selection */}
      <div className="px-3 py-2 bg-panel-alt border-b flex items-center justify-between gap-2">
        {value ? (
          <span className="font-mono text-xs text-gray-700 truncate">{value}</span>
        ) : (
          <span className="text-xs text-gray-400">No file selected</span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-red-500 hover:text-red-700 shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex border-b text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("library")}
          className={`px-3 py-2 border-b-2 -mb-px transition-colors ${
            mode === "library"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Library
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-3 py-2 border-b-2 -mb-px transition-colors ${
            mode === "upload"
              ? "border-brand text-brand"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Upload new
        </button>
      </div>

      {/* Library panel */}
      {mode === "library" && (
        <div>
          <div className="px-3 py-2 border-b">
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loadingLibrary ? (
              <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {files.length === 0
                  ? `No ${type === "video" ? "videos" : "PDFs"} in library yet.`
                  : "No results."}
              </p>
            ) : (
              <ul className="divide-y">
                {filtered.map((f) => (
                  <li key={f.filename}>
                    <button
                      type="button"
                      onClick={() => onChange(f.filename)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-brand-subtle transition-colors ${
                        value === f.filename
                          ? "bg-brand-subtle text-brand-dark font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      <span className="font-mono truncate">{f.filename}</span>
                      <span className="text-gray-400 shrink-0">
                        {formatSize(f.sizeBytes)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Upload panel */}
      {mode === "upload" && (
        <div className="px-3 py-3 space-y-1">
          <input
            type="file"
            accept={
              type === "video"
                ? "video/mp4,video/webm,video/ogg,video/quicktime"
                : "application/pdf"
            }
            disabled={uploading}
            onChange={handleUpload}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
          />
          {uploading && (
            <p className="text-xs text-brand">Uploading…</p>
          )}
          <p className="text-xs text-gray-400">
            {type === "video"
              ? "MP4, WebM, OGG, MOV · max 100 MB"
              : "PDF · max 50 MB"}
          </p>
        </div>
      )}
    </div>
  );
}
