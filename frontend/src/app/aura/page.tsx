"use client";

import { useEffect, useState } from "react";
import { getQuizHistory, getUserStats, UserStats, QuizResult, getXPAndLevel, getSkillMap } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Info, Flame, Brain, Activity, Zap, TrendingUp, TrendingDown, Target, HelpCircle, Trophy, Compass, Play, ChevronRight, CheckCircle2, RefreshCw, Sparkles, BarChart3, Clock, Users, Cpu, LineChart, ArrowUpRight, ArrowDownRight, Minus, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { BACKEND_URL } from "@/lib/config";
import "./aura.css";
import CustomSelect from "@/components/CustomSelect";

interface MLAnalysis {
  concept_mastery: Record<string, number>;
  behavioral_strengths: string[];
  behavioral_weaknesses: string[];
  suggestions: { type: string; msg: string }[];
  learning_profile: {
    profile_name: string;
    description: string;
  };
  aura_score?: number;
}

export default function AuraJourney() {
  const { user } = useAuth();
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [mlData, setMlData] = useState<MLAnalysis | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "mastery" | "forecast" | "analytics">("overview");

  // Topic Filtering for Skill Tree
  const [topicMap, setTopicMap] = useState<Record<string, string[]>>({});
  const [selectedTopic, setSelectedTopic] = useState<string>("All");

  // Aura Score calculation
  const [auraScore, setAuraScore] = useState(0);

  // ZPD Simulator State
  const [zpdTopic, setZpdTopic] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [zpdResult, setZpdResult] = useState<any>(null);

  useEffect(() => {
    const h = getQuizHistory();
    const s = getUserStats();
    setHistory(h);
    setStats(s);

    if (h.length > 0) {
      // Calculate basic Aura score locally first (XP + Streak bonus)
      const { xp } = getXPAndLevel();
      const streakBonus = (s?.currentStreak || 0) * 50;
      let calculatedAura = xp + streakBonus;

      // Penalize for high hint usage or reward for low
      const avgHints = h.reduce((acc, curr) => acc + (curr.hintsPerQuestion || 0), 0) / h.length;
      if (avgHints < 0.5) calculatedAura += 200;
      if (avgHints > 2) calculatedAura -= 100;

      setAuraScore(Math.max(0, calculatedAura));

      // Build a map of Topics -> Concepts to categorize the skill tree
      const tMap: Record<string, Set<string>> = {};
      h.forEach(q => {
        let t = q.topic || "General";
        // Normalize to Title Case to prevent "Math" and "math" duplicates
        t = t.trim().split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
        if (!tMap[t]) tMap[t] = new Set();
        q.conceptResults?.forEach(cr => {
            if (cr.concept) tMap[t].add(cr.concept);
        });
      });
      const finalMap: Record<string, string[]> = {};
      Object.keys(tMap).forEach(k => finalMap[k] = Array.from(tMap[k]));
      setTopicMap(finalMap);
      
      // Select the first available topic automatically
      if (Object.keys(finalMap).length > 0) {
          setSelectedTopic(Object.keys(finalMap)[0]);
          setZpdTopic(Object.keys(finalMap)[0]);
      }

      // Fetch AI Insights (includes ML Data)
      const skillMap: Record<string, number> = {};
      const sk = getSkillMap();
      sk.forEach((skItem) => {
        skillMap[skItem.topic] = skItem.accuracy;
      });

      fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizHistory: h, stats: s, skillMap })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
           setMlData(data.insights.mlMetrics || null);
           setAiInsights(data.insights);

           // Auto-submit to leaderboard (fire-and-forget)
           const finalAura = data.insights.mlMetrics?.aura_score || calculatedAura;
           const clusterId = data.insights.mlMetrics?.learning_profile?.cluster_id ?? -1;
           const profileName = data.insights.mlMetrics?.learning_profile?.profile_name ?? "Unranked";
           if (user?.uid) {
             fetch(`${BACKEND_URL}/api/leaderboard/submit`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 user_id: user.uid,
                 display_name: user.displayName || "Anonymous",
                 aura_score: finalAura,
                 cluster_id: clusterId,
                 profile_name: profileName,
                 total_quizzes: s?.totalQuizzes || 0,
                 avg_accuracy: s?.averageAccuracy || 0,
               }),
             }).catch(() => {}); // Non-blocking
           }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch ML analysis for Aura Journey:", err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="aura-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="aura-container">
        <div className="aura-empty">
          <Flame size={48} color="var(--accent)" />
          <h2>Your Aura Journey Begins Here</h2>
          <p>Complete a few quizzes to unlock your Aura Score and Interactive Mastery Skill Tree.</p>
        </div>
      </div>
    );
  }

  // Filter nodes based on selected topic
  let filteredConcepts = Object.keys(mlData?.concept_mastery || {});
  if (selectedTopic !== "All" && topicMap[selectedTopic]) {
    filteredConcepts = filteredConcepts.filter(c => topicMap[selectedTopic].includes(c));
  }

  const nodes = filteredConcepts.map((concept, index) => {
    return { id: concept, mastery: mlData!.concept_mastery[concept], x: (index % 4) * 200 + 50, y: Math.floor(index / 4) * 160 + 30 };
  });

  return (
    <div className="aura-container animate-fade-in">
      <div className="aura-header">
        <div>
          <h1 className="aura-title">Aura Journey & Mastery</h1>
          <p className="aura-subtitle">Gamified Behavioral Traits & Interactive Skill Trees</p>
        </div>
        <div className="aura-score-badge">
          <div className="aura-score-icon-box">
            <Flame size={24} color="var(--accent-amber)" />
          </div>
          <div className="aura-score-content">
            <span className="aura-score-label">AURA SCORE</span>
            <span className="aura-score-value">{mlData?.aura_score || auraScore}</span>
          </div>
        </div>
      </div>

      <div className="aura-tabs">
        <button className={`aura-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <Activity size={16} /> Overview
        </button>
        <button className={`aura-tab-btn ${activeTab === 'mastery' ? 'active' : ''}`} onClick={() => setActiveTab('mastery')}>
          <Target size={16} /> Mastery
        </button>
        <button className={`aura-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`} onClick={() => setActiveTab('forecast')}>
          <Compass size={16} /> Predict
        </button>
        <button className={`aura-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <LineChart size={16} /> Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="aura-grid">
            {/* Behavioral Gamification Panel */}
        <div className="aura-panel">
          <div className="aura-panel-header">
            <Brain size={18} color="var(--primary)" />
            <h3>Behavioral Profile: {mlData?.learning_profile?.profile_name || "Analyzing..."}</h3>
          </div>
          <p className="aura-profile-desc">{mlData?.learning_profile?.description}</p>
          
          <div className="aura-traits">
            <div className="aura-trait-col">
              <h4 className="aura-trait-title"><TrendingUp size={14}/> Strengths</h4>
              {mlData?.behavioral_strengths?.length ? (
                mlData.behavioral_strengths.map((str, i) => (
                  <div key={i} className="aura-trait-item success">
                    <span>+</span> {str}
                  </div>
                ))
              ) : (
                <div className="aura-trait-empty">Keep practicing to build core strengths.</div>
              )}
            </div>
            <div className="aura-trait-col">
              <h4 className="aura-trait-title"><TrendingDown size={14}/> Weaknesses</h4>
              {mlData?.behavioral_weaknesses?.length ? (
                mlData.behavioral_weaknesses.map((wk, i) => (
                  <div key={i} className="aura-trait-item warning">
                    <span>-</span> {wk}
                  </div>
                ))
              ) : (
                <div className="aura-trait-empty">No critical weaknesses detected!</div>
              )}
            </div>
          </div>
        </div>

        {/* Aura Gamification Metrics */}
        <div className="aura-panel">
          <div className="aura-panel-header">
            <Trophy size={18} color="var(--accent-amber)" />
            <h3>Gamification Metrics</h3>
          </div>
          <div className="aura-metrics-grid">
            <div className="aura-metric-card">
              <Activity size={16} color="var(--primary)" />
              <div className="aura-metric-val">{stats?.currentStreak} Days</div>
              <div className="aura-metric-lbl">Current Streak</div>
              <div className="aura-metric-bonus">+{(stats?.currentStreak || 0) * 50} Aura</div>
            </div>
            <div className="aura-metric-card">
              <Zap size={16} color="var(--accent-emerald)" />
              <div className="aura-metric-val">{stats?.level}</div>
              <div className="aura-metric-lbl">Experience Level</div>
              <div className="aura-metric-bonus">+{(stats?.xp || 0)} Aura</div>
            </div>
            <div className="aura-metric-card">
              <HelpCircle size={16} color="var(--accent-rose)" />
              <div className="aura-metric-val">
                {((history.reduce((a,c) => a + (c.hintsPerQuestion||0), 0) / history.length) || 0).toFixed(1)}
              </div>
              <div className="aura-metric-lbl">Avg Hints / Question</div>
              <div className="aura-metric-bonus">Independence Bonus</div>
            </div>
          </div>
        </div>
      </div>

      {aiInsights && (
        <div className="aura-panel" style={{ marginBottom: '24px' }}>
          <div className="aura-panel-header">
            <Sparkles size={18} color="var(--primary)" />
            <h3>Generative Strategy & Insights</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
            <div className="aura-profile-desc" style={{ fontSize: '1rem', lineHeight: 1.6, padding: '16px', background: 'rgba(108, 99, 255, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                {aiInsights.weeklyDigest}
            </div>

            <div className="aura-grid" style={{ marginBottom: 0 }}>
              {/* Tips */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  💡 Tactical Adjustments
                </h4>
                {aiInsights.personalizedTips?.map((tip: string, i: number) => (
                  <div key={i} style={{ padding: '12px', fontSize: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <ChevronRight size={16} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>

              {/* Focus Areas */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  🎯 Critical Focus Areas
                </h4>
                {aiInsights.focusAreas?.map((fa: any, i: number) => (
                  <div key={i} style={{ padding: '12px', background: 'var(--bg-surface-2)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ padding: '4px 8px', fontSize: '0.65rem', borderRadius: '4px', background: fa.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: fa.priority === 'high' ? 'var(--danger)' : 'var(--accent-amber)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {fa.priority}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                        {fa.topic}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                        {fa.suggestion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Motivational Message */}
            {aiInsights.motivationalMessage && (
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--accent)",
                  fontStyle: "italic",
                  textAlign: "center",
                  padding: "16px 0 0",
                  opacity: 0.9,
                  fontWeight: 600
                }}
              >
                &ldquo;{aiInsights.motivationalMessage}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'forecast' && (
        <>
          {/* Zone of Proximal Development (ZPD) Simulator */}
          <div className="aura-panel zpd-panel">
        <div className="aura-panel-header">
          <Compass size={18} color="var(--accent-purple)" />
          <h3>ZPD Simulator: Prescriptive Learning Path</h3>
        </div>
        <p className="aura-profile-desc">
          Select a topic and the ML model will run <strong>3 ensemble forecasts</strong> (Easy/Medium/Hard) to predict your future scores and prescribe the optimal learning path to reach 95% mastery.
        </p>
        
        <div className="zpd-controls">
          <CustomSelect
            value={zpdTopic}
            onChange={setZpdTopic}
            options={Object.keys(topicMap).length === 0 
              ? [{ label: "No Topics Available", value: "" }]
              : Object.keys(topicMap).map(topic => ({ label: topic, value: topic }))
            }
            placeholder="Select a topic"
          />
          <button 
            className="zpd-button" 
            onClick={() => {
              if (!zpdTopic || !history.length) return;
              setIsSimulating(true);
              setZpdResult(null);
              fetch(`${BACKEND_URL}/api/zpd-simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history, topic: zpdTopic })
              })
              .then(res => res.json())
              .then(data => {
                setZpdResult(data);
                setIsSimulating(false);
              })
              .catch(err => {
                console.error("ZPD Simulation failed:", err);
                setIsSimulating(false);
              });
            }}
            disabled={isSimulating || !zpdTopic}
          >
            {isSimulating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Running Forecast...
              </>
            ) : (
              <>
                <Play size={14} />
                Run ZPD Simulation
              </>
            )}
          </button>
        </div>

        {isSimulating && (
          <div className="zpd-simulation-area" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-rings" style={{ margin: '0 auto 16px', width: '50px', height: '50px' }}>
              <div className="loading-ring-outer" />
              <div className="loading-ring-inner" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Running RF + GB ensemble forecasts across 3 difficulty levels...
            </p>
          </div>
        )}

        {zpdResult && !isSimulating && (
          <motion.div 
            className="zpd-simulation-area"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Mastery Overview Bar */}
            <div className="zpd-mastery-overview">
              <div className="zpd-mastery-stat">
                <span className="zpd-mastery-label">Current Mastery</span>
                <span className="zpd-mastery-value">{zpdResult.current_mastery}%</span>
              </div>
              <div className="zpd-mastery-arrow">→</div>
              <div className="zpd-mastery-stat">
                <span className="zpd-mastery-label">Target</span>
                <span className="zpd-mastery-value target">{zpdResult.target_mastery}%</span>
              </div>
              <div className="zpd-mastery-gap">
                Gap: <strong>{zpdResult.mastery_gap}%</strong>
              </div>
            </div>

            {/* Predicted Scores per Difficulty */}
            <h4 className="zpd-section-title">Ensemble Predicted Scores</h4>
            <div className="zpd-predictions">
              {zpdResult.predictions && Object.entries(zpdResult.predictions).map(([diff, score]: [string, any]) => {
                const isOptimal = diff === zpdResult.optimal_difficulty;
                const barColor = diff === "Easy" ? "#10B981" : diff === "Medium" ? "#38BDF8" : "#8B5CF6";
                return (
                  <div key={diff} className={`zpd-prediction-card ${isOptimal ? 'optimal' : ''}`}>
                    <div className="zpd-prediction-header">
                      <span className="zpd-prediction-diff">{diff}</span>
                      {isOptimal && <span className="zpd-optimal-badge">ZPD Optimal</span>}
                    </div>
                    <div className="zpd-prediction-score">{Math.round(score)}%</div>
                    <div className="zpd-prediction-bar-track">
                      <motion.div 
                        className="zpd-prediction-bar-fill" 
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prescribed Path */}
            <h4 className="zpd-section-title">Prescribed Learning Path ({zpdResult.total_quizzes_needed} quizzes)</h4>
            <div className="zpd-path">
              {zpdResult.prescribed_path?.map((step: any, i: number) => (
                <motion.div 
                  key={i} 
                  className="zpd-path-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                >
                  <div className="zpd-path-step-num">{step.step}</div>
                  <div className="zpd-path-step-body">
                    <div className="zpd-path-step-header">
                      <span className={`zpd-diff-tag ${step.difficulty.toLowerCase()}`}>{step.difficulty}</span>
                      <span className="zpd-path-count">×{step.count} quizzes</span>
                      {step.predicted_score && (
                        <span className="zpd-path-predicted">→ ~{Math.round(step.predicted_score)}% predicted</span>
                      )}
                    </div>
                    <div className="zpd-path-purpose">{step.purpose}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Explainability */}
            <div className="zpd-explanation">
              <Brain size={14} />
              <span>{zpdResult.explanation}</span>
            </div>
          </motion.div>
        )}
      </div>
        </>
      )}

      {activeTab === 'mastery' && (
        <>
          {/* Interactive Mastery Skill Tree */}
          <div className="aura-panel skill-tree-panel">
        <div className="aura-panel-header skill-tree-header">
          <div className="flex items-center gap-2">
            <Target size={18} color="var(--accent-emerald)" />
            <h3>Interactive Mastery Skill Tree</h3>
          </div>
          
          {/* Topic Filter Tabs */}
          <div className="skill-filter-tabs">
             <button 
                onClick={() => setSelectedTopic("All")}
                className={`skill-filter-btn ${selectedTopic === "All" ? "active" : ""}`}
             >
                All
             </button>
             {Object.keys(topicMap).map(topic => (
               <button 
                 key={topic}
                 onClick={() => setSelectedTopic(topic)}
                 className={`skill-filter-btn ${selectedTopic === topic ? "active" : ""}`}
               >
                 {topic}
               </button>
             ))}
          </div>
        </div>
        <p className="aura-profile-desc">Nodes illuminate as your mastery surpasses 80%.</p>
        
        <div className="skill-tree-container" style={{ height: Math.max(350, Math.ceil(nodes.length / 4) * 160 + 100) + 'px' }}>
          {nodes.length > 0 ? (
            <div className="skill-tree-viewport">
              {/* SVG Connecting Lines */}
              <svg className="skill-tree-svg" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
                {nodes.map((node, i) => {
                  const cx1 = (i % 4) * 200 + 100; // 50px offset + 50px (half width)
                  const cy1 = Math.floor(i / 4) * 160 + 80; // 30px offset + 50px (half height)
                  
                  const lines = [];
                  // Connect to next node in the same row
                  if ((i + 1) % 4 !== 0 && i + 1 < nodes.length) {
                    const cx2 = ((i + 1) % 4) * 200 + 100;
                    const cy2 = Math.floor((i + 1) / 4) * 160 + 80;
                    lines.push(<line key={`h-${i}`} x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="rgba(108, 99, 255, 0.2)" strokeWidth="2" strokeDasharray="4 4" />);
                  }
                  // Connect to node directly below
                  if (i + 4 < nodes.length) {
                    const cx2 = (i % 4) * 200 + 100;
                    const cy2 = Math.floor((i + 4) / 4) * 160 + 80;
                    lines.push(<line key={`v-${i}`} x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="rgba(108, 99, 255, 0.2)" strokeWidth="2" strokeDasharray="4 4" />);
                  }
                  return lines;
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((node, i) => {
                const isMastered = node.mastery >= 80;
                const isInProgress = node.mastery >= 40 && node.mastery < 80;
                
                return (
                  <motion.div 
                    key={node.id}
                    className={`skill-node ${isMastered ? 'mastered' : isInProgress ? 'progress' : 'locked'}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      left: `${(i % 4) * 200 + 50}px`,
                      top: `${Math.floor(i / 4) * 160 + 30}px`,
                    }}
                  >
                    <div className="skill-node-ring">
                      <div className="skill-node-fill" style={{ height: `${node.mastery}%` }} />
                    </div>
                    <div className="skill-node-content">
                      <div className="skill-node-title">{node.id}</div>
                      <div className="skill-node-val">{Math.round(node.mastery)}%</div>
                    </div>
                    {isMastered && (
                      <motion.div 
                        className="skill-node-glow"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="aura-trait-empty" style={{ margin: '40px' }}>
              More quiz data needed to generate the Skill Tree.
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
         DEEP ANALYTICS SECTIONS — Tier 3 Visualizations
         ══════════════════════════════════════════════════════════════ */}

      {activeTab === 'analytics' && (
        <>
          {/* 1. Deep Analytics Dashboard — 8 metric cards */}
      {aiInsights?.mlMetrics?.deepProfile && (() => {
        const dp = aiInsights.mlMetrics.deepProfile;
        const metrics = [
          { label: "Cognitive Load", value: dp.cognitive_load_index, max: 1, color: "var(--accent-amber)", desc: "How hard the material feels", formula: "(HintsUsed * 0.4) + (AvgPacingTime * 0.3) + (ErrorRate * 0.3)", scale: "0.00 to 1.00 (Lower is better)" },
          { label: "Speed × Accuracy", value: dp.speed_accuracy_tradeoff, max: 5, color: "var(--accent-emerald)", desc: "Efficiency of understanding", formula: "Accuracy * (50 - AvgTimeSpentPerQuestion)", scale: "0.00 to 5.00 (Higher is better)" },
          { label: "Engagement", value: dp.engagement_score, max: 100, color: "var(--primary)", desc: "Frequency × consistency × time", suffix: "%", formula: "SessionsCount * StreakConsistencyMultiplier", scale: "0% to 100% (Higher is better)" },
          { label: "Topic Consistency", value: dp.topic_consistency, max: 100, color: "var(--accent-purple)", desc: "Cross-topic score stability", suffix: "%", formula: "100 * (1.0 - StdDev(TopicScores))", scale: "0% to 100% (Higher is better)" },
          { label: "Mastery Velocity", value: dp.mastery_velocity, max: 10, color: dp.mastery_velocity >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)", desc: "Learning speed (pts/quiz)", formula: "LinearRegressionSlope(RecentScores)", scale: "-10.0 to +10.0 (Positive is better)" },
          { label: "Difficulty Stretch", value: dp.difficulty_stretch_rate, max: 1, color: "var(--accent-amber)", desc: "Hard score ÷ Easy score", formula: "AvgHardScore / AvgEasyScore", scale: "0.00 to 1.00 (Higher is better)" },
          { label: "Recovery Rate", value: dp.recovery_rate, max: 50, color: "var(--accent-emerald)", desc: "Avg bounce-back after a bad quiz", formula: "Mean(ScoreDifference[Quiz_N - Quiz_N-1]) where Quiz_N-1 < 50%", scale: "0.00 to 50.00 (Higher is better)" },
          { label: "Streak Momentum", value: dp.streak_momentum, max: 20, color: dp.streak_momentum >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)", desc: "Weighted recent score trajectory", formula: "WeightedMovingAverage(Scores)", scale: "0.00 to 20.00 (Higher is better)" },
        ];
        return (
          <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="aura-panel-header">
              <Cpu size={18} color="var(--accent-purple)" />
              <h3>Deep Behavioral Analytics</h3>
            </div>
            <p className="aura-profile-desc">12 engineered features computed from your quiz behavioral data. Peak hour: <strong>{dp.peak_performance_hour}:00</strong> ({dp.peak_hour_score}% avg). Concepts explored: <strong>{dp.concept_breadth}</strong>.</p>
            <div className="deep-metrics-grid">
              {metrics.map((m, i) => (
                <motion.div key={m.label} className="deep-metric-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}>
                  <div className="deep-metric-label-wrapper">
                    <div className="deep-metric-label">{m.label}</div>
                    <div className="deep-metric-tooltip-container">
                      <Info size={13} className="deep-metric-info-icon" />
                      <div className="deep-metric-tooltip-content">
                        <div className="tooltip-title">{m.label}</div>
                        <div className="tooltip-desc">{m.desc}</div>
                        <div className="tooltip-details">
                          <div className="tooltip-detail-item"><strong className="tooltip-label">Formula:</strong> <code className="tooltip-code">{m.formula}</code></div>
                          <div className="tooltip-detail-item"><strong className="tooltip-label">Scale:</strong> <span className="tooltip-scale-val">{m.scale}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="deep-metric-value" style={{ color: m.color }}>
                    {typeof m.value === 'number' ? (m.value > 10 ? Math.round(m.value) : m.value.toFixed(2)) : m.value}{m.suffix || ''}
                  </div>
                  <div className="deep-metric-bar-track">
                    <motion.div className="deep-metric-bar-fill" style={{ background: m.color, width: `${Math.min(100, Math.abs(Number(m.value)) / m.max * 100)}%` }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.abs(Number(m.value)) / m.max * 100)}%` }} transition={{ duration: 0.8, delay: 0.1 * i }} />
                  </div>
                  <div className="deep-metric-desc">{m.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })()}

      {/* 2. Score Trend Line */}
      {history.length >= 3 && (
        <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="aura-panel-header">
            <LineChart size={18} color="var(--accent)" />
            <h3>Score Progression</h3>
          </div>
          <p className="aura-profile-desc">Your score history across all quizzes. Hover for exact values.</p>
          <div className="trend-chart">
            {[...history].reverse().map((q, i) => {
              const color = q.score >= 80 ? 'var(--chart-high)' : q.score >= 50 ? 'var(--chart-mid)' : 'var(--chart-low)';
              return <div key={i} className="trend-bar" data-score={`${q.score}% — ${q.topic}`} style={{ height: `${q.score}%`, background: color }} />;
            })}
          </div>
          {aiInsights?.mlMetrics?.progressForecast?.trend_direction && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {aiInsights.mlMetrics.progressForecast.trend_direction === 'improving' ? <ArrowUpRight size={14} color="var(--accent-emerald)" /> : aiInsights.mlMetrics.progressForecast.trend_direction === 'declining' ? <ArrowDownRight size={14} color="var(--accent-rose)" /> : <Minus size={14} />}
              Trend: <strong style={{ color: aiInsights.mlMetrics.progressForecast.trend_direction === 'improving' ? 'var(--accent-emerald)' : aiInsights.mlMetrics.progressForecast.trend_direction === 'declining' ? 'var(--accent-rose)' : 'var(--text-main)' }}>{aiInsights.mlMetrics.progressForecast.trend_direction}</strong>
              &nbsp;(slope: {aiInsights.mlMetrics.progressForecast.trend_slope})
            </div>
          )}
        </motion.div>
      )}
        </>
      )}

      {activeTab === 'mastery' && (
        <>
          {/* 3. Topic Intelligence Matrix */}
          {aiInsights?.mlMetrics?.topicMatrix?.topics && Object.keys(aiInsights.mlMetrics.topicMatrix.topics).length > 0 && (
        <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="aura-panel-header">
            <BarChart3 size={18} color="var(--accent-amber)" />
            <h3>Topic Intelligence Matrix</h3>
          </div>
          <p className="aura-profile-desc">Strongest: <strong style={{color:'var(--accent-emerald)'}}>{aiInsights.mlMetrics.topicMatrix.strongest_topic}</strong> · Weakest: <strong style={{color:'var(--accent-rose)'}}>{aiInsights.mlMetrics.topicMatrix.weakest_topic}</strong></p>
          <div className="topic-heatmap">
            <table>
              <thead><tr><th>Topic</th><th>Mastery</th><th>Velocity</th><th>Consistency</th><th>Attempts</th><th>Avg Time/Q</th></tr></thead>
              <tbody>
                {Object.entries(aiInsights.mlMetrics.topicMatrix.topics).map(([topic, data]: [string, any]) => (
                  <tr key={topic}>
                    <td style={{ fontWeight: 700 }}>{topic}</td>
                    <td>
                      <span className="topic-heatmap-cell" style={{ background: data.mastery >= 80 ? 'rgba(0,230,138,0.12)' : data.mastery >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: data.mastery >= 80 ? 'var(--accent-emerald)' : data.mastery >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                        {data.mastery}%
                      </span>
                    </td>
                    <td className={data.velocity > 0 ? 'topic-velocity-up' : data.velocity < 0 ? 'topic-velocity-down' : 'topic-velocity-flat'}>
                      {data.velocity > 0 ? '↑' : data.velocity < 0 ? '↓' : '→'} {data.velocity}
                    </td>
                    <td>{data.consistency}%</td>
                    <td>{data.attempts}</td>
                    <td>{data.avg_time_per_q}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
        </>
      )}

      {activeTab === 'analytics' && (
        <>
        <div className="aura-grid">
          {/* 4. Learning Rhythm */}
        {aiInsights?.mlMetrics?.learningRhythm?.daily_volume && (
          <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="aura-panel-header">
              <Clock size={18} color="var(--accent-emerald)" />
              <h3>Learning Rhythm</h3>
            </div>
            <p className="aura-profile-desc">Best time: <strong>{aiInsights.mlMetrics.learningRhythm.optimal_window || 'N/A'}</strong> · Avg session: <strong>{aiInsights.mlMetrics.learningRhythm.session_avg_duration_min} min</strong></p>
            <div className="rhythm-chart">
              {Object.entries(aiInsights.mlMetrics.learningRhythm.daily_volume).map(([day, data]: [string, any]) => {
                const maxCount = Math.max(1, ...Object.values(aiInsights.mlMetrics.learningRhythm.daily_volume as Record<string, any>).map((d: any) => d.count));
                const heightPct = data.count > 0 ? (data.count / maxCount) * 100 : 3;
                const barColor = data.avg_score >= 80 ? 'var(--accent-emerald)' : data.avg_score >= 50 ? 'var(--accent-amber)' : data.count === 0 ? 'rgba(255,255,255,0.06)' : 'var(--accent-rose)';
                return (
                  <div key={day} className="rhythm-bar-wrapper">
                    <div className="rhythm-bar-value">{data.count > 0 ? `${data.avg_score}%` : ''}</div>
                    <div className="rhythm-bar" style={{ height: `${heightPct}%`, background: barColor }} />
                    <div className="rhythm-bar-label">{day.slice(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 5. Comparative Stats */}
        {aiInsights?.mlMetrics?.comparativeStats?.comparison && Object.keys(aiInsights.mlMetrics.comparativeStats.comparison).length > 0 && (
          <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="aura-panel-header">
              <Users size={18} color="var(--primary)" />
              <h3>You vs Cluster Peers</h3>
            </div>
            <p className="aura-profile-desc">Cluster: <strong>{aiInsights.mlMetrics.comparativeStats.cluster_name}</strong> · Percentile: <strong>{aiInsights.mlMetrics.comparativeStats.percentile_rank}th</strong></p>
            <div className="comparative-grid">
              {Object.entries(aiInsights.mlMetrics.comparativeStats.comparison).map(([feat, data]: [string, any]) => {
                const maxVal = Math.max(data.student, data.cluster_avg, 1);
                const isAbove = data.student >= data.cluster_avg;
                return (
                  <div key={feat} className="comparative-item">
                    <div className="comparative-item-label">{feat.replace(/_/g, ' ')}</div>
                    <div className="comparative-bars">
                      <div className="comparative-bar-row">
                        <div className="comparative-bar-label">You</div>
                        <div className="comparative-bar-track">
                          <motion.div className="comparative-bar-fill" style={{ width: `${(data.student / maxVal) * 100}%`, background: isAbove ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} initial={{ width: 0 }} animate={{ width: `${(data.student / maxVal) * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                        <div className="comparative-bar-val">{data.student}</div>
                      </div>
                      <div className="comparative-bar-row">
                        <div className="comparative-bar-label">Peers</div>
                        <div className="comparative-bar-track">
                          <motion.div className="comparative-bar-fill" style={{ width: `${(data.cluster_avg / maxVal) * 100}%`, background: 'rgba(255,255,255,0.2)' }} initial={{ width: 0 }} animate={{ width: `${(data.cluster_avg / maxVal) * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                        <div className="comparative-bar-val">{data.cluster_avg}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      <div className="aura-grid">
        {/* 6. Feature Importance */}
        {aiInsights?.mlMetrics?.featureImportance?.features?.length > 0 && (
          <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="aura-panel-header">
              <Cpu size={18} color="var(--accent)" />
              <h3>Model Feature Importance</h3>
            </div>
            <p className="aura-profile-desc">What the ML ensemble weighs most when predicting your scores. Top signal: <strong>{aiInsights.mlMetrics.featureImportance.top_feature?.replace(/_/g, ' ')}</strong></p>
            <div className="fi-list">
              {aiInsights.mlMetrics.featureImportance.features.slice(0, 8).map((f: any, i: number) => (
                <motion.div key={f.name} className="fi-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                  <div className="fi-name" title={f.description}>{f.name.replace(/_/g, ' ')}</div>
                  <div className="fi-bar-track">
                    <motion.div className="fi-bar-fill" initial={{ width: 0 }} animate={{ width: `${f.avg_importance * 100 / (aiInsights.mlMetrics.featureImportance.features[0]?.avg_importance || 1)}%` }} transition={{ duration: 0.8, delay: 0.05 * i }} />
                  </div>
                  <div className="fi-pct">{f.pct}%</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
        </>
      )}

      {activeTab === 'forecast' && (
        <div className="aura-grid">
          {/* 7. Progress Forecast */}
          {aiInsights?.mlMetrics?.progressForecast?.projections?.length > 0 && (
          <motion.div className="aura-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="aura-panel-header">
              <TrendingUp size={18} color="var(--accent-emerald)" />
              <h3>Progress Forecast</h3>
            </div>
            <p className="aura-profile-desc">4-week projection based on your current trajectory (slope: {aiInsights.mlMetrics.progressForecast.trend_slope})</p>
            <div className="forecast-timeline">
              <div className="forecast-week">
                <div className="forecast-week-score" style={{ color: 'var(--accent)' }}>{aiInsights.mlMetrics.progressForecast.current_avg}%</div>
                <div className="forecast-week-bar" style={{ height: `${aiInsights.mlMetrics.progressForecast.current_avg}px`, background: 'var(--accent)' }} />
                <div className="forecast-week-label">Now</div>
              </div>
              {aiInsights.mlMetrics.progressForecast.projections.map((p: any) => (
                <div key={p.week} className="forecast-week">
                  <div className="forecast-week-score">{p.projected_score}%</div>
                  <motion.div className="forecast-week-bar" style={{ background: `rgba(108, 99, 255, ${p.confidence})` }} initial={{ height: 0 }} animate={{ height: `${p.projected_score}px` }} transition={{ duration: 0.6, delay: p.week * 0.15 }} />
                  <div className="forecast-week-label">Wk {p.week}</div>
                  <div className="forecast-week-conf">{Math.round(p.confidence * 100)}% conf</div>
                </div>
              ))}
            </div>
            <div className="forecast-mastery-info">
              <Calendar size={14} />
              <span>Estimated time to 95% mastery: <strong>{aiInsights.mlMetrics.progressForecast.projected_mastery_date}</strong></span>
            </div>
          </motion.div>
        )}
        </div>
      )}
    </div>
  );
}
