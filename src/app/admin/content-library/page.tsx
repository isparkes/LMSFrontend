"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface LessonRef {
  id: string;
  title: string;
}

interface FileEntry {
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
  usedByLessons: LessonRef[];
}

type TabType = "videos" | "pdfs";

function formatSize(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function stemName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export default function ContentLibraryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("videos");
  const [videos, setVideos] = useState<FileEntry[]>([]);
  const [pdfs, setPdfs] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [renamingFilename, setRenamingFilename] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const entries = activeTab === "videos" ? videos : pdfs;

  const loadFiles = async () => {
    setLoading(true);
    setError("");
    try {
      const [v, p] = await Promise.all([
        apiFetch<FileEntry[]>("/uploads/videos"),
        apiFetch<FileEntry[]>("/uploads/pdfs"),
      ]);
      setVideos(v);
      setPdfs(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setRenamingFilename(null);
    setDeletingFilename(null);
    setUploadFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      const field = activeTab === "videos" ? "video" : "pdf";
      const endpoint = activeTab === "videos" ? "/uploads/video" : "/uploads/pdf";
      formData.append(field, uploadFile);
      await apiFetch(endpoint, { method: "POST", body: formData });
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFilename) return;
    setDeleting(true);
    setError("");
    try {
      await apiFetch(
        `/uploads/${activeTab}/${encodeURIComponent(deletingFilename)}`,
        { method: "DELETE" },
      );
      setDeletingFilename(null);
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleRename = async (filename: string) => {
    if (!renameValue.trim()) return;
    setRenaming(true);
    setError("");
    try {
      await apiFetch<{ newFilename: string }>(
        `/uploads/${activeTab}/${encodeURIComponent(filename)}/rename`,
        {
          method: "PATCH",
          body: JSON.stringify({ newDisplayName: renameValue.trim() }),
        },
      );
      setRenamingFilename(null);
      setRenameValue("");
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setRenaming(false);
    }
  };

  const startRename = (filename: string) => {
    setDeletingFilename(null);
    setRenamingFilename(filename);
    setRenameValue(stemName(filename));
  };

  const startDelete = (filename: string) => {
    setRenamingFilename(null);
    setDeletingFilename(filename);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Content Library</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["videos", "pdfs"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "videos" ? "Videos" : "PDFs"}
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {tab === "videos" ? videos.length : pdfs.length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3 mb-4">
          {error}
        </p>
      )}

      {/* Upload */}
      <form
        onSubmit={handleUpload}
        className="bg-white rounded-lg shadow p-4 mb-6 flex items-center gap-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={
            activeTab === "videos"
              ? "video/mp4,video/webm,video/ogg,video/quicktime"
              : "application/pdf"
          }
          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!uploadFile || uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? "Uploading…" : `Upload ${activeTab === "videos" ? "Video" : "PDF"}`}
        </button>
        <span className="text-xs text-gray-400">
          {activeTab === "videos" ? "MP4, WebM, OGG, MOV · max 100 MB" : "PDF · max 50 MB"}
        </span>
      </form>

      {/* File list */}
      {loading ? (
        <p className="text-gray-500 text-center py-10">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          No {activeTab === "videos" ? "videos" : "PDFs"} uploaded yet.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Filename</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Size</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Uploaded</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Used By</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => {
                const isRenaming = renamingFilename === entry.filename;
                const isDeleting = deletingFilename === entry.filename;

                return (
                  <tr key={entry.filename} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-xs">
                      <span className="truncate block" title={entry.filename}>
                        {entry.filename}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatSize(entry.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(entry.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {entry.usedByLessons.length === 0 ? (
                        <span className="text-xs text-gray-400">Unused</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {entry.usedByLessons.map((l) => (
                            <span
                              key={l.id}
                              title={l.title}
                              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 max-w-[140px] truncate inline-block"
                            >
                              {l.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(entry.filename);
                              if (e.key === "Escape") {
                                setRenamingFilename(null);
                                setRenameValue("");
                              }
                            }}
                            autoFocus
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-40 font-mono"
                          />
                          <button
                            onClick={() => handleRename(entry.filename)}
                            disabled={renaming || !renameValue.trim()}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {renaming ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setRenamingFilename(null);
                              setRenameValue("");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : isDeleting ? (
                        <div className="space-y-1">
                          {entry.usedByLessons.length > 0 && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 max-w-xs">
                              Used by:{" "}
                              {entry.usedByLessons.map((l) => l.title).join(", ")}
                              . Deleting will remove the file from{" "}
                              {entry.usedByLessons.length === 1
                                ? "this lesson"
                                : "these lessons"}
                              .
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleDelete}
                              disabled={deleting}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleting ? "Deleting…" : "Delete"}
                            </button>
                            <button
                              onClick={() => setDeletingFilename(null)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startRename(entry.filename)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => startDelete(entry.filename)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
