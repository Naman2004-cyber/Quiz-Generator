"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signUp, signInWithGoogle, getAuthErrorMessage } from "@/lib/auth";
import "./signup.css";

/* ──────────────── Constants ──────────────── */
const AI_SUGGESTIONS = [
  "Machine Learning & Deep Learning",
  "Web Development (React, Next.js)",
  "Data Science & Analytics",
  "Natural Language Processing",
  "Computer Vision",
  "Cloud Computing & DevOps",
  "Cybersecurity Fundamentals",
  "Mobile App Development",
  "Blockchain & Web3",
  "UI/UX Design",
];

/* ──────────────── Icons (inline SVGs) ──────────────── */
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const BigCheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
);
const AlertCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);

/* ──────────────── Helpers ──────────────── */
function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ff4d6a", "#ffbe0b", "#00e68a", "#00F5FF"];
  return { score, label: labels[score], color: colors[score] };
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ──────────────── Particle Background ──────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(108, 99, 255, ${p.alpha})`;
        ctx.fill();
      });

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 245, 255, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

/* ──────────────── Main Component ──────────────── */
export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as "student" | "teacher",
    interest: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authError, setAuthError] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  /* ── Parallax ── */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  }, []);

  /* ── Validation ── */
  const errors: Record<string, string> = {};
  if (touched.name && form.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (touched.email && !validateEmail(form.email)) errors.email = "Enter a valid email address";
  if (touched.password && form.password.length < 8) errors.password = "Password must be at least 8 characters";
  if (touched.confirmPassword && form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match";

  const passwordStrength = getPasswordStrength(form.password);

  const isFormValid =
    form.name.trim().length >= 2 &&
    validateEmail(form.email) &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword &&
    agreeTerms;

  /* ── Filtered suggestions ── */
  const filteredSuggestions = AI_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(form.interest.toLowerCase())
  );

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    setAuthError("");

    try {
      await signUp(form.email, form.password, form.name);
      setIsSubmitting(false);
      setShowSuccess(true);

      // Auto-redirect after 4 seconds
      setTimeout(() => {
        router.push("/");
      }, 4000);
    } catch (err: any) {
      const code = err?.code || "";
      setAuthError(getAuthErrorMessage(code));
      setIsSubmitting(false);
    }
  };

  /* ── Ripple effect ── */
  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 600);
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  /* ── Social Sign-In ── */
  const handleSocialSignup = async () => {
    setAuthError("");
    try {
      await signInWithGoogle();
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/account-exists-with-different-credential") {
        setAuthError("An account already exists with this email using a different sign-in method.");
      } else {
        setAuthError(getAuthErrorMessage(code));
      }
    }
  };

  /* ── Greeting ── */
  const firstName = form.name.trim().split(" ")[0];
  const greeting = firstName
    ? `Welcome aboard, ${firstName}! 🚀 Your AI-powered learning journey is about to begin.`
    : "Welcome aboard! 🚀 Your AI-powered learning journey is about to begin.";

  return (
    <div className="signup-page" onMouseMove={handleMouseMove}>
      <ParticleCanvas />

      {/* ─── LEFT SIDE ─── */}
      <motion.div
        className="signup-left"
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Floating elements */}
        <div className="floating-element float-1" style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }} />
        <div className="floating-element float-2" style={{ transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)` }} />
        <div className="floating-element float-3" style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }} />
        <div className="floating-element float-4" style={{ transform: `translate(${mousePos.x * -0.2}px, ${mousePos.y * -0.2}px)` }} />

        {/* Neural network SVG lines */}
        <svg className="neural-lines" viewBox="0 0 600 600">
          <motion.line x1="50" y1="100" x2="200" y2="250" stroke="rgba(108,99,255,0.3)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.5 }} />
          <motion.line x1="200" y1="250" x2="400" y2="150" stroke="rgba(0,245,255,0.2)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.8 }} />
          <motion.line x1="400" y1="150" x2="550" y2="350" stroke="rgba(108,99,255,0.25)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 1.1 }} />
          <motion.line x1="100" y1="400" x2="300" y2="350" stroke="rgba(0,245,255,0.15)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 1.4 }} />
          <motion.line x1="300" y1="350" x2="500" y2="480" stroke="rgba(108,99,255,0.2)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 1.7 }} />
          {/* Nodes */}
          {[[50,100],[200,250],[400,150],[550,350],[100,400],[300,350],[500,480]].map(([cx,cy], i) => (
            <motion.circle key={i} cx={cx} cy={cy} r="4" fill="rgba(108,99,255,0.5)"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.2 }} />
          ))}
        </svg>

        <div className="left-content">
          <motion.div
            className="hero-image-wrapper"
            style={{ transform: `translate(${mousePos.x * 0.15}px, ${mousePos.y * 0.15}px)` }}
          >
            <div className="hero-glow" />
            <Image src="/ai-hero.png" alt="AI Learning Illustration" fill className="hero-image" style={{ objectFit: "contain" }} sizes="(max-width: 640px) 200px, (max-width: 1024px) 260px, 380px" priority />
          </motion.div>

          <motion.h1
            className="tagline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Unlock Your Learning
            <br />
            Potential with <span className="tagline-gradient">AI</span>
          </motion.h1>

          <motion.p
            className="tagline-description"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Experience adaptive learning that evolves with you. Our AI engine crafts personalized pathways, identifies skill gaps, and accelerates your growth — intelligently.
          </motion.p>
        </div>
      </motion.div>

      {/* ─── RIGHT SIDE ─── */}
      <motion.div
        className="signup-right"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
      >
        <motion.div
          className="signup-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          {/* Card Header */}
          <div className="card-header">
            <div className="card-logo">
              <div className="logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <span style={{ color: "var(--su-text)" }}>Aura Learn</span>
            </div>
            <p className="card-subtitle">Create your account to get started</p>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            {/* Auth Error Banner */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255, 77, 106, 0.08)",
                    border: "1px solid rgba(255, 77, 106, 0.15)",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.82rem",
                    color: "var(--su-danger)",
                    fontWeight: 500,
                  }}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <AlertCircle /> {authError}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Full Name */}
            <div className={`form-group ${errors.name ? "shake" : ""}`}>
              <input
                id="signup-name"
                type="text"
                className={`form-input ${errors.name ? "has-error" : touched.name && form.name.trim().length >= 2 ? "is-valid" : ""}`}
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onBlur={() => touch("name")}
                autoComplete="name"
              />
              <label htmlFor="signup-name" className="form-label">Full Name</label>
              <span className="form-icon"><UserIcon /></span>
              <AnimatePresence>
                {errors.name && (
                  <motion.p className="error-message" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <AlertCircle /> {errors.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Email */}
            <div className={`form-group ${errors.email ? "shake" : ""}`}>
              <input
                id="signup-email"
                type="email"
                className={`form-input ${errors.email ? "has-error" : touched.email && validateEmail(form.email) ? "is-valid" : ""}`}
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                onBlur={() => touch("email")}
                autoComplete="email"
              />
              <label htmlFor="signup-email" className="form-label">Email Address</label>
              <span className="form-icon"><MailIcon /></span>
              <AnimatePresence>
                {errors.email && (
                  <motion.p className="error-message" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <AlertCircle /> {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div className={`form-group ${errors.password ? "shake" : ""}`}>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                className={`form-input ${errors.password ? "has-error" : ""}`}
                placeholder="Password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                onBlur={() => touch("password")}
                autoComplete="new-password"
              />
              <label htmlFor="signup-password" className="form-label">Password</label>
              <span className="form-icon"><LockIcon /></span>
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <AnimatePresence>
                {errors.password && (
                  <motion.p className="error-message" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <AlertCircle /> {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
              {form.password.length > 0 && (
                <>
                  <div className="password-strength">
                    {[1, 2, 3, 4].map((level) => (
                      <motion.div
                        key={level}
                        className={`strength-bar ${passwordStrength.score >= level ? "active" : ""}`}
                        initial={{ scaleX: 0 }}
                        animate={{
                          scaleX: 1,
                          backgroundColor: passwordStrength.score >= level ? passwordStrength.color : "rgba(255,255,255,0.08)",
                        }}
                        style={{ transformOrigin: "left" }}
                        transition={{ duration: 0.4, delay: level * 0.05 }}
                      />
                    ))}
                  </div>
                  <motion.p
                    className="strength-label"
                    style={{ color: passwordStrength.color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {passwordStrength.label}
                  </motion.p>
                </>
              )}
            </div>

            {/* Confirm Password */}
            <div className={`form-group ${errors.confirmPassword ? "shake" : ""}`}>
              <input
                id="signup-confirm"
                type={showConfirm ? "text" : "password"}
                className={`form-input ${errors.confirmPassword ? "has-error" : touched.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 ? "is-valid" : ""}`}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                onBlur={() => touch("confirmPassword")}
                autoComplete="new-password"
              />
              <label htmlFor="signup-confirm" className="form-label">Confirm Password</label>
              <span className="form-icon"><LockIcon /></span>
              <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label="Toggle confirm password">
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <AnimatePresence>
                {errors.confirmPassword && (
                  <motion.p className="error-message" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <AlertCircle /> {errors.confirmPassword}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Role Selector */}
            <div className="role-selector">
              {(["student", "teacher"] as const).map((role) => (
                <motion.div
                  key={role}
                  className={`role-option ${form.role === role ? "selected" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, role }))}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="role-icon">{role === "student" ? "🎓" : "👩‍🏫"}</span>
                  <span className="role-name">{role === "student" ? "Student" : "Teacher"}</span>
                </motion.div>
              ))}
            </div>

            {/* AI-powered Interest Input */}
            <div className="ai-input-wrapper">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input
                  id="signup-interest"
                  type="text"
                  className="form-input"
                  placeholder="What do you want to learn?"
                  value={form.interest}
                  onChange={(e) => { update("interest", e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  autoComplete="off"
                />
                <label htmlFor="signup-interest" className="form-label">What do you want to learn?</label>
                <span className="form-icon"><SparkleIcon /></span>
                <span className="ai-badge">AI</span>
              </div>
              <AnimatePresence>
                {showSuggestions && form.interest.length > 0 && filteredSuggestions.length > 0 && (
                  <motion.div
                    className="ai-suggestions"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {filteredSuggestions.slice(0, 5).map((s) => (
                      <div
                        key={s}
                        className="suggestion-item"
                        onMouseDown={() => { update("interest", s); setShowSuggestions(false); }}
                      >
                        <span className="spark"><SparkleIcon /></span>
                        {s}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Terms */}
            <div className="checkbox-group" style={{ marginTop: 20 }}>
              <div
                className={`custom-checkbox ${agreeTerms ? "checked" : ""}`}
                onClick={() => setAgreeTerms((v) => !v)}
                role="checkbox"
                aria-checked={agreeTerms}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setAgreeTerms((v) => !v); }}
              >
                {agreeTerms && <CheckIcon />}
              </div>
              <span className="checkbox-label">
                I agree to the{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>{" "}
                and{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              </span>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              className="submit-btn"
              disabled={!isFormValid || isSubmitting}
              onClick={handleRipple}
              whileHover={isFormValid && !isSubmitting ? { scale: 1.02 } : {}}
              whileTap={isFormValid && !isSubmitting ? { scale: 0.98 } : {}}
            >
              {ripple && (
                <span className="ripple" style={{ left: ripple.x, top: ripple.y }} />
              )}
              {isSubmitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span className="loading-spinner" />
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </motion.button>
          </form>

          {/* Social */}
          <div className="social-divider">
            <span>or continue with</span>
          </div>
          <div className="social-buttons">
            <motion.button className="social-btn" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} type="button" onClick={handleSocialSignup} style={{ flex: 1 }}>
              <GoogleIcon /> Continue with Google
            </motion.button>
          </div>

          {/* Footer */}
          <div className="card-footer">
            Already have an account? <a href="/login">Log in</a>
          </div>
        </motion.div>
      </motion.div>

      {/* ─── SUCCESS OVERLAY ─── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div style={{ position: "relative" }}>
              <motion.div
                className="glow-burst"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <motion.div
                className="success-checkmark"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <BigCheckIcon />
              </motion.div>
            </motion.div>
            <motion.h2
              className="success-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Account Created!
            </motion.h2>
            <motion.p
              className="success-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {greeting}
            </motion.p>
            <motion.button
              className="success-cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/")}
            >
              Start Learning →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
