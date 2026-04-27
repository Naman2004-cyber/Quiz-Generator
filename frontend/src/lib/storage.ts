/* ══════════════════════════════════════════════════════
   Aura Learn — Persistent Storage Layer
   All data persisted in localStorage with typed helpers.
   Real-time updates via custom "aura-storage" events.
   ══════════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────

export interface QuizResult {
  userId: string;
  id: string;
  topic: string;
  title: string;
  score: number; // percentage 0-100
  totalQuestions: number;
  correctAnswers: number;
  difficulty: "Easy" | "Medium" | "Hard";
  questionType: string;
  timeSpentSeconds: number;
  timestamp: number; // Date.now()
  concepts: string[];
  conceptResults: { concept: string; correct: boolean }[];
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    feedbackSummary: string;
  };
  // Behavioral tracking fields (for ML model — mirrors ASSISTments dataset features)
  hintsUsed?: number;              // total hints used across all questions
  hintsPerQuestion?: number;       // average hints per question
  answerChanges?: number;          // total answer switches across all questions
  avgTimePerQuestionSec?: number;  // average seconds spent per question
  perQuestionData?: {              // granular per-question behavioral data
    questionIndex: number;
    correct: boolean;
    concept: string;
    timeSpentMs: number;
    hintsUsed: number;
    answerChanges: number;
  }[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  unlockedAt: number | null;
}

export interface UserStats {
  totalQuizzes: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  totalTimeSeconds: number;
  xp: number;
  level: number;
  learningLevel: "Beginner" | "Intermediate" | "Advanced";
}

export interface SkillTopic {
  topic: string;
  accuracy: number;
  attempts: number;
  category: "Strong" | "Moderate" | "Weak";
}

// ── Per-User Namespacing ───────────────────────────

let _currentUserId: string | null = null;

/**
 * Set the current user ID for namespacing all storage keys.
 * Must be called when user logs in (with Firebase UID).
 */
export function setCurrentUserId(uid: string | null) {
  _currentUserId = uid;
  emitStorageUpdate(); // Notify components to reload data with new user context
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

function userKey(key: string): string {
  if (!_currentUserId) return key; // fallback to global if no user
  return `${_currentUserId}_${key}`;
}

// ── Constants ──────────────────────────────────────

const BASE_KEYS = {
  QUIZ_HISTORY: "aura_quiz_history",
  BADGES: "aura_badges",
  DISMISSED_ALERTS: "aura_dismissed_alerts",
  LAST_VISIT: "aura_last_visit",
} as const;

// Dynamic keys that use the current user ID
const KEYS = {
  get QUIZ_HISTORY() { return userKey(BASE_KEYS.QUIZ_HISTORY); },
  get BADGES() { return userKey(BASE_KEYS.BADGES); },
  get DISMISSED_ALERTS() { return userKey(BASE_KEYS.DISMISSED_ALERTS); },
  get LAST_VISIT() { return userKey(BASE_KEYS.LAST_VISIT); },
};

const XP_PER_QUIZ_BASE = 25;
const XP_PER_CORRECT = 10;
const XP_PERFECT_BONUS = 50;
const XP_STREAK_BONUS = 15;
const XP_PER_LEVEL = 200;

const BADGE_DEFINITIONS: Badge[] = [
  { id: "first_quiz", name: "First Step", description: "Complete your first quiz", icon: "🎯", unlockedAt: null },
  { id: "perfect_score", name: "Perfect Score", description: "Score 100% on any quiz", icon: "💎", unlockedAt: null },
  { id: "streak_3", name: "On Fire", description: "3-day study streak", icon: "🔥", unlockedAt: null },
  { id: "streak_7", name: "Unstoppable", description: "7-day study streak", icon: "⚡", unlockedAt: null },
  { id: "quizzes_5", name: "Dedicated", description: "Complete 5 quizzes", icon: "📚", unlockedAt: null },
  { id: "quizzes_10", name: "Scholar", description: "Complete 10 quizzes", icon: "🎓", unlockedAt: null },
  { id: "quizzes_25", name: "Master Mind", description: "Complete 25 quizzes", icon: "🧠", unlockedAt: null },
  { id: "xp_500", name: "Rising Star", description: "Earn 500 XP", icon: "⭐", unlockedAt: null },
  { id: "xp_1000", name: "Superstar", description: "Earn 1000 XP", icon: "🌟", unlockedAt: null },
  { id: "speed_demon", name: "Speed Demon", description: "Complete a quiz in under 60 seconds", icon: "💨", unlockedAt: null },
  { id: "well_rounded", name: "Well Rounded", description: "Quiz on 5 different topics", icon: "🌐", unlockedAt: null },
  { id: "night_owl", name: "Night Owl", description: "Study after midnight", icon: "🦉", unlockedAt: null },
];

// ── Event System ───────────────────────────────────

const STORAGE_EVENT = "aura-storage-update";

export function emitStorageUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  }
}

