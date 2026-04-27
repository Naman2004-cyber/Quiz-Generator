import urllib.request
import json
import traceback

req = urllib.request.Request(
    "http://127.0.0.1:3000/api/generate-quiz",
    data=json.dumps({"topic": "Python", "numQuestions": 3}).encode('utf-8'),
    method='POST'
)
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as r:
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}:")
    print(e.read().decode())
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
