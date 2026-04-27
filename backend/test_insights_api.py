import urllib.request
import json
import traceback

req = urllib.request.Request(
    "http://127.0.0.1:3000/api/ai-insights",
    data=json.dumps({"quizHistory": [{"score": 80, "timestamp": 1729000000000, "topic": "Python", "difficulty": "Medium", "timeSpentSeconds": 100}], "stats": {"totalQuizzes": 1, "averageAccuracy": 80, "currentStreak": 1, "learningLevel": "Beginner", "totalTimeSeconds": 100}, "skillMap": {}}).encode('utf-8'),
    method='POST'
)
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as r:
        print("Success:", r.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}:")
    print(e.read().decode())
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