export function onStorageUpdate(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(STORAGE_EVENT, callback);
  return () => window.removeEventListener(STORAGE_EVENT, callback);
}

// ── Quiz History ───────────────────────────────────

export async function syncHistoryFromDB() {
  if (typeof window === "undefined") return;
  try {
    if (!_currentUserId) return;

    // Read local history before overwriting
    const rawLocal = localStorage.getItem(KEYS.QUIZ_HISTORY);
    const localHistory: QuizResult[] = rawLocal ? JSON.parse(rawLocal) : [];

    const res = await fetch(`http://127.0.0.1:8000/api/history?user_id=${_currentUserId}`);
    if (res.ok) {
      let dbData = await res.json();
      
      // Auto-Migration: If local storage has quizzes but the DB is empty, push them to the DB!
      if (localHistory.length > 0 && dbData.length === 0) {
        console.log("Migrating local storage history to PostgreSQL...");
        for (const quiz of localHistory) {
          await fetch("http://127.0.0.1:8000/api/quizzes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...quiz, userId: _currentUserId })
          });
        }
        // Fetch again to get the canonical DB state after migration
        const updatedRes = await fetch(`http://127.0.0.1:8000/api/history?user_id=${_currentUserId}`);
        if (updatedRes.ok) {
          dbData = await updatedRes.json();
        }
      }

      localStorage.setItem(KEYS.QUIZ_HISTORY, JSON.stringify(dbData));
      emitStorageUpdate();
    }
  } catch (err) {
    console.error("Failed to sync history from DB:", err);
  }
}


export function getQuizHistory(): QuizResult[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.QUIZ_HISTORY);
  if (!raw) return [];
  try {
    let history: QuizResult[] = JSON.parse(raw);
    // Ensure every record has a userId (important for API compatibility)
    history = history.map(item => ({
      ...item,
      userId: item.userId || _currentUserId || "guest"
    }));
    // Ensure chronological order (newest first)
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    return [];
  }
}

