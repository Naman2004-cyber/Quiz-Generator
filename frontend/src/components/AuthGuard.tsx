"use client";

/* ══════════════════════════════════════════════════════
   Aura Learn — Auth Guard
   Protects routes by redirecting unauthenticated users
   to the login page. Excludes /login and /signup.
   ══════════════════════════════════════════════════════ */

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { syncHistoryFromDB } from "@/lib/storage";

const PUBLIC_ROUTES = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirectingRef = useRef(false);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Reset redirect flag when pathname actually changes
    redirectingRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (user && !isPublicRoute) {
      syncHistoryFromDB();
    }
  }, [user, isPublicRoute]);

  useEffect(() => {
    if (loading) return;
    if (redirectingRef.current) return;

    if (!user && !isPublicRoute) {
      redirectingRef.current = true;
      router.replace("/login");
    } else if (user && isPublicRoute) {
      redirectingRef.current = true;
      router.replace("/");
    }
    // Intentionally omit `router` from deps — its reference changes every
    // render in Next.js App Router and would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, isPublicRoute, pathname]);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-base)",
        }}
      >
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "16px" }}>
          Loading Aura Learn...
        </p>
      </div>
    );
  }

  // If redirecting, show only the loading overlay and do NOT render children.
  // Rendering children during redirect causes their effects to fire,
  // which can trigger additional navigations and create a redirect loop.
  const isRedirecting = (user && isPublicRoute) || (!user && !isPublicRoute);

  if (isRedirecting) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

