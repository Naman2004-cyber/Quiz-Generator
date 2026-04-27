import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Learn | Smart AI Learning",
  description: "AI-Powered Adaptive Learning System for Quiz Generation and Skill Gap Analysis",
};

import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthGuard>
            <div className="app-container">
              <Sidebar />
              <main className="main-content">
                {/* Ambient glows */}
                <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "45%", height: "45%", background: "radial-gradient(circle, rgba(124, 106, 255, 0.05) 0%, transparent 70%)", zIndex: -1, pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(0, 212, 170, 0.03) 0%, transparent 70%)", zIndex: -1, pointerEvents: "none" }} />
                {children}
              </main>
            </div>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
