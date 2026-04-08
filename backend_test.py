#!/usr/bin/env python3
"""
Diet Tracker & First Aid Guide Backend Testing Script
Tests all endpoints for both new features
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"

class DietAndFirstAidTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.diet_entry_ids = []  # Store entry IDs for deletion test
        
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

    # ============= DIET TRACKER TESTS =============
    
    def test_diet_log_1(self):
        """Test 1: POST /api/diet/log - Log Grilled Chicken Salad"""
        print("🥗 Testing POST /api/diet/log (Grilled Chicken Salad)...")
        try:
            diet_data = {
                "food_name": "Grilled Chicken Salad",
                "meal_type": "lunch",
                "food_category": "nutritious",
                "calories": 350,
                "protein_g": 30,
                "carbs_g": 15,
                "fat_g": 12,
                "mood_before": "tired",
                "mood_after": "energized"
            }
            response = self.session.post(f"{BACKEND_URL}/diet/log", json=diet_data)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["entry_id", "user_id", "food_name", "meal_type", "food_category", "calories"]
                if all(field in data for field in required_fields):
                    # Store entry ID for later deletion test
                    self.diet_entry_ids.append(data["entry_id"])
                    self.log_test("POST /api/diet/log (Grilled Chicken Salad)", True, 
                                f"Logged: {data['food_name']} - {data['calories']} cal, {data['protein_g']}g protein")
                    return True
                else:
                    self.log_test("POST /api/diet/log (Grilled Chicken Salad)", False, 
                                f"Missing required fields. Got: {list(data.keys())}")
                    return False
            else:
                self.log_test("POST /api/diet/log (Grilled Chicken Salad)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/diet/log (Grilled Chicken Salad)", False, f"Error: {str(e)}")
            return False
    
    def test_diet_log_2(self):
        """Test 2: POST /api/diet/log - Log Pizza"""
        print("🍕 Testing POST /api/diet/log (Pizza)...")
        try:
            diet_data = {
                "food_name": "Pizza",
                "meal_type": "dinner",
                "food_category": "comfort",
                "calories": 800,
                "protein_g": 20,
                "carbs_g": 80,
                "fat_g": 35,
                "mood_before": "anxious",
                "mood_after": "happy"
            }
            response = self.session.post(f"{BACKEND_URL}/diet/log", json=diet_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("food_name") == "Pizza" and 
                    data.get("calories") == 800 and 
                    data.get("food_category") == "comfort"):
                    # Store entry ID for later deletion test
                    self.diet_entry_ids.append(data["entry_id"])
                    self.log_test("POST /api/diet/log (Pizza)", True, 
                                f"Logged: {data['food_name']} - {data['calories']} cal, mood: {data['mood_before']} → {data['mood_after']}")
                    return True
                else:
                    self.log_test("POST /api/diet/log (Pizza)", False, 
                                f"Unexpected data: {data}")
                    return False
            else:
                self.log_test("POST /api/diet/log (Pizza)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/diet/log (Pizza)", False, f"Error: {str(e)}")
            return False
    
    def test_diet_today(self):
        """Test 3: GET /api/diet/today - Get today's diet summary"""
        print("📊 Testing GET /api/diet/today...")
        try:
            response = self.session.get(f"{BACKEND_URL}/diet/today")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["date", "logs", "summary"]
                if all(field in data for field in required_fields):
                    logs = data["logs"]
                    summary = data["summary"]
                    
                    # Should have at least 2 logs from previous tests
                    if len(logs) >= 2 and "total_calories" in summary:
                        total_cal = summary["total_calories"]
                        meal_count = summary["meal_count"]
                        self.log_test("GET /api/diet/today", True, 
                                    f"Today's summary: {meal_count} meals, {total_cal} total calories")
                        return True
                    else:
                        self.log_test("GET /api/diet/today", False, 
                                    f"Expected at least 2 logs, got {len(logs)}. Summary: {summary}")
                        return False
                else:
                    self.log_test("GET /api/diet/today", False, 
                                f"Missing required fields. Got: {list(data.keys())}")
                    return False
            else:
                self.log_test("GET /api/diet/today", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/diet/today", False, f"Error: {str(e)}")
            return False
    
    def test_diet_logs(self):
        """Test 4: GET /api/diet/logs - Get all diet logs"""
        print("📋 Testing GET /api/diet/logs...")
        try:
            response = self.session.get(f"{BACKEND_URL}/diet/logs")
            
            if response.status_code == 200:
                logs = response.json()
                if isinstance(logs, list) and len(logs) >= 2:
                    # Check that our test entries are in the logs
                    food_names = [log.get("food_name") for log in logs]
                    if "Grilled Chicken Salad" in food_names and "Pizza" in food_names:
                        self.log_test("GET /api/diet/logs", True, 
                                    f"Retrieved {len(logs)} diet logs including our test entries")
                        return True
                    else:
                        self.log_test("GET /api/diet/logs", False, 
                                    f"Test entries not found in logs. Food names: {food_names}")
                        return False
                else:
                    self.log_test("GET /api/diet/logs", False, 
                                f"Expected at least 2 logs, got {len(logs) if isinstance(logs, list) else 'non-list'}")
                    return False
            else:
                self.log_test("GET /api/diet/logs", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/diet/logs", False, f"Error: {str(e)}")
            return False
    
    def test_diet_insights(self):
        """Test 5: GET /api/diet/insights - Get diet insights"""
        print("💡 Testing GET /api/diet/insights...")
        try:
            response = self.session.get(f"{BACKEND_URL}/diet/insights")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_entries", "comfort_ratio", "nutritious_ratio", "avg_daily_calories", "insights"]
                if all(field in data for field in required_fields):
                    total_entries = data["total_entries"]
                    comfort_ratio = data["comfort_ratio"]
                    nutritious_ratio = data["nutritious_ratio"]
                    insights = data["insights"]
                    
                    if total_entries >= 2:
                        self.log_test("GET /api/diet/insights", True, 
                                    f"Insights: {total_entries} entries, {comfort_ratio}% comfort, {nutritious_ratio}% nutritious, {len(insights)} insights")
                        return True
                    else:
                        self.log_test("GET /api/diet/insights", False, 
                                    f"Expected at least 2 entries, got {total_entries}")
                        return False
                else:
                    self.log_test("GET /api/diet/insights", False, 
                                f"Missing required fields. Got: {list(data.keys())}")
                    return False
            else:
                self.log_test("GET /api/diet/insights", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/diet/insights", False, f"Error: {str(e)}")
            return False
    
    def test_diet_analyze(self):
        """Test 6: POST /api/diet/analyze - AI food analysis"""
        print("🤖 Testing POST /api/diet/analyze (AI GPT-5.2)...")
        try:
            analyze_data = {
                "food_description": "a large pepperoni pizza slice"
            }
            response = self.session.post(f"{BACKEND_URL}/diet/analyze", json=analyze_data)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["food_name", "calories", "food_category", "impact_mind", "impact_body", "impact_mood"]
                if all(field in data for field in required_fields):
                    food_name = data["food_name"]
                    calories = data["calories"]
                    category = data["food_category"]
                    impact_mind = data["impact_mind"]
                    
                    self.log_test("POST /api/diet/analyze", True, 
                                f"AI analyzed: {food_name} - {calories} cal, category: {category}, mind impact: {impact_mind[:50]}...")
                    return True
                else:
                    self.log_test("POST /api/diet/analyze", False, 
                                f"Missing required fields. Got: {list(data.keys())}")
                    return False
            else:
                self.log_test("POST /api/diet/analyze", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/diet/analyze", False, f"Error: {str(e)}")
            return False
    
    def test_diet_delete(self):
        """Test 7: DELETE /api/diet/logs/{entry_id} - Delete a diet entry"""
        print("🗑️ Testing DELETE /api/diet/logs/{entry_id}...")
        try:
            if not self.diet_entry_ids:
                self.log_test("DELETE /api/diet/logs/{entry_id}", False, "No entry IDs available for deletion test")
                return False
            
            entry_id = self.diet_entry_ids[0]  # Delete the first entry
            response = self.session.delete(f"{BACKEND_URL}/diet/logs/{entry_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "deleted" in data["message"].lower():
                    # Verify deletion by trying to get all logs and checking count
                    verify_response = self.session.get(f"{BACKEND_URL}/diet/logs")
                    if verify_response.status_code == 200:
                        logs = verify_response.json()
                        deleted_entry_found = any(log.get("entry_id") == entry_id for log in logs)
                        if not deleted_entry_found:
                            self.log_test("DELETE /api/diet/logs/{entry_id}", True, 
                                        f"Successfully deleted entry {entry_id}")
                            return True
                        else:
                            self.log_test("DELETE /api/diet/logs/{entry_id}", False, 
                                        f"Entry {entry_id} still found in logs after deletion")
                            return False
                    else:
                        self.log_test("DELETE /api/diet/logs/{entry_id}", False, 
                                    f"Could not verify deletion: {verify_response.status_code}")
                        return False
                else:
                    self.log_test("DELETE /api/diet/logs/{entry_id}", False, 
                                f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("DELETE /api/diet/logs/{entry_id}", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("DELETE /api/diet/logs/{entry_id}", False, f"Error: {str(e)}")
            return False

    # ============= FIRST AID GUIDE TESTS =============
    
    def test_firstaid_categories(self):
        """Test 8: GET /api/firstaid/categories - Should return 5 categories"""
        print("🏥 Testing GET /api/firstaid/categories...")
        try:
            response = self.session.get(f"{BACKEND_URL}/firstaid/categories")
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) == 5:
                    # Check structure of first category
                    first_cat = categories[0]
                    required_fields = ["category_id", "name", "icon", "color", "description"]
                    if all(field in first_cat for field in required_fields):
                        cat_names = [c["name"] for c in categories]
                        self.log_test("GET /api/firstaid/categories", True, 
                                    f"Retrieved 5 categories: {', '.join(cat_names)}")
                        return True
                    else:
                        self.log_test("GET /api/firstaid/categories", False, 
                                    f"Missing required fields. Got: {list(first_cat.keys())}")
                        return False
                else:
                    self.log_test("GET /api/firstaid/categories", False, 
                                f"Expected 5 categories, got {len(categories) if isinstance(categories, list) else 'non-list'}")
                    return False
            else:
                self.log_test("GET /api/firstaid/categories", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/firstaid/categories", False, f"Error: {str(e)}")
            return False
    
    def test_firstaid_guides(self):
        """Test 9: GET /api/firstaid/guides - Should return 10 guide summaries"""
        print("📚 Testing GET /api/firstaid/guides...")
        try:
            response = self.session.get(f"{BACKEND_URL}/firstaid/guides")
            
            if response.status_code == 200:
                guides = response.json()
                if isinstance(guides, list) and len(guides) == 10:
                    # Check structure of first guide
                    first_guide = guides[0]
                    required_fields = ["guide_id", "title", "severity", "image_url", "overview", "step_count"]
                    if all(field in first_guide for field in required_fields):
                        guide_titles = [g["title"] for g in guides]
                        self.log_test("GET /api/firstaid/guides", True, 
                                    f"Retrieved 10 guides: {', '.join(guide_titles[:3])}...")
                        return True
                    else:
                        self.log_test("GET /api/firstaid/guides", False, 
                                    f"Missing required fields. Got: {list(first_guide.keys())}")
                        return False
                else:
                    self.log_test("GET /api/firstaid/guides", False, 
                                f"Expected 10 guides, got {len(guides) if isinstance(guides, list) else 'non-list'}")
                    return False
            else:
                self.log_test("GET /api/firstaid/guides", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/firstaid/guides", False, f"Error: {str(e)}")
            return False
    
    def test_firstaid_guide_cpr(self):
        """Test 10: GET /api/firstaid/guides/cpr - Full CPR guide with steps"""
        print("❤️ Testing GET /api/firstaid/guides/cpr...")
        try:
            response = self.session.get(f"{BACKEND_URL}/firstaid/guides/cpr")
            
            if response.status_code == 200:
                guide = response.json()
                required_fields = ["guide_id", "title", "steps", "do_nots", "important_notes"]
                if all(field in guide for field in required_fields):
                    if (guide.get("guide_id") == "cpr" and 
                        guide.get("title") == "CPR (Cardiopulmonary Resuscitation)" and
                        isinstance(guide.get("steps"), list) and len(guide["steps"]) > 0):
                        
                        steps_count = len(guide["steps"])
                        do_nots_count = len(guide.get("do_nots", []))
                        notes_count = len(guide.get("important_notes", []))
                        
                        self.log_test("GET /api/firstaid/guides/cpr", True, 
                                    f"CPR guide: {steps_count} steps, {do_nots_count} do-nots, {notes_count} important notes")
                        return True
                    else:
                        self.log_test("GET /api/firstaid/guides/cpr", False, 
                                    f"Unexpected guide data: {guide.get('guide_id')}, {guide.get('title')}")
                        return False
                else:
                    self.log_test("GET /api/firstaid/guides/cpr", False, 
                                f"Missing required fields. Got: {list(guide.keys())}")
                    return False
            else:
                self.log_test("GET /api/firstaid/guides/cpr", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/firstaid/guides/cpr", False, f"Error: {str(e)}")
            return False
    
    def test_firstaid_guide_burns(self):
        """Test 11: GET /api/firstaid/guides/burns - Full Burns guide with steps"""
        print("🔥 Testing GET /api/firstaid/guides/burns...")
        try:
            response = self.session.get(f"{BACKEND_URL}/firstaid/guides/burns")
            
            if response.status_code == 200:
                guide = response.json()
                if (guide.get("guide_id") == "burns" and 
                    guide.get("title") == "Burns Treatment" and
                    isinstance(guide.get("steps"), list) and len(guide["steps"]) > 0):
                    
                    steps_count = len(guide["steps"])
                    severity = guide.get("severity")
                    
                    self.log_test("GET /api/firstaid/guides/burns", True, 
                                f"Burns guide: {steps_count} steps, severity: {severity}")
                    return True
                else:
                    self.log_test("GET /api/firstaid/guides/burns", False, 
                                f"Unexpected guide data: {guide.get('guide_id')}, {guide.get('title')}")
                    return False
            else:
                self.log_test("GET /api/firstaid/guides/burns", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/firstaid/guides/burns", False, f"Error: {str(e)}")
            return False
    
    def test_firstaid_search_bleeding(self):
        """Test 12: POST /api/firstaid/search - Search for 'bleeding'"""
        print("🔍 Testing POST /api/firstaid/search (bleeding)...")
        try:
            search_data = {"query": "bleeding"}
            response = self.session.post(f"{BACKEND_URL}/firstaid/search", json=search_data)
            
            if response.status_code == 200:
                results = response.json()
                if isinstance(results, list) and len(results) > 0:
                    # Should find guides related to bleeding (cuts, wounds, etc.)
                    found_relevant = False
                    for result in results:
                        title = result.get("title", "").lower()
                        if "cut" in title or "wound" in title or "bleeding" in title:
                            found_relevant = True
                            break
                    
                    if found_relevant:
                        result_titles = [r.get("title") for r in results]
                        self.log_test("POST /api/firstaid/search (bleeding)", True, 
                                    f"Found {len(results)} relevant guides: {', '.join(result_titles)}")
                        return True
                    else:
                        self.log_test("POST /api/firstaid/search (bleeding)", False, 
                                    f"No relevant guides found for 'bleeding'. Results: {[r.get('title') for r in results]}")
                        return False
                else:
                    self.log_test("POST /api/firstaid/search (bleeding)", False, 
                                f"Expected search results, got {len(results) if isinstance(results, list) else 'non-list'}")
                    return False
            else:
                self.log_test("POST /api/firstaid/search (bleeding)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/firstaid/search (bleeding)", False, f"Error: {str(e)}")
            return False
    
    def test_firstaid_search_choking(self):
        """Test 13: POST /api/firstaid/search - Search for 'choking'"""
        print("🫁 Testing POST /api/firstaid/search (choking)...")
        try:
            search_data = {"query": "choking"}
            response = self.session.post(f"{BACKEND_URL}/firstaid/search", json=search_data)
            
            if response.status_code == 200:
                results = response.json()
                if isinstance(results, list) and len(results) > 0:
                    # Should find the choking guide
                    choking_guide_found = False
                    for result in results:
                        title = result.get("title", "").lower()
                        guide_id = result.get("guide_id", "")
                        if "choking" in title or guide_id == "choking":
                            choking_guide_found = True
                            break
                    
                    if choking_guide_found:
                        self.log_test("POST /api/firstaid/search (choking)", True, 
                                    f"Found choking guide in {len(results)} results")
                        return True
                    else:
                        self.log_test("POST /api/firstaid/search (choking)", False, 
                                    f"Choking guide not found. Results: {[r.get('title') for r in results]}")
                        return False
                else:
                    self.log_test("POST /api/firstaid/search (choking)", False, 
                                f"Expected search results, got {len(results) if isinstance(results, list) else 'non-list'}")
                    return False
            else:
                self.log_test("POST /api/firstaid/search (choking)", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/firstaid/search (choking)", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all diet tracker and first aid guide tests"""
        print("🚀 Starting Diet Tracker & First Aid Guide Testing...")
        print("=" * 70)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run tests in order
        tests = [
            # Diet Tracker Tests (7 endpoints)
            self.test_diet_log_1,
            self.test_diet_log_2,
            self.test_diet_today,
            self.test_diet_logs,
            self.test_diet_insights,
            self.test_diet_analyze,
            self.test_diet_delete,
            
            # First Aid Guide Tests (6 endpoints)
            self.test_firstaid_categories,
            self.test_firstaid_guides,
            self.test_firstaid_guide_cpr,
            self.test_firstaid_guide_burns,
            self.test_firstaid_search_bleeding,
            self.test_firstaid_search_choking
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # Summary
        print("=" * 70)
        print(f"🏁 TESTING COMPLETE: {passed}/{total} tests passed")
        
        # Detailed breakdown
        diet_tests = [r for r in self.test_results if "diet" in r["test"].lower()]
        firstaid_tests = [r for r in self.test_results if "firstaid" in r["test"].lower()]
        
        diet_passed = sum(1 for t in diet_tests if t["success"])
        firstaid_passed = sum(1 for t in firstaid_tests if t["success"])
        
        print(f"📊 Diet Tracker: {diet_passed}/7 tests passed")
        print(f"🏥 First Aid Guide: {firstaid_passed}/6 tests passed")
        
        if passed == total:
            print("✅ ALL TESTS PASSED! Both Diet Tracker and First Aid Guide features are fully functional.")
            return True
        else:
            print(f"❌ {total - passed} tests failed. See details above.")
            return False

def main():
    """Main function"""
    tester = DietAndFirstAidTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()