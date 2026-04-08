#!/usr/bin/env python3
"""
AI Therapy Buddy Backend Testing Script
Tests all therapy endpoints in the specified order
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"

class TherapyBuddyTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def authenticate(self):
        """Authenticate and get JWT token"""
        print("🔐 Authenticating...")
        try:
            # Login
            login_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                if self.auth_token:
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_test("Authentication", True, f"Successfully logged in as {TEST_EMAIL}")
                    return True
                else:
                    self.log_test("Authentication", False, "No access token in response")
                    return False
            else:
                self.log_test("Authentication", False, f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_get_buddies(self):
        """Test 1: GET /api/therapy/buddies - Should return 10 animal buddies"""
        print("🐾 Testing GET /api/therapy/buddies...")
        try:
            response = self.session.get(f"{BACKEND_URL}/therapy/buddies")
            
            if response.status_code == 200:
                buddies = response.json()
                if isinstance(buddies, list) and len(buddies) == 10:
                    # Check structure of first buddy
                    first_buddy = buddies[0]
                    required_fields = ["buddy_id", "name", "animal", "emoji"]
                    if all(field in first_buddy for field in required_fields):
                        buddy_names = [b["name"] for b in buddies]
                        self.log_test("GET /api/therapy/buddies", True, 
                                    f"Retrieved 10 buddies: {', '.join(buddy_names[:5])}...")
                        return True
                    else:
                        self.log_test("GET /api/therapy/buddies", False, 
                                    f"Missing required fields. Got: {list(first_buddy.keys())}")
                        return False
                else:
                    self.log_test("GET /api/therapy/buddies", False, 
                                f"Expected 10 buddies, got {len(buddies) if isinstance(buddies, list) else 'non-list'}")
                    return False
            else:
                self.log_test("GET /api/therapy/buddies", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/therapy/buddies", False, f"Error: {str(e)}")
            return False
    
    def test_get_buddy_initial(self):
        """Test 2: GET /api/therapy/buddy - Should return {"buddy_id": null} initially"""
        print("🔍 Testing GET /api/therapy/buddy (initial state)...")
        try:
            response = self.session.get(f"{BACKEND_URL}/therapy/buddy")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("buddy_id") is None:
                    self.log_test("GET /api/therapy/buddy (initial)", True, 
                                "Correctly returned null buddy_id for new user")
                    return True
                else:
                    self.log_test("GET /api/therapy/buddy (initial)", False, 
                                f"Expected buddy_id: null, got: {data.get('buddy_id')}")
                    return False
            else:
                self.log_test("GET /api/therapy/buddy (initial)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/therapy/buddy (initial)", False, f"Error: {str(e)}")
            return False
    
    def test_select_buddy(self):
        """Test 3: PUT /api/therapy/buddy - Select Luna the Cat"""
        print("🐱 Testing PUT /api/therapy/buddy...")
        try:
            buddy_data = {"buddy_id": "luna_cat"}
            response = self.session.put(f"{BACKEND_URL}/therapy/buddy", json=buddy_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("buddy_id") == "luna_cat" and 
                    data.get("buddy_name") == "Luna" and 
                    data.get("buddy_animal") == "Cat"):
                    self.log_test("PUT /api/therapy/buddy", True, 
                                f"Successfully selected Luna the Cat 🐱")
                    return True
                else:
                    self.log_test("PUT /api/therapy/buddy", False, 
                                f"Unexpected response data: {data}")
                    return False
            else:
                self.log_test("PUT /api/therapy/buddy", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("PUT /api/therapy/buddy", False, f"Error: {str(e)}")
            return False
    
    def test_therapy_chat(self):
        """Test 4: POST /api/therapy/chat - Send message to AI buddy"""
        print("💬 Testing POST /api/therapy/chat...")
        try:
            message_data = {"message": "Hi! I had a really stressful day at work today"}
            response = self.session.post(f"{BACKEND_URL}/therapy/chat", json=message_data)
            
            if response.status_code == 200:
                data = response.json()
                if "response" in data and data["response"]:
                    ai_response = data["response"]
                    self.log_test("POST /api/therapy/chat", True, 
                                f"AI responded: '{ai_response[:100]}{'...' if len(ai_response) > 100 else ''}'")
                    return True
                else:
                    self.log_test("POST /api/therapy/chat", False, 
                                f"No AI response in data: {data}")
                    return False
            else:
                self.log_test("POST /api/therapy/chat", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/therapy/chat", False, f"Error: {str(e)}")
            return False
    
    def test_get_history(self):
        """Test 5: GET /api/therapy/history - Should show user message and AI response"""
        print("📜 Testing GET /api/therapy/history...")
        try:
            response = self.session.get(f"{BACKEND_URL}/therapy/history")
            
            if response.status_code == 200:
                history = response.json()
                if isinstance(history, list) and len(history) >= 2:
                    # Should have at least user message and AI response
                    user_msg = next((msg for msg in history if msg.get("role") == "user"), None)
                    ai_msg = next((msg for msg in history if msg.get("role") == "assistant"), None)
                    
                    if user_msg and ai_msg:
                        self.log_test("GET /api/therapy/history", True, 
                                    f"Found {len(history)} messages including user and AI responses")
                        return True
                    else:
                        self.log_test("GET /api/therapy/history", False, 
                                    f"Missing user or AI messages in history: {[msg.get('role') for msg in history]}")
                        return False
                else:
                    self.log_test("GET /api/therapy/history", False, 
                                f"Expected at least 2 messages, got {len(history) if isinstance(history, list) else 'non-list'}")
                    return False
            else:
                self.log_test("GET /api/therapy/history", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/therapy/history", False, f"Error: {str(e)}")
            return False
    
    def test_mood_checkin_1(self):
        """Test 6: POST /api/therapy/mood - Log first mood check-in"""
        print("😐 Testing POST /api/therapy/mood (first check-in)...")
        try:
            mood_data = {
                "mood_score": 3,
                "mood_label": "neutral",
                "notes": "feeling ok today"
            }
            response = self.session.post(f"{BACKEND_URL}/therapy/mood", json=mood_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("mood_score") == 3 and 
                    data.get("mood_label") == "neutral" and 
                    data.get("notes") == "feeling ok today"):
                    self.log_test("POST /api/therapy/mood (first)", True, 
                                f"Logged mood: {data['mood_label']} (score: {data['mood_score']})")
                    return True
                else:
                    self.log_test("POST /api/therapy/mood (first)", False, 
                                f"Unexpected mood data: {data}")
                    return False
            else:
                self.log_test("POST /api/therapy/mood (first)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/therapy/mood (first)", False, f"Error: {str(e)}")
            return False
    
    def test_mood_checkin_2(self):
        """Test 7: POST /api/therapy/mood - Log second mood check-in"""
        print("😊 Testing POST /api/therapy/mood (second check-in)...")
        try:
            mood_data = {
                "mood_score": 4,
                "mood_label": "good",
                "notes": "talked to my buddy and feel better"
            }
            response = self.session.post(f"{BACKEND_URL}/therapy/mood", json=mood_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("mood_score") == 4 and 
                    data.get("mood_label") == "good" and 
                    data.get("notes") == "talked to my buddy and feel better"):
                    self.log_test("POST /api/therapy/mood (second)", True, 
                                f"Logged mood: {data['mood_label']} (score: {data['mood_score']})")
                    return True
                else:
                    self.log_test("POST /api/therapy/mood (second)", False, 
                                f"Unexpected mood data: {data}")
                    return False
            else:
                self.log_test("POST /api/therapy/mood (second)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/therapy/mood (second)", False, f"Error: {str(e)}")
            return False
    
    def test_get_progress(self):
        """Test 8: GET /api/therapy/progress - Should show checkins, average mood, trend"""
        print("📊 Testing GET /api/therapy/progress...")
        try:
            response = self.session.get(f"{BACKEND_URL}/therapy/progress")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["checkins", "average_mood", "total_sessions", "total_checkins", "trend"]
                
                if all(field in data for field in required_fields):
                    checkins = data["checkins"]
                    avg_mood = data["average_mood"]
                    total_checkins = data["total_checkins"]
                    trend = data["trend"]
                    
                    if total_checkins >= 2 and isinstance(checkins, list):
                        self.log_test("GET /api/therapy/progress", True, 
                                    f"Progress: {total_checkins} check-ins, avg mood: {avg_mood}, trend: {trend}")
                        return True
                    else:
                        self.log_test("GET /api/therapy/progress", False, 
                                    f"Expected at least 2 check-ins, got {total_checkins}")
                        return False
                else:
                    self.log_test("GET /api/therapy/progress", False, 
                                f"Missing required fields. Got: {list(data.keys())}")
                    return False
            else:
                self.log_test("GET /api/therapy/progress", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/therapy/progress", False, f"Error: {str(e)}")
            return False
    
    def test_clear_history(self):
        """Test 9: DELETE /api/therapy/history - Clear chat history"""
        print("🗑️ Testing DELETE /api/therapy/history...")
        try:
            response = self.session.delete(f"{BACKEND_URL}/therapy/history")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Cleared" in data["message"]:
                    # Verify history is actually cleared
                    verify_response = self.session.get(f"{BACKEND_URL}/therapy/history")
                    if verify_response.status_code == 200:
                        history = verify_response.json()
                        if isinstance(history, list) and len(history) == 0:
                            self.log_test("DELETE /api/therapy/history", True, 
                                        f"Successfully cleared chat history: {data['message']}")
                            return True
                        else:
                            self.log_test("DELETE /api/therapy/history", False, 
                                        f"History not cleared, still has {len(history)} messages")
                            return False
                    else:
                        self.log_test("DELETE /api/therapy/history", False, 
                                    f"Could not verify history clearing: {verify_response.status_code}")
                        return False
                else:
                    self.log_test("DELETE /api/therapy/history", False, 
                                f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("DELETE /api/therapy/history", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("DELETE /api/therapy/history", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all therapy buddy tests in order"""
        print("🚀 Starting AI Therapy Buddy Testing...")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run tests in order
        tests = [
            self.test_get_buddies,
            self.test_get_buddy_initial,
            self.test_select_buddy,
            self.test_therapy_chat,
            self.test_get_history,
            self.test_mood_checkin_1,
            self.test_mood_checkin_2,
            self.test_get_progress,
            self.test_clear_history
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # Summary
        print("=" * 60)
        print(f"🏁 TESTING COMPLETE: {passed}/{total} tests passed")
        
        if passed == total:
            print("✅ ALL TESTS PASSED! AI Therapy Buddy feature is fully functional.")
            return True
        else:
            print(f"❌ {total - passed} tests failed. See details above.")
            return False

def main():
    """Main function"""
    tester = TherapyBuddyTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()