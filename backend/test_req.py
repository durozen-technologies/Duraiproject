import urllib.request
import urllib.error
import json

req = urllib.request.Request(
    'http://localhost:8000/api/settings/empty_bird_weight_g',
    data=json.dumps({"value": "20"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PUT'
)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
