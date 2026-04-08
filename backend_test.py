#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for ADHD Companion App
Tests all endpoints with proper authentication flow
"""

import requests
import json
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"
TEST_NAME = "Test User"

class ADHDAppTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
        # Test data storage for cleanup
        self.created_items = {
            'tasks': [],
            'habits': [],
            'medications': [],
            'focus_sessions': [],
            'expenses': [],
            'events': [],
            'birthdays': [],
            'routines': []
        }
    
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        print(f"{status}: {test_name}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None, 
                    auth_required: bool = True) -> requests.Response:
        """Make HTTP request with optional authentication"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_auth_register(self):
        """Test user registration"""
        try:
            # First try to register
            data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            }
            
            response = self.make_request("POST", "/auth/register", data, auth_required=False)
            
            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                if "token" in result and "user" in result:
                    self.auth_token = result["token"]
                    self.user_id = result["user"]["user_id"]
                    self.log_result("Auth Register", True, "User registered successfully")
                    return True
                else:
                    self.log_result("Auth Register", False, "Missing token or user in response")
                    return False
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try login instead
                self.log_result("Auth Register", True, "User already exists (expected)")
                return self.test_auth_login()
            else:
                self.log_result("Auth Register", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Register", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_login(self):
        """Test user login"""
        try:
            data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = self.make_request("POST", "/auth/login", data, auth_required=False)
            
            if response.status_code == 200:
                result = response.json()
                if "token" in result and "user" in result:
                    self.auth_token = result["token"]
                    self.user_id = result["user"]["user_id"]
                    self.log_result("Auth Login", True, "Login successful")
                    return True
                else:
                    self.log_result("Auth Login", False, "Missing token or user in response")
                    return False
            else:
                self.log_result("Auth Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Login", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_me(self):
        """Test get current user info"""
        try:
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                result = response.json()
                if "user_id" in result and "email" in result:
                    self.log_result("Auth Me", True, "User info retrieved successfully")
                    return True
                else:
                    self.log_result("Auth Me", False, "Missing user fields in response")
                    return False
            else:
                self.log_result("Auth Me", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Auth Me", False, f"Exception: {str(e)}")
            return False
    
    def test_tasks_crud(self):
        """Test task CRUD operations"""
        try:
            # Create task
            task_data = {
                "title": "Complete project documentation",
                "description": "Write comprehensive docs for the ADHD app",
                "priority": "high",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            }
            
            response = self.make_request("POST", "/tasks", task_data)
            if response.status_code != 200:
                self.log_result("Tasks Create", False, f"Create failed: {response.status_code} - {response.text}")
                return False
            
            task = response.json()
            task_id = task["task_id"]
            self.created_items['tasks'].append(task_id)
            self.log_result("Tasks Create", True, f"Task created with ID: {task_id}")
            
            # Get all tasks
            response = self.make_request("GET", "/tasks")
            if response.status_code != 200:
                self.log_result("Tasks Get All", False, f"Get failed: {response.status_code}")
                return False
            
            tasks = response.json()
            if not isinstance(tasks, list):
                self.log_result("Tasks Get All", False, "Response is not a list")
                return False
            
            self.log_result("Tasks Get All", True, f"Retrieved {len(tasks)} tasks")
            
            # Update task
            update_data = {"completed": True, "priority": "medium"}
            response = self.make_request("PUT", f"/tasks/{task_id}", update_data)
            if response.status_code != 200:
                self.log_result("Tasks Update", False, f"Update failed: {response.status_code}")
                return False
            
            updated_task = response.json()
            if updated_task["completed"] != True:
                self.log_result("Tasks Update", False, "Task not properly updated")
                return False
            
            self.log_result("Tasks Update", True, "Task updated successfully")
            
            # Delete task
            response = self.make_request("DELETE", f"/tasks/{task_id}")
            if response.status_code != 200:
                self.log_result("Tasks Delete", False, f"Delete failed: {response.status_code}")
                return False
            
            self.log_result("Tasks Delete", True, "Task deleted successfully")
            self.created_items['tasks'].remove(task_id)
            
            return True
            
        except Exception as e:
            self.log_result("Tasks CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_tasks_ai_prioritize(self):
        """Test AI task prioritization"""
        try:
            # Create a few tasks first
            tasks_data = [
                {"title": "Urgent meeting prep", "priority": "high", "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()},
                {"title": "Read research paper", "priority": "medium"},
                {"title": "Organize desk", "priority": "low"}
            ]
            
            for task_data in tasks_data:
                response = self.make_request("POST", "/tasks", task_data)
                if response.status_code == 200:
                    task_id = response.json()["task_id"]
                    self.created_items['tasks'].append(task_id)
            
            # Test AI prioritization
            response = self.make_request("POST", "/tasks/prioritize")
            if response.status_code != 200:
                self.log_result("Tasks AI Prioritize", False, f"AI prioritize failed: {response.status_code}")
                return False
            
            result = response.json()
            if "suggestion" in result and "task_count" in result:
                self.log_result("Tasks AI Prioritize", True, f"AI suggestion received for {result['task_count']} tasks")
                return True
            else:
                self.log_result("Tasks AI Prioritize", False, "Missing suggestion or task_count in response")
                return False
                
        except Exception as e:
            self.log_result("Tasks AI Prioritize", False, f"Exception: {str(e)}")
            return False
    
    def test_habits_crud_and_checkin(self):
        """Test habit CRUD and check-in functionality"""
        try:
            # Create habit
            habit_data = {
                "name": "Morning meditation",
                "color": "#4A90E2",
                "frequency": "daily"
            }
            
            response = self.make_request("POST", "/habits", habit_data)
            if response.status_code != 200:
                self.log_result("Habits Create", False, f"Create failed: {response.status_code}")
                return False
            
            habit = response.json()
            habit_id = habit["habit_id"]
            self.created_items['habits'].append(habit_id)
            self.log_result("Habits Create", True, f"Habit created with ID: {habit_id}")
            
            # Get all habits
            response = self.make_request("GET", "/habits")
            if response.status_code != 200:
                self.log_result("Habits Get All", False, f"Get failed: {response.status_code}")
                return False
            
            habits = response.json()
            self.log_result("Habits Get All", True, f"Retrieved {len(habits)} habits")
            
            # Check-in habit
            response = self.make_request("POST", f"/habits/{habit_id}/checkin")
            if response.status_code != 200:
                self.log_result("Habits Check-in", False, f"Check-in failed: {response.status_code}")
                return False
            
            result = response.json()
            if "habit" in result and result["habit"]["current_streak"] >= 1:
                self.log_result("Habits Check-in", True, f"Check-in successful, streak: {result['habit']['current_streak']}")
            else:
                self.log_result("Habits Check-in", False, "Streak not properly calculated")
                return False
            
            # Delete habit
            response = self.make_request("DELETE", f"/habits/{habit_id}")
            if response.status_code != 200:
                self.log_result("Habits Delete", False, f"Delete failed: {response.status_code}")
                return False
            
            self.log_result("Habits Delete", True, "Habit deleted successfully")
            self.created_items['habits'].remove(habit_id)
            
            return True
            
        except Exception as e:
            self.log_result("Habits CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_focus_sessions(self):
        """Test focus session start, complete, and stats"""
        try:
            # Start focus session
            session_data = {
                "duration_minutes": 25
            }
            
            response = self.make_request("POST", "/focus/start", session_data)
            if response.status_code != 200:
                self.log_result("Focus Start", False, f"Start failed: {response.status_code}")
                return False
            
            session = response.json()
            session_id = session["session_id"]
            self.created_items['focus_sessions'].append(session_id)
            self.log_result("Focus Start", True, f"Focus session started with ID: {session_id}")
            
            # Complete focus session
            response = self.make_request("POST", f"/focus/{session_id}/complete")
            if response.status_code != 200:
                self.log_result("Focus Complete", False, f"Complete failed: {response.status_code}")
                return False
            
            result = response.json()
            if "session" in result and result["session"]["completed"]:
                self.log_result("Focus Complete", True, "Focus session completed successfully")
            else:
                self.log_result("Focus Complete", False, "Session not marked as completed")
                return False
            
            # Get focus stats
            response = self.make_request("GET", "/focus/stats")
            if response.status_code != 200:
                self.log_result("Focus Stats", False, f"Stats failed: {response.status_code}")
                return False
            
            stats = response.json()
            if "total_sessions" in stats and "total_minutes" in stats:
                self.log_result("Focus Stats", True, f"Stats: {stats['total_sessions']} sessions, {stats['total_minutes']} minutes")
                return True
            else:
                self.log_result("Focus Stats", False, "Missing stats fields")
                return False
                
        except Exception as e:
            self.log_result("Focus Sessions", False, f"Exception: {str(e)}")
            return False
    
    def test_medications_crud(self):
        """Test medication CRUD operations"""
        try:
            # Create medication
            med_data = {
                "name": "Adderall XR",
                "dosage": "20mg",
                "times": ["08:00", "14:00"],
                "reminders": True
            }
            
            response = self.make_request("POST", "/medications", med_data)
            if response.status_code != 200:
                self.log_result("Medications Create", False, f"Create failed: {response.status_code}")
                return False
            
            medication = response.json()
            med_id = medication["med_id"]
            self.created_items['medications'].append(med_id)
            self.log_result("Medications Create", True, f"Medication created with ID: {med_id}")
            
            # Get all medications
            response = self.make_request("GET", "/medications")
            if response.status_code != 200:
                self.log_result("Medications Get All", False, f"Get failed: {response.status_code}")
                return False
            
            medications = response.json()
            self.log_result("Medications Get All", True, f"Retrieved {len(medications)} medications")
            
            # Delete medication
            response = self.make_request("DELETE", f"/medications/{med_id}")
            if response.status_code != 200:
                self.log_result("Medications Delete", False, f"Delete failed: {response.status_code}")
                return False
            
            self.log_result("Medications Delete", True, "Medication deleted successfully")
            self.created_items['medications'].remove(med_id)
            
            return True
            
        except Exception as e:
            self.log_result("Medications CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_expenses_crud_and_summary(self):
        """Test expense CRUD and summary functionality"""
        try:
            # Create expense
            expense_data = {
                "type": "expense",
                "amount": 45.99,
                "category": "Food",
                "description": "Grocery shopping",
                "paid": True
            }
            
            response = self.make_request("POST", "/expenses", expense_data)
            if response.status_code != 200:
                self.log_result("Expenses Create", False, f"Create failed: {response.status_code}")
                return False
            
            expense = response.json()
            expense_id = expense["expense_id"]
            self.created_items['expenses'].append(expense_id)
            self.log_result("Expenses Create", True, f"Expense created with ID: {expense_id}")
            
            # Create bill
            bill_data = {
                "type": "bill",
                "amount": 120.00,
                "category": "Utilities",
                "description": "Electric bill",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
                "paid": False
            }
            
            response = self.make_request("POST", "/expenses", bill_data)
            if response.status_code == 200:
                bill = response.json()
                bill_id = bill["expense_id"]
                self.created_items['expenses'].append(bill_id)
                self.log_result("Bills Create", True, f"Bill created with ID: {bill_id}")
            
            # Get all expenses
            response = self.make_request("GET", "/expenses")
            if response.status_code != 200:
                self.log_result("Expenses Get All", False, f"Get failed: {response.status_code}")
                return False
            
            expenses = response.json()
            self.log_result("Expenses Get All", True, f"Retrieved {len(expenses)} expenses")
            
            # Get expense summary
            response = self.make_request("GET", "/expenses/summary")
            if response.status_code != 200:
                self.log_result("Expenses Summary", False, f"Summary failed: {response.status_code}")
                return False
            
            summary = response.json()
            if "total_spent" in summary and "unpaid_bills" in summary:
                self.log_result("Expenses Summary", True, f"Summary: ${summary['total_spent']} spent, ${summary['unpaid_bills']} unpaid")
            else:
                self.log_result("Expenses Summary", False, "Missing summary fields")
                return False
            
            # Update expense (mark bill as paid)
            if 'bill_id' in locals():
                update_data = {"paid": True}
                response = self.make_request("PUT", f"/expenses/{bill_id}", update_data)
                if response.status_code == 200:
                    self.log_result("Expenses Update", True, "Bill marked as paid")
                else:
                    self.log_result("Expenses Update", False, f"Update failed: {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_result("Expenses CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_events_crud(self):
        """Test event CRUD operations"""
        try:
            # Create event
            event_data = {
                "title": "Doctor appointment",
                "date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
                "time": "14:30",
                "reminder": True
            }
            
            response = self.make_request("POST", "/events", event_data)
            if response.status_code != 200:
                self.log_result("Events Create", False, f"Create failed: {response.status_code}")
                return False
            
            event = response.json()
            event_id = event["event_id"]
            self.created_items['events'].append(event_id)
            self.log_result("Events Create", True, f"Event created with ID: {event_id}")
            
            # Get all events
            response = self.make_request("GET", "/events")
            if response.status_code != 200:
                self.log_result("Events Get All", False, f"Get failed: {response.status_code}")
                return False
            
            events = response.json()
            self.log_result("Events Get All", True, f"Retrieved {len(events)} events")
            
            # Delete event
            response = self.make_request("DELETE", f"/events/{event_id}")
            if response.status_code != 200:
                self.log_result("Events Delete", False, f"Delete failed: {response.status_code}")
                return False
            
            self.log_result("Events Delete", True, "Event deleted successfully")
            self.created_items['events'].remove(event_id)
            
            return True
            
        except Exception as e:
            self.log_result("Events CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_birthdays_crud(self):
        """Test birthday CRUD operations"""
        try:
            # Create birthday
            birthday_data = {
                "name": "Sarah Johnson",
                "date": "03-15",  # MM-DD format
                "reminder_days_before": 7
            }
            
            response = self.make_request("POST", "/birthdays", birthday_data)
            if response.status_code != 200:
                self.log_result("Birthdays Create", False, f"Create failed: {response.status_code}")
                return False
            
            birthday = response.json()
            birthday_id = birthday["birthday_id"]
            self.created_items['birthdays'].append(birthday_id)
            self.log_result("Birthdays Create", True, f"Birthday created with ID: {birthday_id}")
            
            # Get all birthdays
            response = self.make_request("GET", "/birthdays")
            if response.status_code != 200:
                self.log_result("Birthdays Get All", False, f"Get failed: {response.status_code}")
                return False
            
            birthdays = response.json()
            self.log_result("Birthdays Get All", True, f"Retrieved {len(birthdays)} birthdays")
            
            # Delete birthday
            response = self.make_request("DELETE", f"/birthdays/{birthday_id}")
            if response.status_code != 200:
                self.log_result("Birthdays Delete", False, f"Delete failed: {response.status_code}")
                return False
            
            self.log_result("Birthdays Delete", True, "Birthday deleted successfully")
            self.created_items['birthdays'].remove(birthday_id)
            
            return True
            
        except Exception as e:
            self.log_result("Birthdays CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_routines_crud(self):
        """Test routine CRUD operations"""
        try:
            # Create routine
            routine_data = {
                "name": "Morning routine",
                "time": "07:00",
                "steps": ["Wake up", "Brush teeth", "Take medication", "Eat breakfast"],
                "days": ["mon", "tue", "wed", "thu", "fri"],
                "active": True
            }
            
            response = self.make_request("POST", "/routines", routine_data)
            if response.status_code != 200:
                self.log_result("Routines Create", False, f"Create failed: {response.status_code}")
                return False
            
            routine = response.json()
            routine_id = routine["routine_id"]
            self.created_items['routines'].append(routine_id)
            self.log_result("Routines Create", True, f"Routine created with ID: {routine_id}")
            
            # Get all routines
            response = self.make_request("GET", "/routines")
            if response.status_code != 200:
                self.log_result("Routines Get All", False, f"Get failed: {response.status_code}")
                return False
            
            routines = response.json()
            self.log_result("Routines Get All", True, f"Retrieved {len(routines)} routines")
            
            # Delete routine
            response = self.make_request("DELETE", f"/routines/{routine_id}")
            if response.status_code != 200:
                self.log_result("Routines Delete", False, f"Delete failed: {response.status_code}")
                return False
            
            self.log_result("Routines Delete", True, "Routine deleted successfully")
            self.created_items['routines'].remove(routine_id)
            
            return True
            
        except Exception as e:
            self.log_result("Routines CRUD", False, f"Exception: {str(e)}")
            return False
    
    def test_ai_focus_tip(self):
        """Test AI focus tip generation"""
        try:
            response = self.make_request("POST", "/ai/focus-tip")
            if response.status_code != 200:
                self.log_result("AI Focus Tip", False, f"Request failed: {response.status_code}")
                return False
            
            result = response.json()
            if "tip" in result and result["tip"]:
                self.log_result("AI Focus Tip", True, f"AI tip received: {result['tip'][:50]}...")
                return True
            else:
                self.log_result("AI Focus Tip", False, "No tip in response")
                return False
                
        except Exception as e:
            self.log_result("AI Focus Tip", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_logout(self):
        """Test user logout"""
        try:
            response = self.make_request("POST", "/auth/logout")
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log_result("Auth Logout", True, "Logout successful")
                    return True
                else:
                    self.log_result("Auth Logout", False, "No message in response")
                    return False
            else:
                self.log_result("Auth Logout", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Auth Logout", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_test_data(self):
        """Clean up any remaining test data"""
        print("\n🧹 Cleaning up test data...")
        
        for category, items in self.created_items.items():
            for item_id in items[:]:  # Create a copy to iterate over
                try:
                    if category == 'tasks':
                        response = self.make_request("DELETE", f"/tasks/{item_id}")
                    elif category == 'habits':
                        response = self.make_request("DELETE", f"/habits/{item_id}")
                    elif category == 'medications':
                        response = self.make_request("DELETE", f"/medications/{item_id}")
                    elif category == 'expenses':
                        response = self.make_request("DELETE", f"/expenses/{item_id}")
                    elif category == 'events':
                        response = self.make_request("DELETE", f"/events/{item_id}")
                    elif category == 'birthdays':
                        response = self.make_request("DELETE", f"/birthdays/{item_id}")
                    elif category == 'routines':
                        response = self.make_request("DELETE", f"/routines/{item_id}")
                    
                    if response.status_code == 200:
                        items.remove(item_id)
                        print(f"   Cleaned up {category}: {item_id}")
                except:
                    pass  # Ignore cleanup errors
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ADHD Companion App Backend API Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        auth_success = self.test_auth_register()
        if not auth_success:
            auth_success = self.test_auth_login()
        
        if not auth_success:
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        self.test_auth_me()
        
        # Feature tests (only if authenticated)
        print("\n📋 TASK MANAGEMENT TESTS")
        self.test_tasks_crud()
        self.test_tasks_ai_prioritize()
        
        print("\n🎯 HABIT TRACKING TESTS")
        self.test_habits_crud_and_checkin()
        
        print("\n⏱️ FOCUS SESSION TESTS")
        self.test_focus_sessions()
        
        print("\n💊 MEDICATION TESTS")
        self.test_medications_crud()
        
        print("\n💰 EXPENSE TRACKING TESTS")
        self.test_expenses_crud_and_summary()
        
        print("\n📅 EVENT TRACKING TESTS")
        self.test_events_crud()
        
        print("\n🎂 BIRTHDAY TRACKING TESTS")
        self.test_birthdays_crud()
        
        print("\n🔄 ROUTINE TESTS")
        self.test_routines_crud()
        
        print("\n🤖 AI FEATURES TESTS")
        self.test_ai_focus_tip()
        
        print("\n🚪 LOGOUT TEST")
        self.test_auth_logout()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print(f"\n🎯 Success Rate: {(passed/total)*100:.1f}%")
        
        return passed == total

if __name__ == "__main__":
    tester = ADHDAppTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)