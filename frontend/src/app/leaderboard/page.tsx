"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Crown, Medal, Flame, Users } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";
import { motion } from "framer-motion";
import "./leaderboard.css";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  aura_score: number;
  cluster_id: number;
  profile_name: string;
  total_quizzes: number;
  avg_accuracy: number;
  rank: number;
}

// Cluster visual config — premium cool palette
const CLUSTER_CONFIG: Record<number, { name: string; color: string; bg: string; border: string }> = {
  0: { name: "Consistent Improvers", color: "#38BDF8", bg: "rgba(56, 189, 248, 0.08)", border: "rgba(56, 189, 248, 0.18)" },
  1: { name: "Needs Foundation",     color: "#A78BFA", bg: "rgba(167, 139, 250, 0.08)", border: "rgba(167, 139, 250, 0.18)" },
  2: { name: "Rapid Ascenders",      color: "#10B981", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.18)" },
  3: { name: "Volatile Performers",  color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.18)" },
  4: { name: "Measured Learners",    color: "#6366F1", bg: "rgba(99, 102, 241, 0.08)", border: "rgba(99, 102, 241, 0.18)" },
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366F1, #38BDF8)",
  "linear-gradient(135deg, #10B981, #38BDF8)",
  "linear-gradient(135deg, #A78BFA, #6366F1)",
  "linear-gradient(135deg, #38BDF8, #10B981)",
  "linear-gradient(135deg, #6366F1, #A78BFA)",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarGradient(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getCluster(id: number) {
  return CLUSTER_CONFIG[id] || { name: "Unranked", color: "#5A5A7A", bg: "rgba(90, 90, 122, 0.08)", border: "rgba(90, 90, 122, 0.15)" };
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<number | null>(null); // null = all

  const fetchLeaderboard = (clusterId: number | null) => {
    setLoading(true);
    const url = clusterId !== null && clusterId >= 0
      ? `${BACKEND_URL}/api/leaderboard?cluster_id=${clusterId}`
      : `${BACKEND_URL}/api/leaderboard`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Leaderboard fetch error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeaderboard(activeFilter);
  }, [activeFilter]);

  const currentUserEntry = entries.find((e) => e.user_id === user?.uid);
  const topThree = entries.slice(0, 3);
  const restEntries = entries.slice(3);

  const medals = ["🥇", "🥈", "🥉"];
  const podiumScoreColors = ["#E2B340", "#94A3B8", "#B87333"];

  if (loading) {
    return (
      <div className="lb-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "70vh" }}>
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
        </div>
      </div>
    );
  }

  return (
    <div className="lb-container animate-fade-in">
      {/* Header */}
      <div className="lb-header">
        <div>
          <h1 className="lb-title">Aura Leaderboard</h1>
          <p className="lb-subtitle">
            Compete with learners across all clusters. Scores update every time you visit Aura Insights.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dim)", fontSize: "0.78rem" }}>
          <Users size={14} />
          {entries.length} ranked {entries.length === 1 ? "learner" : "learners"}
        </div>
      </div>

      {/* Your Rank Card */}
      {currentUserEntry && (
        <motion.div className="lb-your-rank" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="lb-your-rank-num">
            #{currentUserEntry.rank}
            <span>Your Rank</span>
          </div>
          <div className="lb-your-rank-info">
            <div className="lb-your-rank-name">{currentUserEntry.display_name}</div>
            <div className="lb-your-rank-meta">
              {getCluster(currentUserEntry.cluster_id).name} · {currentUserEntry.total_quizzes} quizzes · {currentUserEntry.avg_accuracy}% accuracy
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="lb-your-rank-score">{currentUserEntry.aura_score.toLocaleString()}</div>
            <div className="lb-your-rank-score-label">Aura Score</div>
          </div>
        </motion.div>
      )}

      {/* Cluster Filter Tabs */}
      <div className="lb-filters">
        <button
          className={`lb-filter-btn ${activeFilter === null ? "active" : ""}`}
          onClick={() => setActiveFilter(null)}
        >
          All Clusters
        </button>
        {Object.entries(CLUSTER_CONFIG).map(([id, config]) => (
          <button
            key={id}
            className={`lb-filter-btn ${activeFilter === Number(id) ? "active" : ""}`}
            onClick={() => setActiveFilter(Number(id))}
          >
            <span className="lb-filter-dot" style={{ background: config.color }} />
            {config.name}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="lb-table-panel">
          <div className="lb-empty">
            <div className="lb-empty-icon">
              <Trophy size={28} color="var(--primary)" />
            </div>
            <h3>No Rankings Yet</h3>
            <p>
              Visit <strong>Aura Insights</strong> to generate your Aura Score and appear on the leaderboard.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Podium — Top 3 */}
          {topThree.length >= 3 && (
            <div className="lb-podium">
              {topThree.map((entry, i) => {
                const cluster = getCluster(entry.cluster_id);
                return (
                  <motion.div
                    key={entry.user_id}
                    className="lb-podium-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12 }}
                  >
                    <div className="lb-podium-medal">{medals[i]}</div>
                    <div className="lb-podium-avatar" style={{ background: getAvatarGradient(entry.user_id) }}>
                      {getInitials(entry.display_name)}
                    </div>
                    <div className="lb-podium-name">{entry.display_name}</div>
                    <div className="lb-podium-score" style={{ color: podiumScoreColors[i] }}>
                      {entry.aura_score.toLocaleString()}
                    </div>
                    <div className="lb-podium-score-label">Aura Score</div>
                    <div className="lb-podium-cluster" style={{ color: cluster.color }}>
                      {cluster.name}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full Table */}
          <div className="lb-table-panel">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Learner</th>
                  <th>Aura Score</th>
                  <th>Cluster</th>
                  <th>Quizzes</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => {
                  const isSelf = entry.user_id === user?.uid;
                  const cluster = getCluster(entry.cluster_id);
                  return (
                    <motion.tr
                      key={entry.user_id}
                      className={isSelf ? "lb-row-self" : ""}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    >
                      <td className={`lb-rank ${entry.rank <= 3 ? `lb-rank-${entry.rank}` : ""}`}>
                        {entry.rank <= 3 ? (
                          <span className="lb-rank-medal">{medals[entry.rank - 1]}</span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td>
                        <div className="lb-user-cell">
                          <div className="lb-avatar" style={{ background: getAvatarGradient(entry.user_id) }}>
                            {getInitials(entry.display_name)}
                          </div>
                          <div>
                            <div className="lb-user-name">
                              {entry.display_name}
                              {isSelf && <span style={{ marginLeft: "6px", fontSize: "0.65rem", color: "var(--primary)", fontWeight: 700 }}>YOU</span>}
                            </div>
                            <div className="lb-user-tag">{cluster.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="lb-score-cell" style={{ color: "var(--text-main)" }}>
                        {entry.aura_score.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className="lb-cluster-badge"
                          style={{
                            color: cluster.color,
                            background: cluster.bg,
                            borderColor: cluster.border,
                          }}
                        >
                          <span className="lb-filter-dot" style={{ background: cluster.color, width: "6px", height: "6px" }} />
                          {cluster.name}
                        </span>
                      </td>
                      <td className="lb-stat">{entry.total_quizzes}</td>
                      <td className="lb-stat">{entry.avg_accuracy}%</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
