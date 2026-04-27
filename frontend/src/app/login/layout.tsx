import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In | Aura Learn — AI-Powered Learning",
  description:
    "Log in to your Aura Learn account and continue your personalized AI-powered learning journey.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
