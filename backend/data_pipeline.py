import pandas as pd
import numpy as np
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RAW_FILE = os.path.join(DATA_DIR, "2012-2013-data-with-predictions-4-final.csv")
PROCESSED_FILE = os.path.join(DATA_DIR, "aggregated_training_data.json")

def process_assistments_data():
    logger.info(f"Starting to process {RAW_FILE}")
    
    # We only need specific columns
    usecols = [
        "user_id", "assignment_id", "problem_id", "skill", 
        "correct", "ms_first_response", "hint_count", "start_time"
    ]
    
    # We will aggregate in chunks to avoid blowing up memory
    chunksize = 100000
    aggregated_sessions = {}
    
    chunks_processed = 0
    max_chunks = 10 # We'll process just 1M rows for speed (this is plenty for ML)
    
    try:
        for chunk in pd.read_csv(RAW_FILE, chunksize=chunksize, usecols=usecols, encoding='ISO-8859-1', low_memory=False):
            # Clean data
            chunk['correct'] = pd.to_numeric(chunk['correct'], errors='coerce')
            chunk['ms_first_response'] = pd.to_numeric(chunk['ms_first_response'], errors='coerce')
            chunk['hint_count'] = pd.to_numeric(chunk['hint_count'], errors='coerce')
            
            # Drop rows with critical NaNs
            chunk = chunk.dropna(subset=['user_id', 'assignment_id', 'correct'])
            
            # Group by user and assignment (this represents one 'quiz session')
            for (user_id, assignment_id), group in chunk.groupby(['user_id', 'assignment_id']):
                session_id = f"{user_id}_{assignment_id}"
                
                # Get first start time
                timestamp = group['start_time'].iloc[0]
                
                # If we've seen this session before (spanned across chunks), we could append.
                # For simplicity, since we process ordered chunks, we'll just build it up.
                if session_id not in aggregated_sessions:
                    aggregated_sessions[session_id] = {
                        "id": session_id,
                        "student_id": str(int(user_id)),
                        "timestamp": timestamp,
                        "totalQuestions": 0,
                        "correctAnswers": 0,
                        "totalTimeMs": 0,
                        "totalHints": 0,
                        "concepts": [],
                        "conceptResults": []
                    }
                
                s = aggregated_sessions[session_id]
                s["totalQuestions"] += len(group)
                s["correctAnswers"] += int(group['correct'].sum())
                s["totalTimeMs"] += float(group['ms_first_response'].sum(skipna=True))
                s["totalHints"] += int(group['hint_count'].sum(skipna=True))
                
                for _, row in group.iterrows():
                    concept = str(row['skill']) if pd.notna(row['skill']) else "General"
                    s["concepts"].append(concept)
                    s["conceptResults"].append({
                        "concept": concept,
                        "correct": float(row['correct']) > 0
                    })
            
            chunks_processed += 1
            logger.info(f"Processed chunk {chunks_processed}/{max_chunks}")
            if chunks_processed >= max_chunks:
                break
                
    except Exception as e:
        logger.error(f"Error during processing: {e}")
        
    logger.info(f"Finished parsing. Found {len(aggregated_sessions)} unique quiz sessions.")
    
    # Filter out trivial sessions (e.g. just 1 question) to ensure quality training data
    final_records = []
    for session_id, data in aggregated_sessions.items():
        if data["totalQuestions"] >= 3: # Min 3 questions per quiz
            # Calculate final metrics
            score = (data["correctAnswers"] / data["totalQuestions"]) * 100
            time_per_q = (data["totalTimeMs"] / 1000) / data["totalQuestions"]
            
            # Map into the format expected by ml_models.py
            # Get the most common concept as the overall topic
            concept_counts = pd.Series(data["concepts"]).value_counts()
            main_topic = concept_counts.index[0] if len(concept_counts) > 0 else "General"
            
            # Assign difficulty based on score and hints
            diff = "Medium"
            if score >= 80 and data["totalHints"] == 0:
                diff = "Easy" # To them it was easy
            elif score <= 50 or data["totalHints"] >= data["totalQuestions"]:
                diff = "Hard"
                
            record = {
                "id": data["id"],
                "student_id": data["student_id"],
                "timestamp": data["timestamp"],
                "score": score,
                "totalQuestions": data["totalQuestions"],
                "correctAnswers": data["correctAnswers"],
                "topic": main_topic,
                "difficulty": diff,
                "timeSpentSeconds": int(data["totalTimeMs"] / 1000),
                "questionType": "Multiple Choice", # Assumption for standardizing
                "concepts": data["concepts"],
                "conceptResults": data["conceptResults"],
                "hintsUsed": data["totalHints"],
                "hintsPerQuestion": data["totalHints"] / data["totalQuestions"],
                "answerChanges": 0, # Data not explicitly clear, default 0
                "avgTimePerQuestionSec": time_per_q
            }
            final_records.append(record)
            
    logger.info(f"Filtered down to {len(final_records)} quality training sessions.")
    
    # Save to JSON
    with open(PROCESSED_FILE, 'w') as f:
        json.dump(final_records, f)
        
    logger.info(f"Saved aggregated training data to {PROCESSED_FILE}")

if __name__ == "__main__":
    process_assistments_data()
