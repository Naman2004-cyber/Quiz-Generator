"use client";

import Link from "next/link";
import { BookOpen, LayoutDashboard, Target, Sparkles, LogOut, History, Flame } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logOut } from "@/lib/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Don't render sidebar on signup or login pages
  if (pathname === "/signup" || pathname === "/login") return null;

  const handleLogout = async () => {
    try {
      await logOut();
      // AuthGuard will automatically detect the user is null and redirect to /login
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Get initials for avatar
  const displayName = user?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Sparkles size={16} color="white" />
        </div>
        <span className="sidebar-logo-text">Aura Learn</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </Link>
        <Link href="/generate" className={`sidebar-link ${pathname === '/generate' ? 'active' : ''}`}>
          <Target size={17} />
          <span>Skill Generator</span>
        </Link>
        <Link href="/history" className={`sidebar-link ${pathname === '/history' ? 'active' : ''}`}>
          <History size={17} />
          <span>Quiz History</span>
        </Link>
        <Link href="/aura" className={`sidebar-link ${pathname === '/aura' ? 'active' : ''}`}>
          <Sparkles size={17} />
          <span>Aura Insights</span>
        </Link>
      </nav>

      {/* User Info Card */}
      {user && (
        <div
          style={{
            padding: "14px",
            background: "var(--bg-surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            {/* Avatar */}
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, var(--primary), var(--accent-emerald))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--text-dim)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "7px",
              background: "rgba(251, 113, 133, 0.06)",
              border: "1px solid rgba(251, 113, 133, 0.08)",
              borderRadius: "var(--radius-sm)",
              color: "var(--danger)",
              fontSize: "0.73rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(251, 113, 133, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(251, 113, 133, 0.06)";
            }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      )}

      {/* Pro Card */}
      <div className="sidebar-pro-card">
        <div className="sidebar-pro-title">✨ Pro Mode</div>
        <p className="sidebar-pro-desc">Unlock advanced AI analysis and unlimited generation.</p>
        <button className="sidebar-pro-btn">Upgrade to Pro</button>
      </div>
    </aside>
  );
}
