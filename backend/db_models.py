from sqlalchemy import Column, Integer, String, Float, JSON, BigInteger
from database import Base

class QuizResultDB(Base):
    __tablename__ = "quiz_results"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, default="current_user")
    topic = Column(String)
    title = Column(String)
    score = Column(Float)
    total_questions = Column(Integer)
    correct_answers = Column(Integer)
    difficulty = Column(String)
    question_type = Column(String)
    time_spent_seconds = Column(Integer)
    timestamp = Column(BigInteger)
    concepts = Column(JSON)
    concept_results = Column(JSON)
    analysis = Column(JSON, nullable=True)
    
    # Behavioral tracking fields
    hints_used = Column(Float, default=0.0)
    hints_per_question = Column(Float, default=0.0)
    answer_changes = Column(Integer, default=0)
    avg_time_per_question_sec = Column(Float, default=0.0)
    per_question_data = Column(JSON, nullable=True)
