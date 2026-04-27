"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  Star,
  TrendingUp,
  Plus,
  Sparkles,
  Flame,
  Clock,
  Download,
  X,
  Zap,
  Target,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Award,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  getUserStats,
  getQuizHistory,
  getSkillMap,
  getBadges,
  getSmartAlerts,
  dismissAlert,
  getXPAndLevel,
  getTimeByDay,
  getTimeBySubject,
  getPerformanceOverTime,

  exportReport,
  onStorageUpdate,
  type UserStats,
  type QuizResult,
  type SkillTopic,
  type Badge,
  type SmartAlert,
  type TimeFilter,
} from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import "./dashboard/dashboard.css";

// Chart components
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import RadarChart from "@/components/charts/RadarChart";
import HeatmapGrid from "@/components/charts/HeatmapGrid";


export default function Dashboard() {
  const { user } = useAuth();
  // ── State
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [skills, setSkills] = useState<SkillTopic[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [xpData, setXpData] = useState({ xp: 0, level: 1, xpInLevel: 0, xpForNextLevel: 200 });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [mounted, setMounted] = useState(false);

  // ── Load all data
  const loadData = useCallback(() => {
    const s = getUserStats();
    const h = getQuizHistory();
    const sk = getSkillMap();
    const b = getBadges();
    const a = getSmartAlerts();
    const xp = getXPAndLevel();

    setStats(s);
    setHistory(h);
    setSkills(sk);
    setBadges(b);
    setAlerts(a);
    setXpData(xp);
  }, []);

  useEffect(() => {
    // Don't seed demo data — each user starts fresh with their own real data
    loadData();
    setMounted(true);
    const unsub = onStorageUpdate(loadData);
    return unsub;
  }, [loadData]);

  // ── Dismiss alert
  const handleDismiss = (id: string) => {
    dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Derived data
  const performanceData = mounted ? getPerformanceOverTime(timeFilter) : [];
  const timeDayData = mounted ? getTimeByDay() : [];
  const timeSubjectData = mounted ? getTimeBySubject() : [];
  const unlockedBadges = badges.filter((b) => b.unlockedAt);
  const lockedBadges = badges.filter((b) => !b.unlockedAt);

  // ── Adaptive level steps
  const levelLabels = ["Beginner", "Intermediate", "Advanced"];
  const currentLevelIdx = stats
    ? levelLabels.indexOf(stats.learningLevel)
    : 0;

  if (!mounted || !stats) {
    return (
      <div className="loading-container">
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
        </div>
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    if (type === "warning") return "⚠️";
    if (type === "success") return "🎉";
    return "💡";
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return "high";
    if (score >= 50) return "mid";
    return "low";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div className="dash-container animate-fade-in">
      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}</p>
          <h1 className="dash-title">Performance Dashboard</h1>
        </div>
        <div className="dash-header-actions">
          <button
            className="btn btn-outline"
            onClick={exportReport}
            style={{ fontSize: "0.8rem", padding: "10px 16px" }}
          >
            <Download size={14} /> Export
          </button>
          <Link
            href="/generate"
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "10px 18px" }}
          >
            <Plus size={14} /> New Quiz
          </Link>
        </div>
      </div>

      {/* ── Smart Alerts ── */}
      {alerts.length > 0 && (
        <div className="dash-alerts">
          {alerts.map((alert) => (
            <div key={alert.id} className={`dash-alert ${alert.type}`}>
              <span style={{ fontSize: "1.1rem" }}>{getAlertIcon(alert.type)}</span>
              <div className="dash-alert-content">
                <div className="dash-alert-title">{alert.title}</div>
                <div className="dash-alert-msg">{alert.message}</div>
              </div>
              <button
                className="dash-alert-dismiss"
                onClick={() => handleDismiss(alert.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{ background: "var(--primary-glow)", border: "1px solid rgba(124, 106, 255, 0.12)" }}
          >
            <Brain size={20} color="var(--primary)" />
          </div>
          <p className="dash-stat-label">Quizzes Taken</p>
          <p className="dash-stat-value">{stats.totalQuizzes}</p>
        </div>

        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{ background: "var(--accent-emerald-glow)", border: "1px solid rgba(0, 212, 170, 0.1)" }}
          >
            <Star size={20} color="var(--accent-emerald)" />
          </div>
          <p className="dash-stat-label">Avg Accuracy</p>
          <p className="dash-stat-value">{stats.averageAccuracy}%</p>
        </div>

        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{ background: "var(--accent-amber-glow)", border: "1px solid rgba(245, 158, 11, 0.1)" }}
          >
            <Flame size={20} color="var(--accent-amber)" />
          </div>
          <p className="dash-stat-label">Study Streak</p>
          <p className="dash-stat-value">
            {stats.currentStreak}
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 500 }}> days</span>
          </p>
        </div>

        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{ background: "var(--accent-rose-glow)", border: "1px solid rgba(244, 114, 182, 0.1)" }}
          >
            <Clock size={20} color="var(--accent-rose)" />
          </div>
          <p className="dash-stat-label">Time Invested</p>
          <p className="dash-stat-value">{formatTime(stats.totalTimeSeconds)}</p>
        </div>
      </div>

      {/* ── XP & Level + Adaptive Level ── */}
      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <Zap size={16} color="var(--primary)" />
              Experience & Level
            </div>
            <div className="dash-level-badge">
              <Zap size={12} /> Level {xpData.level}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <DonutChart
              value={Math.round((xpData.xpInLevel / xpData.xpForNextLevel) * 100)}
              size={120}
              label={`${xpData.xp} XP`}
              sublabel={`${xpData.xpForNextLevel - xpData.xpInLevel} to next`}
            />
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginBottom: "12px",
                  lineHeight: 1.6,
                }}
              >
                You&apos;re <strong style={{ color: "var(--accent)" }}>{xpData.xpForNextLevel - xpData.xpInLevel} XP</strong> away
                from Level {xpData.level + 1}. Keep completing quizzes to level up!
              </p>
              <div className="dash-xp-bar-track">
                <div
                  className="dash-xp-bar-fill"
                  style={{ width: `${(xpData.xpInLevel / xpData.xpForNextLevel) * 100}%` }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "6px",
                  fontSize: "0.7rem",
                  color: "var(--text-dim)",
                }}
              >
                <span>{xpData.xpInLevel} XP</span>
                <span>{xpData.xpForNextLevel} XP</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <Target size={16} color="var(--accent-emerald)" />
              Adaptive Level
            </div>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "8px" }}>
            Your current learning level based on quiz performance and consistency.
          </p>
          <div className="dash-adaptive-track">
            {levelLabels.map((_, i) => (
              <div
                key={i}
                className={`dash-adaptive-step ${
                  i < currentLevelIdx ? "filled" : i === currentLevelIdx ? "current" : ""
                }`}
              />
            ))}
          </div>
          <div className="dash-adaptive-labels">
            {levelLabels.map((label, i) => (
              <span
                key={label}
                className={`dash-adaptive-label ${i === currentLevelIdx ? "active" : ""}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            {currentLevelIdx === 0 && "Complete more quizzes and improve accuracy to reach Intermediate level."}
            {currentLevelIdx === 1 && "Great progress! Push for 85%+ accuracy with 25+ quizzes to become Advanced."}
            {currentLevelIdx === 2 && "You've reached the highest level. You're a true knowledge master! 🏆"}
          </div>
        </div>
      </div>

      {/* ── Performance Chart + Skill Radar ── */}
      <div className="dash-grid-3-1">
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <TrendingUp size={16} color="var(--primary)" />
              Performance Trend
            </div>
            <div className="dash-filter-tabs">
              {(["daily", "weekly", "monthly"] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  className={`dash-filter-tab ${timeFilter === f ? "active" : ""}`}
                  onClick={() => setTimeFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: "100%", aspectRatio: "2.4 / 1" }}>
            <LineChart data={performanceData} />
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <Activity size={16} color="var(--accent-emerald)" />
              Accuracy
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "0" }}>
            <DonutChart
              value={stats.averageAccuracy}
              size={170}
              label="Overall"
              sublabel={`${stats.totalQuizzes} quizzes`}
            />
          </div>
        </div>
      </div>

      {/* ── Study Time Heatmap + Time by Subject ── */}
      <div className="dash-grid-2">
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <BarChart3 size={16} color="var(--accent-amber)" />
              Weekly Study Time
            </div>
          </div>
          <div style={{ padding: "16px 0 0" }}>
            <HeatmapGrid data={timeDayData} />
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-title">
              <Clock size={16} color="var(--accent-rose)" />
              Time by Subject
            </div>
          </div>
          <BarChart
            data={timeSubjectData.map((t) => ({
              label: t.topic,
              value: t.minutes,
            }))}
          />
        </div>
      </div>

      {/* ── Skill Radar ── */}
      {skills.length >= 3 && (
        <div className="dash-section" style={{ marginBottom: "20px" }}>
          <div className="dash-section-header">
            <div className="dash-section-title">
              <Sparkles size={16} color="var(--primary)" />
              Skill Radar
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              maxWidth: "420px",
              margin: "0 auto",
            }}
          >
            <RadarChart
              data={skills.slice(0, 8).map((s) => ({
                label: s.topic,
                value: s.accuracy,
                category: s.category,
              }))}
              size={320}
            />
          </div>
        </div>
      )}





      {/* ── Badges / Achievements ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <div className="dash-section-title">
            <Award size={16} color="var(--accent-amber)" />
            Achievements
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {unlockedBadges.length}/{badges.length} unlocked
          </span>
        </div>

        <div className="dash-badges-grid">
          {/* Unlocked first */}
          {unlockedBadges.map((badge) => (
            <div key={badge.id} className="dash-badge-card unlocked">
              <span className="dash-badge-icon">{badge.icon}</span>
              <div className="dash-badge-name">{badge.name}</div>
              <div className="dash-badge-desc">{badge.description}</div>
            </div>
          ))}
          {/* Locked */}
          {lockedBadges.map((badge) => (
            <div key={badge.id} className="dash-badge-card locked">
              <span className="dash-badge-icon">🔒</span>
              <div className="dash-badge-name">{badge.name}</div>
              <div className="dash-badge-desc">{badge.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