export function saveQuizResult(result: Omit<QuizResult, "id" | "userId">): QuizResult {
  const history = getQuizHistory();
  const entry: QuizResult = {
    ...result,
    userId: _currentUserId || "guest",
    id: `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  history.unshift(entry); // newest first
  localStorage.setItem(KEYS.QUIZ_HISTORY, JSON.stringify(history));

  // Sync to backend DB asynchronously
  fetch("http://127.0.0.1:8000/api/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry)
  }).catch(err => console.error("Failed to save to DB", err));

  // Award XP
  awardXP(entry);

  // Check badges
  checkAndUnlockBadges(history, entry);

  // Update last visit
  localStorage.setItem(KEYS.LAST_VISIT, Date.now().toString());

  emitStorageUpdate();
  return entry;
}

export function updateQuizAnalysis(
  quizId: string,
  analysis: QuizResult["analysis"]
) {
  const history = getQuizHistory();
  const idx = history.findIndex((q) => q.id === quizId);
  if (idx !== -1) {
    history[idx].analysis = analysis;
    localStorage.setItem(KEYS.QUIZ_HISTORY, JSON.stringify(history));
    emitStorageUpdate();
  }
}

// ── User Stats ─────────────────────────────────────

export function getUserStats(): UserStats {
  const history = getQuizHistory();
  const totalQuizzes = history.length;
  const averageAccuracy =
    totalQuizzes > 0
      ? Math.round(history.reduce((sum, q) => sum + q.score, 0) / totalQuizzes)
      : 0;
  const totalTimeSeconds = history.reduce(
    (sum, q) => sum + q.timeSpentSeconds,
    0
  );
  const { current, longest } = calculateStreak(history);
  const { xp, level } = getXPAndLevel();

  // Determine learning level
  let learningLevel: UserStats["learningLevel"] = "Beginner";
  if (totalQuizzes >= 10 && averageAccuracy >= 70) learningLevel = "Intermediate";
  if (totalQuizzes >= 25 && averageAccuracy >= 85) learningLevel = "Advanced";

  return {
    totalQuizzes,
    averageAccuracy,
    currentStreak: current,
    longestStreak: longest,
    totalTimeSeconds,
    xp,
    level,
    learningLevel,
  };
}

// ── Streak Calculation ─────────────────────────────

function calculateStreak(history: QuizResult[]): {
  current: number;
  longest: number;
} {
  if (history.length === 0) return { current: 0, longest: 0 };

  // Get unique days with quizzes (sorted recent first)
  const days = new Set<string>();
  history.forEach((q) => {
    const d = new Date(q.timestamp);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const sortedDays = Array.from(days)
    .map((d) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m, day);
    })
    .sort((a, b) => b.getTime() - a.getTime());

  // Current streak (must include today or yesterday)
  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (sortedDays.length > 0) {
    const latest = new Date(sortedDays[0]);
    latest.setHours(0, 0, 0, 0);
    if (latest.getTime() >= yesterday.getTime()) {
      current = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        prev.setHours(0, 0, 0, 0);
        curr.setHours(0, 0, 0, 0);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          current++;
        } else {
          break;
        }
      }
    }
  }

  // Longest streak
  let longest = current;
  let tempStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { current, longest };
}

// ── XP & Level ─────────────────────────────────────

function getStoredXP(): number {
  const history = getQuizHistory();
  let xp = 0;
  for (const q of history) {
    xp += XP_PER_QUIZ_BASE;
    xp += q.correctAnswers * XP_PER_CORRECT;
    if (q.score === 100) xp += XP_PERFECT_BONUS;
  }
  // Streak bonuses
  const { current } = calculateStreak(history);
  xp += Math.min(current, 30) * XP_STREAK_BONUS;
  return xp;
}

function awardXP(_entry: QuizResult) {
  // XP is computed dynamically from history, no separate storage needed
}

export function getXPAndLevel(): { xp: number; level: number; xpInLevel: number; xpForNextLevel: number } {
  const xp = getStoredXP();
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  return { xp, level, xpInLevel, xpForNextLevel: XP_PER_LEVEL };
}

// ── Skill Map ──────────────────────────────────────

export function getSkillMap(): SkillTopic[] {
  const history = getQuizHistory();
  const topicMap: Record<string, { correct: number; total: number }> = {};

  const formatTitle = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  for (const q of history) {
    for (const cr of q.conceptResults) {
      const concept = formatTitle(cr.concept || "General");
      if (!topicMap[concept]) {
        topicMap[concept] = { correct: 0, total: 0 };
      }
      topicMap[concept].total++;
      if (cr.correct) topicMap[concept].correct++;
    }
  }

  const allSkills = Object.entries(topicMap).map(([topic, data]) => {
    const accuracy = Math.round((data.correct / data.total) * 100);
    let category: SkillTopic["category"] = "Moderate";
    if (accuracy >= 80) category = "Strong";
    else if (accuracy < 50) category = "Weak";
    return { topic, accuracy, attempts: data.total, category };
  });

  // Limit to the top 6 most tested concepts to keep the radar chart readable
  return allSkills.sort((a, b) => b.attempts - a.attempts).slice(0, 6);
}

// ── Badges ─────────────────────────────────────────

export function getBadges(): Badge[] {
  if (typeof window === "undefined") return BADGE_DEFINITIONS;
  try {
    const raw = localStorage.getItem(KEYS.BADGES);
    if (raw) return JSON.parse(raw);
    return BADGE_DEFINITIONS;
  } catch {
    return BADGE_DEFINITIONS;
  }
}

function checkAndUnlockBadges(history: QuizResult[], latest: QuizResult) {
  const badges = getBadges();
  const now = Date.now();

  const unlock = (id: string) => {
    const b = badges.find((b) => b.id === id);
    if (b && !b.unlockedAt) b.unlockedAt = now;
  };

  // First quiz
  if (history.length >= 1) unlock("first_quiz");

  // Perfect score
  if (latest.score === 100) unlock("perfect_score");

  // Quiz count milestones
  if (history.length >= 5) unlock("quizzes_5");
  if (history.length >= 10) unlock("quizzes_10");
  if (history.length >= 25) unlock("quizzes_25");

  // Streak
  const { current } = calculateStreak(history);
  if (current >= 3) unlock("streak_3");
  if (current >= 7) unlock("streak_7");

  // XP milestones
  const xp = getStoredXP();
  if (xp >= 500) unlock("xp_500");
  if (xp >= 1000) unlock("xp_1000");

  // Speed demon
  if (latest.timeSpentSeconds < 60 && latest.totalQuestions >= 3) unlock("speed_demon");

  // Well rounded - 5 different topics
  const uniqueTopics = new Set(history.map((q) => q.topic.toLowerCase()));
  if (uniqueTopics.size >= 5) unlock("well_rounded");

  // Night owl
  const hour = new Date(latest.timestamp).getHours();
  if (hour >= 0 && hour < 5) unlock("night_owl");

  localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
}

// ── Time Analysis ──────────────────────────────────

export function getTimeByDay(): { day: string; minutes: number }[] {
  const history = getQuizHistory();
  const dayMap: Record<string, number> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayNames[d.getDay()];
    dayMap[key] = 0;
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const q of history) {
    if (q.timestamp >= sevenDaysAgo) {
      const d = new Date(q.timestamp);
      const key = dayNames[d.getDay()];
      dayMap[key] = (dayMap[key] || 0) + Math.round(q.timeSpentSeconds / 60);
    }
  }

  return Object.entries(dayMap).map(([day, minutes]) => ({ day, minutes }));
}

export function getTimeBySubject(): { topic: string; minutes: number }[] {
  const history = getQuizHistory();
  const topicMap: Record<string, number> = {};

  const formatTitle = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  for (const q of history) {
    const topic = formatTitle(q.topic || "General");
    topicMap[topic] = (topicMap[topic] || 0) + Math.round(q.timeSpentSeconds / 60);
  }

  return Object.entries(topicMap)
    .map(([topic, minutes]) => ({ topic, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);
}

// ── Performance Over Time ──────────────────────────

export type TimeFilter = "daily" | "weekly" | "monthly";

export function getPerformanceOverTime(
  filter: TimeFilter
): { label: string; accuracy: number; score: number }[] {
  const history = getQuizHistory();
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  const buckets: Record<string, { total: number; sum: number; count: number }> = {};

  for (const q of sorted) {
    const d = new Date(q.timestamp);
    let key: string;

    if (filter === "daily") {
      key = `${d.getMonth() + 1}/${d.getDate()}`;
    } else if (filter === "weekly") {
      // ISO week
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      key = `W${week}`;
    } else {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      key = months[d.getMonth()];
    }

    if (!buckets[key]) buckets[key] = { total: 0, sum: 0, count: 0 };
    buckets[key].sum += q.score;
    buckets[key].count++;
  }

  return Object.entries(buckets).map(([label, data]) => ({
    label,
    accuracy: Math.round(data.sum / data.count),
    score: Math.round(data.sum / data.count),
  }));
}

// ── Search & Filter ────────────────────────────────

export interface QuizFilter {
  search?: string;
  topic?: string;
  difficulty?: string;
  minScore?: number;
  maxScore?: number;
}

export function searchQuizzes(filters: QuizFilter): QuizResult[] {
  let results = getQuizHistory();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.topic.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.concepts.some((c) => c.toLowerCase().includes(q))
    );
  }

  if (filters.topic) {
    results = results.filter(
      (r) => r.topic.toLowerCase() === filters.topic!.toLowerCase()
    );
  }

  if (filters.difficulty) {
    results = results.filter((r) => r.difficulty === filters.difficulty);
  }

  if (filters.minScore !== undefined) {
    results = results.filter((r) => r.score >= filters.minScore!);
  }

  if (filters.maxScore !== undefined) {
    results = results.filter((r) => r.score <= filters.maxScore!);
  }

  return results;
}

// ── Data Export ─────────────────────────────────────

export function exportReport(): void {
  const stats = getUserStats();
  const history = getQuizHistory();
  const skills = getSkillMap();
  const badges = getBadges().filter((b) => b.unlockedAt);

  const report = {
    generatedAt: new Date().toISOString(),
    platform: "Aura Learn",
    summary: stats,
    skillMap: skills,
    achievements: badges,
    quizHistory: history.map((q) => ({
      topic: q.topic,
      title: q.title,
      score: q.score,
      totalQuestions: q.totalQuestions,
      correctAnswers: q.correctAnswers,
      difficulty: q.difficulty,
      timeSpent: `${Math.round(q.timeSpentSeconds / 60)}m ${q.timeSpentSeconds % 60}s`,
      date: new Date(q.timestamp).toLocaleDateString(),
    })),
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aura-learn-report-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Smart Alerts ───────────────────────────────────

export interface SmartAlert {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  message: string;
}

export function getSmartAlerts(): SmartAlert[] {
  const history = getQuizHistory();
  const stats = getUserStats();
  const skills = getSkillMap();
  const alerts: SmartAlert[] = [];

  // Check dismissed alerts
  const dismissed = getDismissedAlerts();

  // No quizzes in 2+ days
  if (history.length > 0) {
    const lastQuiz = history[0].timestamp;
    const daysSince = Math.floor((Date.now() - lastQuiz) / (1000 * 60 * 60 * 24));
    if (daysSince >= 2) {
      alerts.push({
        id: "missed_study",
        type: "warning",
        title: "Missed Study Sessions",
        message: `You haven't studied in ${daysSince} days. Keep your streak alive!`,
      });
    }
  }

  // Weak topics
  const weakTopics = skills.filter((s) => s.category === "Weak");
  if (weakTopics.length > 0) {
    alerts.push({
      id: "weak_topics",
      type: "warning",
      title: "Topics Need Attention",
      message: `${weakTopics.map((t) => t.topic).join(", ")} ${weakTopics.length === 1 ? "needs" : "need"} more practice.`,
    });
  }

  // Improvement celebration
  if (history.length >= 3) {
    const recent3 = history.slice(0, 3);
    const older3 = history.slice(3, 6);
    if (older3.length >= 1) {
      const recentAvg = recent3.reduce((s, q) => s + q.score, 0) / recent3.length;
      const olderAvg = older3.reduce((s, q) => s + q.score, 0) / older3.length;
      if (recentAvg > olderAvg + 10) {
        alerts.push({
          id: "improvement",
          type: "success",
          title: "Great Improvement!",
          message: `Your recent scores are ${Math.round(recentAvg - olderAvg)}% higher than before. Keep it up!`,
        });
      }
    }
  }

  // Streak milestone
  if (stats.currentStreak >= 3 && stats.currentStreak % 3 === 0) {
    alerts.push({
      id: `streak_${stats.currentStreak}`,
      type: "success",
      title: `${stats.currentStreak}-Day Streak! 🔥`,
      message: "You're on a roll! Consistency is the key to mastery.",
    });
  }

  // First quiz nudge
  if (history.length === 0) {
    alerts.push({
      id: "welcome",
      type: "info",
      title: "Welcome to Aura Learn!",
      message: "Take your first quiz to start tracking your progress.",
    });
  }

  return alerts.filter((a) => !dismissed.includes(a.id));
}

