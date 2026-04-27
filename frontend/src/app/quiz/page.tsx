"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2, BookOpen, Lightbulb, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCurrentQuiz, setQuizResults } from "@/lib/storage";

interface QuestionBehavior {
  timeSpentMs: number;
  hintsUsed: number;
  answerChanges: number;
}

export default function QuizInterface() {
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const router = useRouter();

  // ── Behavioral tracking state ──
  const [questionBehaviors, setQuestionBehaviors] = useState<Record<number, QuestionBehavior>>({});
  const [hintsRevealed, setHintsRevealed] = useState<Record<number, number>>({}); // questionIdx → count of hints shown
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const quizStartTimeRef = useRef<number>(Date.now());

  // Load quiz
  useEffect(() => {
    setTimeout(() => {
      const parsed = getCurrentQuiz();
      if (parsed) {
        setQuiz(parsed);
        quizStartTimeRef.current = Date.now();
        setQuestionStartTime(Date.now());
      }
    }, 0);
  }, []);

  // ── Per-question live timer ──
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [questionStartTime]);

  // ── Save time when leaving a question ──
  const saveCurrentQuestionTime = useCallback(() => {
    const timeSpent = Date.now() - questionStartTime;
    setQuestionBehaviors((prev) => ({
      ...prev,
      [currentQuestionIndex]: {
        ...(prev[currentQuestionIndex] || { timeSpentMs: 0, hintsUsed: 0, answerChanges: 0 }),
        timeSpentMs: (prev[currentQuestionIndex]?.timeSpentMs || 0) + timeSpent,
      },
    }));
  }, [questionStartTime, currentQuestionIndex]);

  if (!quiz) return (
    <div className="loading-container animate-fade-in">
      <div className="loading-rings">
        <div className="loading-ring-outer" />
        <div className="loading-ring-inner" />
        <BookOpen size={24} color="var(--primary)" />
      </div>
      <p className="text-muted">Loading environment...</p>
    </div>
  );

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const currentHintsRevealed = hintsRevealed[currentQuestionIndex] || 0;
  const hints = currentQuestion.hints || [];
  const maxHints = hints.length;

  const handleSelectOption = (index: number) => {
    const prevAnswer = selectedAnswers[currentQuestionIndex];
    
    // Track answer changes (only if they HAD a previous different answer)
    if (prevAnswer !== undefined && prevAnswer !== index) {
      setQuestionBehaviors((prev) => ({
        ...prev,
        [currentQuestionIndex]: {
          ...(prev[currentQuestionIndex] || { timeSpentMs: 0, hintsUsed: 0, answerChanges: 0 }),
          answerChanges: (prev[currentQuestionIndex]?.answerChanges || 0) + 1,
        },
      }));
    }
    setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: index });
  };

  const handleShowHint = () => {
    if (currentHintsRevealed < maxHints) {
      const newCount = currentHintsRevealed + 1;
      setHintsRevealed((prev) => ({ ...prev, [currentQuestionIndex]: newCount }));
      
      // Track hint usage in behaviors
      setQuestionBehaviors((prev) => ({
        ...prev,
        [currentQuestionIndex]: {
          ...(prev[currentQuestionIndex] || { timeSpentMs: 0, hintsUsed: 0, answerChanges: 0 }),
          hintsUsed: newCount,
        },
      }));
    }
  };

  const handleNext = () => {
    saveCurrentQuestionTime();
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
      setElapsedSeconds(0);
    } else {
      setIsFinished(true);
      
      // Build final behavioral data
      const finalTimeSpent = Date.now() - questionStartTime;
      const finalBehaviors = { ...questionBehaviors };
      finalBehaviors[currentQuestionIndex] = {
        ...(finalBehaviors[currentQuestionIndex] || { timeSpentMs: 0, hintsUsed: 0, answerChanges: 0 }),
        timeSpentMs: (finalBehaviors[currentQuestionIndex]?.timeSpentMs || 0) + finalTimeSpent,
      };

      const totalTimeMs = Object.values(finalBehaviors).reduce((sum, b) => sum + b.timeSpentMs, 0);

      setQuizResults({
        quiz: {
          ...quiz,
          timeSpentSeconds: Math.round(totalTimeMs / 1000),
        },
        answers: selectedAnswers,
        questionBehaviors: finalBehaviors,
        hintsRevealed,
        totalTimeMs,
      });
      router.push("/results");
    }
  };

  const handlePrev = () => {
    saveCurrentQuestionTime();
    setCurrentQuestionIndex((prev) => prev - 1);
    setQuestionStartTime(Date.now());
    setElapsedSeconds(0);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 0" }}>
      {/* Header */}
      <header className="mb-10">
        <h1 className="heading-md mb-4">{quiz.title}</h1>
        <div className="flex justify-between items-center text-muted mb-3" style={{ fontSize: "0.8rem" }}>
          <span style={{ fontWeight: 600 }}>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Live Timer */}
            <span style={{
              display: "flex", alignItems: "center", gap: "6px",
              color: elapsedSeconds > 60 ? "var(--warning)" : "var(--accent)",
              fontWeight: 600, fontVariantNumeric: "tabular-nums",
            }}>
              <Clock size={13} />
              {formatTimer(elapsedSeconds)}
            </span>
            <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>{Math.round(progress)}% Complete</span>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: progress + "%" }} />
        </div>
      </header>

      {/* Question Card */}
      <div className="glass-panel delay-100 animate-fade-in" style={{ padding: "36px" }}>
        <h2 className="heading-sm mb-8" style={{ fontSize: "1.05rem", lineHeight: "1.7", fontWeight: 500 }}>{currentQuestion.question}</h2>

        <div className="flex-column gap-3">
          {currentQuestion.options.map((option: string, i: number) => {
            const isSelected = selectedAnswers[currentQuestionIndex] === i;
            return (
              <button
                key={i}
                onClick={() => handleSelectOption(i)}
                className={`quiz-option ${isSelected ? 'selected' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: isSelected ? "rgba(124, 106, 255, 0.15)" : "rgba(255,255,255,0.04)",
                      border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                      color: isSelected ? "var(--primary)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{option}</span>
                  </div>
                  {isSelected && <CheckCircle2 color="var(--primary)" size={18} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Hint Section ── */}
        {hints.length > 0 && (
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
            {/* Revealed hints */}
            {currentHintsRevealed > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                {hints.slice(0, currentHintsRevealed).map((hint: string, i: number) => (
                  <div
                    key={i}
                    className="animate-fade-in"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "12px 16px",
                      background: i === 0
                        ? "rgba(255, 190, 11, 0.06)"
                        : "rgba(255, 120, 50, 0.06)",
                      border: i === 0
                        ? "1px solid rgba(255, 190, 11, 0.15)"
                        : "1px solid rgba(255, 120, 50, 0.15)",
                      borderRadius: "10px",
                    }}
                  >
                    <Lightbulb
                      size={15}
                      color={i === 0 ? "#ffbe0b" : "#ff7832"}
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ color: i === 0 ? "#ffbe0b" : "#ff7832", marginRight: "6px" }}>
                        Hint {i + 1}:
                      </strong>
                      {hint}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Show hint button */}
            {currentHintsRevealed < maxHints && (
              <button
                onClick={handleShowHint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  background: "rgba(255, 190, 11, 0.08)",
                  border: "1px solid rgba(255, 190, 11, 0.18)",
                  borderRadius: "10px",
                  color: "#ffbe0b",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255, 190, 11, 0.14)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 190, 11, 0.08)";
                }}
              >
                <Lightbulb size={15} />
                {currentHintsRevealed === 0
                  ? `Show Hint (${maxHints} available)`
                  : `Show Another Hint (${maxHints - currentHintsRevealed} left)`
                }
              </button>
            )}

            {currentHintsRevealed >= maxHints && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                All hints used for this question
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex justify-between items-center pt-6" style={{ borderTop: "1px solid var(--border-color)" }}>
           <button
             className="btn btn-ghost"
             disabled={currentQuestionIndex === 0}
             onClick={handlePrev}
           >
             <ArrowLeft size={16} /> Previous
           </button>

           <button
             className="btn btn-primary"
             disabled={selectedAnswers[currentQuestionIndex] === undefined}
             onClick={handleNext}
           >
             {currentQuestionIndex === quiz.questions.length - 1 ? (
               <span>{isFinished ? "Analyzing..." : "Submit & Analyze"}</span>
             ) : (
               <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>Next <ArrowRight size={16} /></span>
             )}
           </button>
        </div>
      </div>

      {/* ── Bottom behavioral stats (subtle) ── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "24px",
        marginTop: "20px",
        fontSize: "0.7rem",
        color: "var(--text-dim)",
      }}>
        <span>Hints: {currentHintsRevealed}/{maxHints}</span>
        <span>Changes: {questionBehaviors[currentQuestionIndex]?.answerChanges || 0}</span>
      </div>
    </div>
  );
}
