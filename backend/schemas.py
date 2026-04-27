from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ConceptResult(BaseModel):
    concept: str
    correct: bool

class QuizRecord(BaseModel):
    userId: str
    id: str
    topic: str
    title: str
    score: float
    totalQuestions: int
    correctAnswers: int
    difficulty: str
    questionType: str
    timeSpentSeconds: int
    timestamp: int
    concepts: List[str]
    conceptResults: List[ConceptResult]
    hour_of_day: Optional[int] = None
    student_archetype: Optional[str] = None
    
    hintsUsed: Optional[float] = 0.0
    hintsPerQuestion: Optional[float] = 0.0
    answerChanges: Optional[int] = 0
    avgTimePerQuestionSec: Optional[float] = 0.0
    perQuestionData: Optional[List[Dict[str, Any]]] = []
    analysis: Optional[Dict[str, Any]] = None

class AnalysisRequest(BaseModel):
    history: List[QuizRecord]

class TrainRequest(BaseModel):
    samples: int = 500
    history: Optional[List[QuizRecord]] = []

class Recommendation(BaseModel):
    topic: str
    concept: str
    reason: str
    difficulty: Optional[str] = "Medium"

class ClusterInfo(BaseModel):
    cluster_id: int
    profile_name: str
    description: str
    
class AssessmentForecast(BaseModel):
    expected_score: float
    confidence: float
    difficulty_adjustments: Dict[str, float]
    explanation: str

class TrendDataPoint(BaseModel):
    date_or_index: str
    score: float
    
class TrendResponse(BaseModel):
    trends: List[TrendDataPoint]
    overall_slope: float

class ClusterExplanationResponse(BaseModel):
    cluster_id: int
    profile_name: str
    description: str
    key_characteristics: List[str]

class NextQuizResponse(BaseModel):
    recommended_topic: str
    recommended_difficulty: str
    reason: str

class AnalysisResponse(BaseModel):
    learning_profile: ClusterInfo
    concept_mastery: Dict[str, float] # topic -> mastery % (0-100)
    weak_concepts: List[str]
    strong_concepts: List[str]
    recommendations: List[Recommendation]
    forecast: AssessmentForecast
    behavioral_strengths: Optional[List[str]] = []
    behavioral_weaknesses: Optional[List[str]] = []
    suggestions: Optional[List[Dict[str, str]]] = []