export function dismissAlert(alertId: string) {
  const dismissed = getDismissedAlerts();
  if (!dismissed.includes(alertId)) {
    dismissed.push(alertId);
    localStorage.setItem(KEYS.DISMISSED_ALERTS, JSON.stringify(dismissed));
  }
}

function getDismissedAlerts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.DISMISSED_ALERTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Seed Demo Data (for demonstration) ─────────────

export function seedDemoData() {
  if (getQuizHistory().length > 0) return; // Don't overwrite existing data

  const topics = [
    "React Hooks",
    "JavaScript ES6",
    "CSS Architecture",
    "TypeScript Generics",
    "Node.js Fundamentals",
    "Next.js App Router",
    "Python Basics",
    "Data Structures",
  ];

  const concepts = [
    ["useState", "useEffect", "useCallback", "useMemo", "Custom Hooks"],
    ["Arrow Functions", "Destructuring", "Promises", "Async/Await", "Modules"],
    ["Flexbox", "Grid Layout", "CSS Variables", "Specificity", "Animations"],
    ["Generic Functions", "Type Constraints", "Mapped Types", "Conditional Types", "Utility Types"],
    ["Event Loop", "Streams", "File System", "HTTP Module", "Express Basics"],
    ["Server Components", "Route Handlers", "Middleware", "Loading UI", "Error Boundaries"],
    ["Variables", "Functions", "Lists", "Dictionaries", "OOP Basics"],
    ["Arrays", "Linked Lists", "Trees", "Hash Tables", "Sorting Algorithms"],
  ];

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const history: QuizResult[] = [];

  for (let i = 0; i < 15; i++) {
    const topicIdx = i % topics.length;
    const totalQ = [5, 10, 5, 10, 5][i % 5];
    const correctBase = Math.floor(totalQ * (0.5 + Math.random() * 0.5));
    const correct = Math.min(correctBase, totalQ);
    const score = Math.round((correct / totalQ) * 100);
    const conceptList = concepts[topicIdx];
    const conceptResults = conceptList.slice(0, totalQ).map((c, ci) => ({
      concept: c,
      correct: ci < correct,
    }));

    history.push({
      id: `demo_${i}_${Math.random().toString(36).slice(2, 8)}`,
      userId: _currentUserId || "demo",
      topic: topics[topicIdx],
      title: `${topics[topicIdx]} Assessment ${i + 1}`,
      score,
      totalQuestions: totalQ,
      correctAnswers: correct,
      difficulty: score > 80 ? "Easy" : score > 50 ? "Medium" : "Hard",
      questionType: "Multiple Choice",
      timeSpentSeconds: 60 + Math.floor(Math.random() * 300),
      timestamp: now - (14 - i) * DAY + Math.floor(Math.random() * DAY * 0.5),
      concepts: conceptList.slice(0, totalQ),
      conceptResults,
      analysis: {
        strengths: conceptResults.filter((c) => c.correct).map((c) => c.concept),
        weaknesses: conceptResults.filter((c) => !c.correct).map((c) => c.concept),
        feedbackSummary: `Good understanding of ${topics[topicIdx]} with ${score}% accuracy.`,
      },
    });
  }

  // Sort newest first
  history.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(KEYS.QUIZ_HISTORY, JSON.stringify(history));

  // Compute badges for seeded data
  const badges = [...BADGE_DEFINITIONS];
  const nowTs = Date.now();
  badges.find((b) => b.id === "first_quiz")!.unlockedAt = nowTs;
  badges.find((b) => b.id === "quizzes_5")!.unlockedAt = nowTs;
  badges.find((b) => b.id === "quizzes_10")!.unlockedAt = nowTs;
  if (history.some((h) => h.score === 100)) {
    badges.find((b) => b.id === "perfect_score")!.unlockedAt = nowTs;
  }
  localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));

  emitStorageUpdate();
}
