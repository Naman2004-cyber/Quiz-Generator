import random
from threading import Lock
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
import numpy as np

from typing import List
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from db_models import QuizResultDB

from schemas import (
    AnalysisRequest, AnalysisResponse, TrainRequest, 
    TrendResponse, ClusterExplanationResponse, NextQuizResponse, TrendDataPoint, QuizRecord
)
from ml_models import analyzer_instance, logger
from seed_data import generate_synthetic_data, generate_for_user_context
import json
import os

model_lock = Lock()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create Database Tables
    Base.metadata.create_all(bind=engine)
    logger.info("Starting up ML Backend. Checking models...")
    # Model persistence handles loading models intrinsically in the __init__ of analyzer_instance
    if not analyzer_instance.is_trained:
        logger.info("No prior model versions found (is_trained=False). Training baseline...")
        data_path = os.path.join(os.path.dirname(__file__), "data", "aggregated_training_data.json")
        try:
            with open(data_path, 'r') as f:
                baseline_data = json.load(f)
            with model_lock:
                analyzer_instance.train(baseline_data)
            logger.info("Baseline training successful.")
        except Exception as e:
            logger.error(f"Failed to load real dataset: {e}")
    else:
        logger.info(f"Loaded Persistent Model Version {analyzer_instance.version}.")
    yield
    logger.info("Shutting down ML Engine.")

app = FastAPI(title="Aura Learn ML Backend", description="Production ML Pipeline for Aura Learn", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "model_trained": analyzer_instance.is_trained,
        "version": analyzer_instance.version,
        "current_rmse": round(analyzer_instance.current_rmse, 3) if analyzer_instance.current_rmse != float('inf') else None
    }

