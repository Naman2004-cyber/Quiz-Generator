"use client";

import { useEffect, useState, useRef } from "react";
import { Target, Zap, AlertTriangle, Activity, ExternalLink, BookOpen, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { saveQuizResult, updateQuizAnalysis, getQuizHistory, getQuizResults } from "@/lib/storage";

const ANALYSIS_STEPS = [
  "Ingesting evaluation responses...",
  "Cross-referencing cognitive markers...",
  "Validating logic and syntactic gaps...",
  "Formatting personalized growth blueprint...",
  "Pulling optimal resource metadata..."
];

export default function ResultsAndAnalysis() {
  const [resultsData, setResultsData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(false); // Prevent double-saving

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const runAnalysis = async () => {
      const parsedData = getQuizResults();
      if (!parsedData) return;
      setResultsData(parsedData);

      // ── Save quiz result to dashboard storage ──
      let savedQuizId: string | null = null;
      if (!savedRef.current) {
        savedRef.current = true;
        try {
          const { quiz, answers, questionBehaviors, hintsRevealed, totalTimeMs } = parsedData;
          const questions = quiz.questions || [];
          
          // Calculate score
          let correctCount = 0;
          const conceptResults: { concept: string; correct: boolean }[] = [];
          const concepts: string[] = [];
          
          // Per-question behavioral data
          const perQuestionData: any[] = [];

          questions.forEach((q: any, idx: number) => {
            const userAns = Number(answers[idx]);
            let correctAns = q.correctAnswerIndex;
            if (typeof correctAns === "string") {
               correctAns = correctAns.toUpperCase();
               if (correctAns === "A") correctAns = 0;
               else if (correctAns === "B") correctAns = 1;
               else if (correctAns === "C") correctAns = 2;
               else if (correctAns === "D") correctAns = 3;
               else correctAns = Number(correctAns);
            } else {
               correctAns = Number(correctAns);
            }
            const isCorrect = userAns === correctAns;
            if (isCorrect) correctCount++;
            
            const concept = q.concept || q.topic || quiz.topic || "General";
            if (!concepts.includes(concept)) concepts.push(concept);
            conceptResults.push({ concept, correct: isCorrect });

            // Collect behavioral data for this question
            const behavior = questionBehaviors?.[idx] || {};
            const hints = hintsRevealed?.[idx] || 0;
            perQuestionData.push({
              questionIndex: idx,
              correct: isCorrect,
              concept,
              timeSpentMs: behavior.timeSpentMs || 0,
              hintsUsed: hints,
              answerChanges: behavior.answerChanges || 0,
            });
          });

          const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
          
          // Aggregate behavioral metrics
          const totalHints = perQuestionData.reduce((s: number, q: any) => s + q.hintsUsed, 0);
          const totalChanges = perQuestionData.reduce((s: number, q: any) => s + q.answerChanges, 0);
          const avgTimePerQ = perQuestionData.length > 0
            ? Math.round(perQuestionData.reduce((s: number, q: any) => s + q.timeSpentMs, 0) / perQuestionData.length / 1000)
            : 30;

          const saved = saveQuizResult({
            topic: quiz.topic || "General",
            title: quiz.title || `Quiz on ${quiz.topic || "Unknown"}`,
            score,
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            difficulty: quiz.difficulty || "Medium",
            questionType: quiz.questionType || "Multiple Choice",
            timeSpentSeconds: totalTimeMs ? Math.round(totalTimeMs / 1000) : Math.floor(questions.length * 30),
            timestamp: Date.now(),
            concepts,
            conceptResults,
            // New behavioral fields for ML model
            hintsUsed: totalHints,
            hintsPerQuestion: questions.length > 0 ? +(totalHints / questions.length).toFixed(2) : 0,
            answerChanges: totalChanges,
            avgTimePerQuestionSec: avgTimePerQ,
            perQuestionData,
          });
          savedQuizId = saved.id;
        } catch (err) {
          console.error("Failed to save quiz result:", err);
        }
      }

      // ── Fetch AI analysis ──
      try {
        const history = getQuizHistory();
        const payload = { ...parsedData, history };

        const res = await fetch("/api/analyze-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to analyze skill gaps.");
        }
        const data = await res.json();
        // Update the saved quiz with AI analysis
        const finalAnalysis = data.analysis;
        finalAnalysis.mlMetrics = data.mlMetrics;
        setAnalysis(finalAnalysis);

        if (savedQuizId && finalAnalysis) {
          updateQuizAnalysis(savedQuizId, {
            strengths: finalAnalysis.strengths || [],
            weaknesses: finalAnalysis.weaknesses || [],
            feedbackSummary: finalAnalysis.feedbackSummary || "",
          });
        }
      } catch (err: any) {
        console.error("Failed to analyze", err);
        setError(err.message || "An unexpected error occurred during AI analysis. The model might be experiencing high demand.");
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container animate-fade-in">
        <div className="loading-rings">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
          <Zap size={28} color="var(--accent)" className="animate-pulse" />
        </div>
        <h2 className="heading-md mb-3" style={{ fontSize: "1.25rem" }}>Synthesizing Trace</h2>
        <div className="loading-step">
          <Activity size={14} color="var(--accent)" className="animate-pulse" />
          {ANALYSIS_STEPS[loadingStep]}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container animate-fade-in">
        <div className="error-icon-box">
           <AlertTriangle color="var(--danger)" size={28} />
        </div>
        <h2 className="heading-md mb-2">Analysis Interrupted</h2>
        <p className="text-muted mb-6" style={{ maxWidth: "400px", margin: "0 auto 24px", fontSize: "0.875rem" }}>{error}</p>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>Retry Extraction</button>
      </div>
    );
  }

  if (!analysis) return <div className="text-muted p-10 text-center">No trace available.</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: "850px", margin: "0 auto", padding: "40px 0" }}>
      {/* Header with Score */}
      <header className="mb-10 flex items-center justify-between pb-6" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <div>
          <h1 className="heading-lg mb-2">Performance Audit</h1>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Diagnostics based on recent logic test</p>
        </div>
        <div className="stat-card" style={{ padding: "16px 28px", gap: "12px" }}>
          <Activity size={22} color="var(--accent)" />
          <div>
            <p className="stat-label">Score</p>
            <h2 className="stat-value" style={{ fontSize: "1.5rem" }}>{analysis.score}%</h2>
          </div>
        </div>
      </header>

      {/* Diagnostic Summary */}
      <div className="glass-panel mb-8 delay-100 animate-fade-in" style={{ borderLeft: "3px solid var(--primary-start)" }}>
        <h3 className="heading-sm mb-3">Diagnostic Summary</h3>
        <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: "1.7" }}>{analysis.feedbackSummary}</p>
      </div>

      {/* Machine Learning Forecast */}
      {analysis.mlMetrics && analysis.mlMetrics.forecast && (
      <div className="glass-panel mb-8 delay-150 animate-fade-in" style={{ padding: "28px", border: "1px solid rgba(124, 106, 255, 0.15)", background: "rgba(124, 106, 255, 0.03)" }}>
         <div className="flex items-center gap-2 mb-4">
             <Zap size={18} color="var(--primary-start)" />
             <h3 className="heading-sm">Machine Learning Forecast</h3>
         </div>
         <p className="text-muted mb-6" style={{ fontSize: "0.85rem", lineHeight: "1.6" }}>
           Based on your historical cluster profile <strong style={{color:"var(--accent)"}}>({analysis.mlMetrics.learning_profile.profile_name})</strong>, our Scikit-Learn RandomForest model formulated the following prediction for your next assessment.
         </p>
         
         <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <div style={{ padding: "16px 24px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid var(--border-color)", textAlign: "center" }}>
               <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "4px" }}>Expected Score</div>
               <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary-start)" }}>{analysis.mlMetrics.forecast.expected_score}%</div>
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
               {["Easy", "Medium", "Hard"].map(diff => (
                 <div key={diff} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "60px", fontSize: "0.75rem" }} className="text-muted">{diff}</div>
                    <div style={{ flex: 1, height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${analysis.mlMetrics.forecast.difficulty_adjustments[diff]}%`, background: diff==="Easy" ? "var(--success)" : diff==="Medium" ? "var(--accent)" : "var(--danger)", borderRadius: "4px" }}></div>
                    </div>
                    <div style={{ width: "40px", fontSize: "0.75rem", textAlign: "right" }} className="text-main">{Math.round(analysis.mlMetrics.forecast.difficulty_adjustments[diff])}%</div>
                 </div>
               ))}
            </div>
         </div>
         
         {analysis.mlMetrics.forecast.explanation && (
            <div style={{ marginTop: "24px", padding: "16px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "10px", borderLeft: "3px solid var(--accent)", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
               {analysis.mlMetrics.forecast.explanation}
            </div>
         )}
      </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 mb-8 delay-200 animate-fade-in">
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div className="flex items-center gap-2 mb-4">
             <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
             <h3 className="heading-sm" style={{ fontSize: "0.85rem" }}>Validated Strengths</h3>
          </div>
          <div className="flex-column gap-2">
             {analysis.strengths.map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-3" style={{ padding: "10px 14px", background: "rgba(0, 230, 138, 0.04)", border: "1px solid rgba(0, 230, 138, 0.08)", borderRadius: "10px" }}>
                   <CheckCircle2 size={14} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
                   <span className="text-muted" style={{ fontSize: "0.82rem", lineHeight: "1.5" }}>{s}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "28px" }}>
           <div className="flex items-center gap-2 mb-4">
             <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)", boxShadow: "0 0 8px var(--warning)" }} />
             <h3 className="heading-sm" style={{ fontSize: "0.85rem" }}>Critical Weaknesses</h3>
          </div>
          <div className="flex-column gap-2">
             {analysis.weaknesses.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-3" style={{ padding: "10px 14px", background: "rgba(255, 190, 11, 0.04)", border: "1px solid rgba(255, 190, 11, 0.08)", borderRadius: "10px" }}>
                   <AlertTriangle size={14} color="var(--warning)" style={{ marginTop: "2px", flexShrink: 0 }} />
                   <span className="text-muted" style={{ fontSize: "0.82rem", lineHeight: "1.5" }}>{w}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Improvement Plan */}
      <div className="glass-panel delay-300 animate-fade-in" style={{ padding: "32px" }}>
        <div className="flex items-center gap-2 mb-6">
          <Target size={18} color="var(--primary-start)" />
          <h3 className="heading-sm">Actionable Intelligence</h3>
        </div>
        
        <div className="flex-column gap-3">
           {analysis.improvementPlan.map((plan: string, i: number) => (
             <div key={i} className="flex items-start gap-4" style={{ padding: "16px 18px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", borderRadius: "14px" }}>
                <span style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "var(--primary-start)",
                  background: "rgba(124, 106, 255, 0.08)",
                  border: "1px solid rgba(124, 106, 255, 0.12)",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}>0{i + 1}</span>
                <p className="text-muted" style={{ fontSize: "0.85rem", lineHeight: "1.6" }}>{plan}</p>
             </div>
           ))}
        </div>
      </div>

      {/* Recommended Resources */}
      {analysis.recommendedResources && analysis.recommendedResources.length > 0 && (
        <div className="glass-panel delay-300 animate-fade-in mt-8" style={{ padding: "32px" }}>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={18} color="var(--accent)" />
            <h3 className="heading-sm">Recommended Study Material</h3>
          </div>
          
          <div className="grid grid-cols-2">
             {analysis.recommendedResources.map((resource: any, i: number) => (
               <a key={i} href={resource.url} target="_blank" rel="noopener noreferrer"
                 style={{
                   padding: "18px",
                   background: "rgba(0,0,0,0.2)",
                   border: "1px solid var(--border-color)",
                   borderRadius: "14px",
                   textDecoration: "none",
                   transition: "all 0.25s ease",
                   display: "flex",
                   flexDirection: "column",
                   gap: "8px",
                 }}
                 className="glass-card"
               >
                  <span className="text-muted" style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{resource.topic}</span>
                  <div className="flex justify-between items-center">
                    <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{resource.title}</strong>
                    <ExternalLink size={14} color="var(--text-muted)" />
                  </div>
               </a>
             ))}
          </div>
        </div>
      )}
      
      {/* Footer CTA */}
      <div className="mt-10 text-center delay-300 animate-fade-in pt-8" style={{ borderTop: "1px solid var(--border-color)" }}>
        <Link href="/" className="btn btn-primary" style={{ padding: "14px 40px" }}>
          <TrendingUp size={16} /> Finish Review
        </Link>
      </div>
    </div>
  );
}
