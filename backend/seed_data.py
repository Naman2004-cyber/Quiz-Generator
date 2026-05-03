"""
Aura Learn — Synthetic Training Data Generator
Generates realistic student quiz performance data to supplement real user data,
ensuring ML models can train even with limited real quiz history.
"""

import random
import numpy as np
from datetime import datetime, timedelta


# Topic pools with realistic concept hierarchies
TOPICS = {
    "React Hooks": ["useState", "useEffect", "useCallback", "useMemo", "useRef", "useContext", "Custom Hooks"],
    "JavaScript ES6": ["Arrow Functions", "Destructuring", "Promises", "Async/Await", "Modules", "Template Literals", "Spread Operator"],
    "Python Basics": ["Variables", "Functions", "Lists", "Dictionaries", "OOP Basics", "File I/O", "Exception Handling"],
    "Data Structures": ["Arrays", "Linked Lists", "Trees", "Hash Tables", "Sorting Algorithms", "Graphs", "Stacks & Queues"],
    "CSS Architecture": ["Flexbox", "Grid Layout", "CSS Variables", "Specificity", "Animations", "Media Queries", "Positioning"],
    "TypeScript Generics": ["Generic Functions", "Type Constraints", "Mapped Types", "Conditional Types", "Utility Types", "Interfaces", "Enums"],
    "Node.js Fundamentals": ["Event Loop", "Streams", "File System", "HTTP Module", "Express Basics", "Middleware", "Error Handling"],
    "Next.js App Router": ["Server Components", "Route Handlers", "Middleware", "Loading UI", "Error Boundaries", "Layouts", "Metadata"],
    "Machine Learning": ["Linear Regression", "Classification", "Clustering", "Neural Networks", "Feature Engineering", "Cross Validation", "Overfitting"],
    "Database Systems": ["SQL Queries", "Joins", "Indexing", "Normalization", "Transactions", "NoSQL", "ER Diagrams"],
}

DIFFICULTIES = ["Easy", "Medium", "Hard"]
QUESTION_TYPES = ["Multiple Choice", "True/False"]


def generate_student_profile():
    """Generate a student archetype with consistent performance characteristics."""
    # Different student archetypes
    archetypes = [
        {"name": "struggling", "base_score": 30, "variance": 15, "speed": "slow", "improvement_rate": 0.02},
        {"name": "average", "base_score": 55, "variance": 15, "speed": "medium", "improvement_rate": 0.03},
        {"name": "good", "base_score": 72, "variance": 12, "speed": "medium", "improvement_rate": 0.02},
        {"name": "excellent", "base_score": 88, "variance": 8, "speed": "fast", "improvement_rate": 0.01},
        {"name": "inconsistent", "base_score": 60, "variance": 25, "speed": "medium", "improvement_rate": 0.01},
    ]
    return random.choice(archetypes)


