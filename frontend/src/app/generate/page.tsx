"use client";

import { useState, useEffect } from "react";
import { Zap, BrainCircuit, Activity, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { getQuizHistory, setCurrentQuiz } from "@/lib/storage";
import { BACKEND_URL } from "@/lib/config";

const GENERATION_STEPS = [
  "Initializing learning matrix...",
  "Scanning optimal conceptual trees...",
  "Formulating targeted logic questions...",
  "Calibrating cognitive difficulty...",
  "Finalizing assessment schema..."
];

export default function GenerateQuiz() {
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState("Multiple Choice");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Fetch ML recommendation
  const [recommendation, setRecommendation] = useState<any>(null);
  
  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const history = getQuizHistory();
        if (history.length > 0) {
          const res = await fetch(`${BACKEND_URL}/api/next-quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history: history })
          });
          
          if (res.ok) {
            const data = await res.json();
            setRecommendation(data);
            if (data.recommended_topic) setTopic(data.recommended_topic);
            if (data.recommended_difficulty) setDifficulty(data.recommended_difficulty);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch ML recommendation", err);
      }
    };
    fetchRecommendation();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content && !topic) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, content, numQuestions, questionType, difficulty })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate quiz");
      }

      const data = await res.json();
      setCurrentQuiz(data.quiz);
      router.push("/quiz");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to generate quiz. The AI model might be experiencing high demand.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 0" }}>
      {isLoading ? (
        <div className="loading-container animate-fade-in">
          <div className="loading-rings">
            <div className="loading-ring-outer" />
            <div className="loading-ring-inner" />
            <BrainCircuit size={28} color="var(--primary)" className="animate-pulse" />
          </div>
          <h2 className="heading-md mb-3" style={{ fontSize: "1.25rem" }}>Generating Assessment</h2>
          <div className="loading-step">
            <Activity size={14} color="var(--accent)" className="animate-pulse" />
            {GENERATION_STEPS[loadingStep]}
          </div>
        </div>
      ) : (
      <>
        <header className="mb-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="stat-icon stat-icon-purple" style={{ width: "56px", height: "56px", borderRadius: "16px" }}>
              <Sparkles size={24} color="var(--primary)" />
            </div>
          </div>
          <h1 className="heading-lg mb-3">Skill Generator</h1>
          <p className="text-muted" style={{ fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto" }}>Provide a topic or documentation, and the AI will construct a personalized assessment.</p>
        </header>

        {/* ML Recommendation Banner */}
        {recommendation && (
          <div className="glass-panel animate-fade-in mb-6" style={{ padding: "20px", borderLeft: "4px solid var(--accent)", background: "rgba(108, 99, 255, 0.05)" }}>
             <div className="flex items-start gap-3">
                <BrainCircuit size={20} color="var(--accent)" style={{ marginTop: "2px" }} />
                <div>
                   <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                      Smart Recommendation: {recommendation.recommended_topic} ({recommendation.recommended_difficulty})
                   </h3>
                   <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {recommendation.reason}
                   </p>
                </div>
             </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="glass-panel delay-100 animate-fade-in flex-column gap-6" style={{ padding: "36px" }}>

        <div>
          <label className="heading-sm mb-2" style={{ display: "block", fontSize: "0.85rem", marginBottom: "10px" }}>Topic</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Server Components, Python Decorators..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="heading-sm mb-2" style={{ display: "block", fontSize: "0.85rem", marginBottom: "10px" }}>Difficulty</label>
            <select
              className="input-field"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="heading-sm mb-2" style={{ display: "block", fontSize: "0.85rem", marginBottom: "10px" }}>Question Count</label>
            <select
              className="input-field"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={30}>30 Questions</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="heading-sm mb-2" style={{ display: "block", fontSize: "0.85rem", marginBottom: "10px" }}>Format</label>
            <select
              className="input-field"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
            >
              <option value="Multiple Choice">Multiple Choice</option>
              <option value="True/False">True / False</option>
            </select>
          </div>
        </div>

        <div>
           <div className="flex items-center justify-between mb-2">
             <label className="heading-sm" style={{ fontSize: "0.85rem" }}>Context <span className="text-muted" style={{ fontWeight: 400, fontSize: "0.75rem" }}>(Optional)</span></label>
           </div>
          <textarea
            className="input-field"
            placeholder="Paste your notes or documentation here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

          <button
            type="submit"
            className="btn btn-primary btn-block mt-4"
            disabled={!topic && !content}
            style={{ padding: "16px" }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><Zap size={16} /> Generate Quiz</span>
          </button>
        </form>
      </>
      )}
    </div>
  );
}
