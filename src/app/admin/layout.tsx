"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/courses");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return <p className="text-center py-10 text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <div className="flex gap-4 mb-6 text-sm border-b pb-3">
        <Link href="/admin/courses" className="text-brand hover:underline font-medium">
          Courses
        </Link>
        <Link href="/admin/users" className="text-brand hover:underline font-medium">
          Users
        </Link>
        <Link href="/admin/content-library" className="text-brand hover:underline font-medium">
          Content Library
        </Link>
      </div>
      {children}
    </div>
  );
}
