import requests
import time
import random

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("Testing Party Creation & DB Persistence...")
    
    # 1. Create a unique party payload
    unique_mobile = f"98765{random.randint(10000, 99999)}"
    party_payload = {
        "name": f"Test Supplier {random.randint(1, 1000)}",
        "mobile": unique_mobile,
        "type": "supplier",
        "opening_balance": 1500.50
    }
    
    print(f"\n[1] Sending POST request to add party: {party_payload['name']}")
    response = requests.post(f"{BASE_URL}/parties/", json=party_payload)
    
    if response.status_code != 200:
        print(f"FAILED to create party! Status code: {response.status_code}")
        print(f"Response: {response.text}")
        return
        
    created_party = response.json()
    party_id = created_party["id"]
    print(f"SUCCESS: Party created successfully! ID: {party_id}")
    
    # 2. Query the parties list to verify it's saved in the database
    print(f"\n[2] Fetching all suppliers from DB via GET /parties/?party_type=supplier...")
    get_response = requests.get(f"{BASE_URL}/parties/?party_type=supplier")
    
    if get_response.status_code != 200:
        print(f"FAILED to fetch parties! Status code: {get_response.status_code}")
        return
        
    parties = get_response.json()
    
    # 3. Check if our newly created party is in the list returned from the DB
    found_party = next((p for p in parties if p["id"] == party_id), None)
    
    if found_party:
        print("\nSUCCESS: Found the party in the database!")
        print("Details verified:")
        print(f" - Name: {found_party['name']} (Matches: {found_party['name'] == party_payload['name']})")
        print(f" - Mobile: {found_party['mobile']} (Matches: {found_party['mobile'] == party_payload['mobile']})")
        print(f" - Type: {found_party['type']} (Matches: {found_party['type'] == party_payload['type']})")
        print(f" - Opening Balance: {found_party['opening_balance']} (Matches: {found_party['opening_balance'] == party_payload['opening_balance']})")
        print(f" - Current Balance: {found_party['current_balance']} (Matches: {found_party['current_balance'] == party_payload['opening_balance']})")
    else:
        print("\nERROR: Party was created but could NOT be found in the database list!")

if __name__ == "__main__":
    run_test()
