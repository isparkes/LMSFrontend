"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/brand";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-panel border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-brand">
          {APP_NAME}
        </Link>
        {user && (
          <>
            <Link
              href="/courses"
              className="text-gray-700 hover:text-brand"
            >
              Courses
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin/courses"
                className="text-gray-700 hover:text-brand"
              >
                Admin
              </Link>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-600">
              {user.firstName} {user.lastName}
              <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                {user.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-700 hover:text-brand">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-brand text-white px-4 py-1.5 rounded text-sm hover:bg-brand-dark"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
