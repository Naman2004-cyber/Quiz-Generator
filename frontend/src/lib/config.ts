/* ══════════════════════════════════════════════════════
   Aura Learn — Centralized Configuration
   Single source of truth for environment-dependent URLs.
   ══════════════════════════════════════════════════════ */

/**
 * Backend API base URL for client-side code (browser).
 * Reads from NEXT_PUBLIC_BACKEND_URL at build time.
 * Falls back to localhost for local development.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * Backend API base URL for server-side code (Next.js API routes).
 * Reads BACKEND_URL first (server-only), then falls back to the public var.
 */
export const SERVER_BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";
