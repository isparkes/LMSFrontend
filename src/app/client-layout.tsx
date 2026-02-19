"use client";

import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </AuthProvider>
  );
}
