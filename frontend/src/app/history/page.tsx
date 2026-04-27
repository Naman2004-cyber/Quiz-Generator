"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  Search,
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  Clock,
  Filter,
} from "lucide-react";
import {
  getQuizHistory,
  searchQuizzes,
  onStorageUpdate,
  type QuizResult,
} from "@/lib/storage";
import "../dashboard/dashboard.css";

const HISTORY_PAGE_SIZE = 10;

export default function QuizHistoryPage() {
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<QuizResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(() => {
    const h = getQuizHistory();
    setHistory(h);
    setFilteredHistory(h);
    setVisibleCount(HISTORY_PAGE_SIZE);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      loadData();
      setMounted(true);
    }, 0);
    const unsub = onStorageUpdate(loadData);
    return unsub;
  }, [loadData]);

  // Search / Filter
  useEffect(() => {
    setTimeout(() => {
      const results = searchQuizzes({
        search: searchQuery || undefined,
        difficulty: difficultyFilter || undefined,
      });
      setFilteredHistory(results);
      setVisibleCount(HISTORY_PAGE_SIZE);
    }, 0);
  }, [searchQuery, difficultyFilter]);

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

  if (!mounted) {
    return (
      <div className="loading-container">
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
        </div>
        <p className="text-muted">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="dash-container animate-fade-in">
      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Your Learning Journey</p>
          <h1 className="dash-title">Quiz History</h1>
        </div>
        <div className="dash-header-actions">
          <Link
            href="/generate"
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "10px 18px" }}
          >
            <Plus size={14} /> New Quiz
          </Link>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="dash-stats-grid" style={{ marginBottom: "20px" }}>
        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{
              background: "var(--primary-glow)",
              border: "1px solid rgba(124, 106, 255, 0.12)",
            }}
          >
            <History size={20} color="var(--primary)" />
          </div>
          <p className="dash-stat-label">Total Quizzes</p>
          <p className="dash-stat-value">{history.length}</p>
        </div>

        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{
              background: "rgba(52, 211, 153, 0.08)",
              border: "1px solid rgba(52, 211, 153, 0.1)",
            }}
          >
            <Brain size={20} color="var(--success)" />
          </div>
          <p className="dash-stat-label">Avg Score</p>
          <p className="dash-stat-value">
            {history.length > 0
              ? Math.round(
                  history.reduce((acc, q) => acc + q.score, 0) / history.length
                )
              : 0}
            %
          </p>
        </div>

        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{
              background: "var(--accent-emerald-glow)",
              border: "1px solid rgba(0, 212, 170, 0.1)",
            }}
          >
            <Clock size={20} color="var(--accent-emerald)" />
          </div>
          <p className="dash-stat-label">Total Time</p>
          <p className="dash-stat-value">
            {formatTime(
              history.reduce((acc, q) => acc + q.timeSpentSeconds, 0)
            )}
          </p>
        </div>

        <div className="dash-stat-card">
          <div
            className="dash-stat-icon"
            style={{
              background: "var(--accent-amber-glow)",
              border: "1px solid rgba(245, 158, 11, 0.1)",
            }}
          >
            <Filter size={20} color="var(--accent-amber)" />
          </div>
          <p className="dash-stat-label">Showing</p>
          <p className="dash-stat-value">{filteredHistory.length}</p>
        </div>
      </div>

      {/* Main History Section */}
      <div className="dash-section">
        <div className="dash-section-header">
          <div className="dash-section-title">
            <History size={16} color="var(--primary)" />
            All Quizzes
          </div>
        </div>

        {/* Search & Filter */}
        <div className="dash-search-bar">
          <div className="dash-search-wrapper">
            <Search size={14} className="dash-search-icon" />
            <input
              className="dash-search-input"
              placeholder="Search quizzes by topic or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="dash-filter-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Activity List */}
        {filteredHistory.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <Search size={28} color="var(--text-dim)" />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {history.length === 0
                ? "No quizzes yet. Start your learning journey!"
                : "No results match your search."}
            </p>
            {history.length === 0 && (
              <Link
                href="/generate"
                className="btn btn-primary"
                style={{
                  fontSize: "0.8rem",
                  padding: "10px 20px",
                  marginTop: "16px",
                }}
              >
                <Plus size={14} /> Generate Your First Quiz
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="dash-activity-list">
              {filteredHistory.slice(0, visibleCount).map((quiz) => (
                <div key={quiz.id} className="dash-activity-item">
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "var(--primary-glow)",
                      border: "1px solid rgba(124, 106, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Brain size={16} color="var(--primary)" />
                  </div>
                  <div className="dash-activity-topic">
                    <div className="dash-activity-topic-name">{quiz.topic}</div>
                    <div className="dash-activity-topic-date">
                      {new Date(quiz.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {quiz.correctAnswers}/{quiz.totalQuestions} correct
                    </div>
                  </div>
                  <span className="dash-difficulty-tag">{quiz.difficulty}</span>
                  <span className="dash-time-tag">
                    {formatTime(quiz.timeSpentSeconds)}
                  </span>
                  <span
                    className={`dash-activity-badge ${getScoreBadgeClass(
                      quiz.score
                    )}`}
                  >
                    {quiz.score}%
                  </span>
                </div>
              ))}
            </div>

            {/* Show More / Show Less */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              {visibleCount < filteredHistory.length && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "0.78rem", padding: "9px 20px" }}
                  onClick={() =>
                    setVisibleCount((prev) => prev + HISTORY_PAGE_SIZE)
                  }
                >
                  <ChevronDown size={14} />
                  Show More ({filteredHistory.length - visibleCount} remaining)
                </button>
              )}
              {visibleCount > HISTORY_PAGE_SIZE && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "0.78rem", padding: "9px 20px" }}
                  onClick={() => setVisibleCount(HISTORY_PAGE_SIZE)}
                >
                  <ChevronUp size={14} />
                  Show Less
                </button>
              )}
            </div>

            {/* Count indicator */}
            <div
              style={{
                textAlign: "center",
                marginTop: "10px",
                fontSize: "0.72rem",
                color: "var(--text-dim)",
              }}
            >
              Showing {Math.min(visibleCount, filteredHistory.length)} of{" "}
              {filteredHistory.length} quizzes
            </div>
          </>
        )}
      </div>
    </div>
  );
}