def generate_synthetic_data(n_samples: int = 250) -> list[dict]:
    """
    Generate n_samples realistic quiz performance records.
    Each record simulates a student taking a quiz with realistic patterns:
    - Scores correlate with difficulty (harder → lower scores)
    - Time correlates with difficulty and question count
    - Strong/weak topics are consistent per student session
    - Improvement over time is modeled
    """
    records = []
    now = datetime.now()
    
    # Generate data for multiple simulated students
    n_students = max(5, n_samples // 20)
    
    for student_idx in range(n_students):
        profile = generate_student_profile()
        
        # Each student has strong and weak topics
        all_topics = list(TOPICS.keys())
        random.shuffle(all_topics)
        strong_topics = set(all_topics[:3])
        weak_topics = set(all_topics[-3:])
        
        # Number of quizzes for this student
        n_quizzes = random.randint(8, n_samples // n_students + 10)
        
        for quiz_idx in range(n_quizzes):
            if len(records) >= n_samples:
                break
            
            topic = random.choice(all_topics)
            concepts = TOPICS[topic]
            difficulty = random.choice(DIFFICULTIES)
            question_type = random.choices(QUESTION_TYPES, weights=[0.8, 0.2])[0]
            num_questions = random.choice([3, 5, 10, 15, 20])
            
            # Base score from profile
            base = profile["base_score"]
            
            # Topic modifier
            if topic in strong_topics:
                base += random.randint(8, 18)
            elif topic in weak_topics:
                base -= random.randint(10, 22)
            
            # Difficulty modifier
            difficulty_mod = {"Easy": 12, "Medium": 0, "Hard": -15}
            base += difficulty_mod[difficulty]
            
            # Improvement over time
            base += quiz_idx * profile["improvement_rate"] * 10
            
            # Add variance
            score = base + random.gauss(0, profile["variance"])
            score = max(0, min(100, round(score)))
            
            # Calculate correct answers
            correct_answers = round((score / 100) * num_questions)
            correct_answers = max(0, min(num_questions, correct_answers))
            actual_score = round((correct_answers / num_questions) * 100)
            
            # Time spent (correlates with difficulty and questions)
            base_time_per_q = {"Easy": 15, "Medium": 25, "Hard": 40}
            speed_mod = {"slow": 1.4, "medium": 1.0, "fast": 0.7}
            time_per_q = base_time_per_q[difficulty] * speed_mod[profile["speed"]]
            time_spent = int(num_questions * time_per_q * random.uniform(0.7, 1.4))
            
            # Generate concept results
            selected_concepts = random.sample(concepts, min(num_questions, len(concepts)))
            # Pad with repeated concepts if needed
            while len(selected_concepts) < num_questions:
                selected_concepts.append(random.choice(concepts))
            
            concept_results = []
            correct_count = 0
            for i, concept in enumerate(selected_concepts):
                is_correct = correct_count < correct_answers and (
                    random.random() < (actual_score / 100)
                )
                if is_correct:
                    correct_count += 1
                concept_results.append({
                    "concept": concept,
                    "correct": is_correct
                })
            
            # Timestamp (spread over last 60 days)
            days_ago = random.randint(0, 60) - (quiz_idx * 2)
            days_ago = max(0, days_ago)
            hours = random.randint(6, 23)
            timestamp = now - timedelta(days=days_ago, hours=random.randint(0, 12))
            
            record = {
                "id": f"synthetic_{student_idx}_{quiz_idx}",
                "student_id": f"synthetic_{student_idx}",
                "userId": f"synthetic_{student_idx}",
                "topic": topic,
                "title": f"{topic} Assessment",
                "score": actual_score,
                "totalQuestions": num_questions,
                "correctAnswers": correct_answers,
                "difficulty": difficulty,
                "questionType": question_type,
                "timeSpentSeconds": time_spent,
                "timestamp": int(timestamp.timestamp() * 1000),
                "concepts": selected_concepts,
                "conceptResults": concept_results,
                "hour_of_day": hours,
                "student_archetype": profile["name"],
            }
            records.append(record)
    
    # Shuffle and trim
    random.shuffle(records)
    return records[:n_samples]


def generate_for_user_context(user_history: list[dict], target_samples: int = 200) -> list[dict]:
    """
    Generate synthetic data that's contextually relevant to the user's actual quiz topics.
    Mixes synthetic data with real user data for better model training.
    """
    # Extract user's topics
    user_topics = set()
    for q in user_history:
        if q.get("topic"):
            user_topics.add(q["topic"])
    
    synthetic = generate_synthetic_data(target_samples)
    
    # If user has specific topics, bias synthetic data toward those topics
    if user_topics:
        # Replace some synthetic topics with user's topics
        for record in synthetic[:len(synthetic) // 3]:
            if record["topic"] not in user_topics:
                new_topic = random.choice(list(user_topics))
                record["topic"] = new_topic
                record["title"] = f"{new_topic} Assessment"
                if new_topic in TOPICS:
                    record["concepts"] = random.sample(
                        TOPICS[new_topic],
                        min(record["totalQuestions"], len(TOPICS[new_topic]))
                    )
    
    return synthetic


if __name__ == "__main__":
    data = generate_synthetic_data(250)
    print(f"Generated {len(data)} synthetic records")
    
    # Stats
    scores = [d["score"] for d in data]
    print(f"Score range: {min(scores)} - {max(scores)}")
    print(f"Mean score: {np.mean(scores):.1f}")
    print(f"Topics covered: {len(set(d['topic'] for d in data))}")
    print(f"Difficulties: {dict((d, sum(1 for r in data if r['difficulty'] == d)) for d in DIFFICULTIES)}")
