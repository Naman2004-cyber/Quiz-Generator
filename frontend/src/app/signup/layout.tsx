import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Aura Learn — AI-Powered Learning",
  description:
    "Create your Aura Learn account and unlock personalized, AI-powered adaptive learning experiences.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  {/* This layout hides the parent sidebar and main-content wrapper  
      by using a full-screen overlay approach */}
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 50,
        background: "#0A0A1A",
      }}
    >
      {children}
    </div>
  );
}
