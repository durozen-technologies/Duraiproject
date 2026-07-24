import urllib.request
import json

data = json.dumps({
    "name": "Test Party",
    "mobile": "1234567890",
    "type": "customer",
    "opening_balance": 100
}).encode('utf-8')

req = urllib.request.Request(
    "http://localhost:8000/api/parties/",
    data=data,
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.getcode())
        print(response.read().decode())
except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode())