@app.post("/api/quizzes", response_model=QuizRecord)
def save_quiz_result(quiz: QuizRecord, db: Session = Depends(get_db)):
    db_quiz = QuizResultDB(
        id=quiz.id,
        topic=quiz.topic,
        title=quiz.title,
        score=quiz.score,
        total_questions=quiz.totalQuestions,
        correct_answers=quiz.correctAnswers,
        difficulty=quiz.difficulty,
        question_type=quiz.questionType,
        time_spent_seconds=quiz.timeSpentSeconds,
        timestamp=quiz.timestamp,
        concepts=quiz.concepts,
        concept_results=[c.model_dump() for c in quiz.conceptResults],
        analysis=quiz.analysis,
        hints_used=quiz.hintsUsed,
        hints_per_question=quiz.hintsPerQuestion,
        answer_changes=quiz.answerChanges,
        avg_time_per_question_sec=quiz.avgTimePerQuestionSec,
        per_question_data=quiz.perQuestionData
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return quiz

@app.get("/api/history", response_model=List[QuizRecord])
def get_quiz_history(db: Session = Depends(get_db)):
    db_quizzes = db.query(QuizResultDB).order_by(QuizResultDB.timestamp.desc()).all()
    results = []
    for q in db_quizzes:
        results.append(QuizRecord(
            id=q.id,
            topic=q.topic,
            title=q.title,
            score=q.score,
            totalQuestions=q.total_questions,
            correctAnswers=q.correct_answers,
            difficulty=q.difficulty,
            questionType=q.question_type,
            timeSpentSeconds=q.time_spent_seconds,
            timestamp=q.timestamp,
            concepts=q.concepts,
            conceptResults=q.concept_results,
            analysis=q.analysis,
            hintsUsed=q.hints_used,
            hintsPerQuestion=q.hints_per_question,
            answerChanges=q.answer_changes,
            avgTimePerQuestionSec=q.avg_time_per_question_sec,
            perQuestionData=q.per_question_data
        ))
    return results

@app.post("/api/train")
def train_models(request: TrainRequest, background_tasks: BackgroundTasks):
    def training_task():
        # Blending logic depending on user history context
        history_dicts = [h.model_dump() for h in request.history] if request.history else []
        n_history = len(history_dicts)
        
        if n_history == 0:
            logger.info("Stateless synthetic generation requested.")
            training_data = generate_synthetic_data(request.samples)
        else:
            logger.info(f"Contextual training enabled. History length: {n_history}.")
            synthetic_samples = generate_for_user_context(history_dicts, target_samples=request.samples)
            if n_history < 20: # 70% synthetic / 30% real logic
                syn_count = int(request.samples * 0.7)
                real_count = int(request.samples * 0.3)
            else:              # 30% synthetic / 70% real logic
                syn_count = int(request.samples * 0.3)
                real_count = int(request.samples * 0.7)
                
            syn_subset = synthetic_samples[:syn_count]
            # duplicate/sample real history to meet quota securely
            real_subset = random.choices(history_dicts, k=real_count) if history_dicts else []
            training_data = syn_subset + real_subset
            random.shuffle(training_data)
            
        # Load the global baseline dataset to prevent catastrophic forgetting (Data Rehearsal)
        try:
            data_path = os.path.join(os.path.dirname(__file__), "data", "aggregated_training_data.json")
            with open(data_path, 'r') as f:
                global_baseline_data = json.load(f)
            
            combined_training_data = training_data + global_baseline_data
            random.shuffle(combined_training_data)
        except Exception as e:
            logger.error(f"Failed to load global baseline data for rehearsal: {e}")
            combined_training_data = training_data
            
        logger.info(f"Training initiated on {len(combined_training_data)} payload entries (Data Rehearsal Enabled).")
        with model_lock:
            analyzer_instance.train(combined_training_data)
        
    background_tasks.add_task(training_task)
    return {"message": "Contextual model training started in background.", "target_samples": request.samples}

@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze_user_performance(request: AnalysisRequest):
    if not request.history:
         raise HTTPException(status_code=400, detail="History array cannot be empty")
    try:
        dict_hist = [h.model_dump() for h in request.history]
        analysis_result = analyzer_instance.analyze_student(dict_hist)
        return analysis_result
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal analysis exception")

@app.post("/api/trend", response_model=TrendResponse)
def get_user_trend(request: AnalysisRequest):
    if not request.history or len(request.history) < 2:
        return {"trends": [], "overall_slope": 0.0}
        
    df = pd.DataFrame([h.model_dump() for h in request.history])
    if 'timestamp' in df.columns:
        df = df.sort_values('timestamp')
        
    points = []
    for idx, row in df.iterrows():
        points.append(TrendDataPoint(date_or_index=str(row.get('timestamp', idx)), score=float(row['score'])))
        
    # Calculate simple slope via numpy polyfit
    x = np.arange(len(df))
    y = df['score'].values
    slope, intercept = np.polyfit(x, y, 1) if len(x) > 1 else (0,0)
    
    return {"trends": points, "overall_slope": round(float(slope), 2)}

@app.post("/api/explain-cluster", response_model=ClusterExplanationResponse)
def get_cluster_explanation(request: AnalysisRequest):
    if not request.history:
        return {
            "cluster_id": -1, "profile_name": "New User", "description": "Insufficient history.",
            "key_characteristics": ["Not enough data points collected to analyze trends."]
        }
        
    dict_hist = [h.model_dump() for h in request.history]
    analysis = analyzer_instance.analyze_student(dict_hist)
    profile = analysis["learning_profile"]
    
    df = pd.DataFrame(dict_hist)
    df = analyzer_instance._build_features(df, mode="predict")
    
    score_mean = df['score'].mean()
    acc_mean = df['accuracy'].mean() * 100
    score_std = df['score'].tail(5).std() if len(df) >= 2 else 0
    score_std = 0 if pd.isna(score_std) else score_std
    trend_mean = df['improvement_trend'].mean()
    
    var_str = "high" if score_std > 12 else "stable"
    trend_str = "rapid" if trend_mean > 5 else "slow" if trend_mean < 0 else "steady"
    
    explanation = f"You are in this cluster because your average score is {score_mean:.1f}% (Accuracy: {acc_mean:.1f}%) with {var_str} variance and {trend_str} improvement."
    
    return {
        "cluster_id": profile["cluster_id"],
        "profile_name": profile["profile_name"],
        "description": profile["description"],
        "key_characteristics": [
            explanation,
            f"Average Score: {score_mean:.1f}%",
            f"Recent Variance (StdDev): {score_std:.1f}",
            f"Improvement Trend Metric: {trend_mean:.1f}"
        ]
    }

@app.post("/api/next-quiz", response_model=NextQuizResponse)
def get_next_quiz_recommendation(request: AnalysisRequest):
    if not request.history:
        return {
            "recommended_topic": "General Review",
            "recommended_difficulty": "Medium",
            "reason": "Complete a few quizzes to receive personalized recommendations."
        }
        
    dict_hist = [h.model_dump() for h in request.history]
    analysis = analyzer_instance.analyze_student(dict_hist)
    
    profile_name = analysis.get("learning_profile", {}).get("profile_name", "Measured Learners")
    
    if analysis.get("recommendations") and len(analysis["recommendations"]) > 0:
        rec = analysis["recommendations"][0]
        return {
            "recommended_topic": rec["concept"],
            "recommended_difficulty": rec.get("difficulty", "Medium"),
            "reason": rec["reason"]
        }
    
    # Find most frequent topic if no weak concepts
    df = pd.DataFrame(dict_hist)
    most_frequent = df['topic'].mode()[0] if not df.empty and 'topic' in df.columns else "General Review"
    
    # Compute difficulty from average score
    avg_score = float(df['score'].mean()) if not df.empty and 'score' in df.columns else 50
    rec_diff = "Hard" if avg_score >= 80 else "Medium" if avg_score >= 50 else "Easy"
    
    return {
        "recommended_topic": most_frequent,
        "recommended_difficulty": rec_diff,
        "reason": f"Based on your solid performance profile ({profile_name}), a {rec_diff} quiz is recommended."
    }

class ZPDRequest(BaseModel):
    history: List[QuizRecord]
    topic: str

@app.post("/api/zpd-simulate")
def zpd_simulate(request: ZPDRequest):
    if not request.history:
        raise HTTPException(status_code=400, detail="History array cannot be empty")
    try:
        dict_hist = [h.model_dump() for h in request.history]
        result = analyzer_instance.zpd_simulate(dict_hist, request.topic)
        return result
    except Exception as e:
        logger.error(f"ZPD Simulation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="ZPD Simulation failed")

# ══════════════════════════════════════════════════════════════
# DEEP ANALYTICS ENDPOINTS — Tier 2
# ══════════════════════════════════════════════════════════════

@app.post("/api/deep-profile")
def get_deep_profile(request: AnalysisRequest):
    """Returns 12 engineered behavioral features computed from quiz history."""
    if not request.history:
        raise HTTPException(status_code=400, detail="History required")
    try:
        dict_hist = [h.model_dump() for h in request.history]
        return analyzer_instance.compute_deep_profile(dict_hist)
    except Exception as e:
        logger.error(f"Deep profile error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Deep profile computation failed")

@app.post("/api/topic-matrix")
def get_topic_matrix(request: AnalysisRequest):
    """Returns per-topic intelligence: mastery, velocity, consistency."""
    if not request.history:
        raise HTTPException(status_code=400, detail="History required")
    try:
        dict_hist = [h.model_dump() for h in request.history]
        return analyzer_instance.compute_topic_matrix(dict_hist)
    except Exception as e:
        logger.error(f"Topic matrix error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Topic matrix computation failed")

@app.post("/api/learning-rhythm")
def get_learning_rhythm(request: AnalysisRequest):
    """Returns temporal analytics: hour-of-day performance, daily patterns."""
    if not request.history:
        raise HTTPException(status_code=400, detail="History required")
    try:
        dict_hist = [h.model_dump() for h in request.history]
        return analyzer_instance.compute_learning_rhythm(dict_hist)
    except Exception as e:
        logger.error(f"Learning rhythm error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Learning rhythm computation failed")

@app.post("/api/comparative-stats")
def get_comparative_stats(request: AnalysisRequest):
    """Returns how this student compares to their cluster peers."""
    if not request.history:
        raise HTTPException(status_code=400, detail="History required")
    try:
        dict_hist = [h.model_dump() for h in request.history]
        return analyzer_instance.compute_comparative_stats(dict_hist)
    except Exception as e:
        logger.error(f"Comparative stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Comparative stats failed")

@app.get("/api/feature-importance")
def get_feature_importance():
    """Returns explained feature importances from both RF and GB models."""
    try:
        return analyzer_instance.get_feature_importance_details()
    except Exception as e:
        logger.error(f"Feature importance error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Feature importance failed")

@app.post("/api/progress-forecast")
def get_progress_forecast(request: AnalysisRequest):
    """Returns multi-week forward score projections."""
    if not request.history or len(request.history) < 3:
        return {"projections": [], "projected_mastery_date": None, "trend_direction": "neutral"}
    try:
        dict_hist = [h.model_dump() for h in request.history]
        return analyzer_instance.compute_progress_forecast(dict_hist)
    except Exception as e:
        logger.error(f"Progress forecast error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Progress forecast failed")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
