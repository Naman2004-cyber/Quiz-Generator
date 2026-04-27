import urllib.request
import json
import time
import urllib.error
import sys

BASE_URL = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(BASE_URL + path)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def post(path, data):
    req = urllib.request.Request(BASE_URL + path, data=json.dumps(data).encode('utf-8'), method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode()}")
        sys.exit(1)

print("--- WAIT FOR BOOT ---")
time.sleep(3)

print("--- STEP 3: Test /health ---")
health = get("/health")
print(f"Health check: {health}")
assert health["status"] == "healthy"
assert health["model_trained"] == True

print("--- STEP 4: Test /api/analyze ---")
history_payload = {
    "history": [
        {
            "id": "test_1", "topic": "React Hooks", "title": "Test 1", "score": 60,
            "totalQuestions": 10, "correctAnswers": 6, "difficulty": "Medium",
            "questionType": "Multiple Choice", "timeSpentSeconds": 150, "timestamp": 1000000,
            "concepts": ["useState"], "conceptResults": [{"concept": "useState", "correct": True}]
        },
        {
            "id": "test_2", "topic": "React Hooks", "title": "Test 2", "score": 50,
            "totalQuestions": 10, "correctAnswers": 5, "difficulty": "Hard",
            "questionType": "Multiple Choice", "timeSpentSeconds": 160, "timestamp": 2000000,
            "concepts": ["useEffect"], "conceptResults": [{"concept": "useEffect", "correct": True}]
        },
        {
            "id": "test_3", "topic": "React Hooks", "title": "Test 3", "score": 90,
            "totalQuestions": 10, "correctAnswers": 9, "difficulty": "Medium",
            "questionType": "Multiple Choice", "timeSpentSeconds": 160, "timestamp": 3000000,
            "concepts": ["useEffect"], "conceptResults": [{"concept": "useEffect", "correct": True}]
        }
    ]
}
analysis = post("/api/analyze", history_payload)
print(f"Forecast expected score: {analysis['forecast']['expected_score']}")
assert "learning_profile" in analysis

print("--- STEP 5: Test /api/train ---")
train_res = post("/api/train", {"samples": 50, "history": []})
print(f"Train response: {train_res}")

print("--- PASS ---")
