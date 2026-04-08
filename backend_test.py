#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"

class YogaSessionTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Login and get auth token"""
        try:
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
            self.log_test("Authentication", False, f"Login error: {str(e)}")
            return False
    
    def test_log_yoga_session(self, session_data):
        """Test logging a yoga session"""
        try:
            response = self.session.post(f"{BACKEND_URL}/yoga/log", json=session_data)
            
            if response.status_code == 200:
                data = response.json()
                session_id = data.get("session_id")
                if session_id:
                    self.log_test(f"Log Yoga Session - {session_data['pose_name']}", True, 
                                f"Session logged with ID: {session_id}")
                    return session_id
                else:
                    self.log_test(f"Log Yoga Session - {session_data['pose_name']}", False, 
                                "No session_id in response")
                    return None
            else:
                self.log_test(f"Log Yoga Session - {session_data['pose_name']}", False, 
                            f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_test(f"Log Yoga Session - {session_data['pose_name']}", False, f"Error: {str(e)}")
            return None
    
    def test_get_yoga_logs(self, expected_count=None):
        """Test retrieving yoga session logs"""
        try:
            response = self.session.get(f"{BACKEND_URL}/yoga/logs")
            
            if response.status_code == 200:
                logs = response.json()
                if isinstance(logs, list):
                    count = len(logs)
                    details = f"Retrieved {count} yoga sessions"
                    if expected_count is not None:
                        if count == expected_count:
                            details += f" (expected {expected_count})"
                        else:
                            self.log_test("Get Yoga Logs", False, 
                                        f"Expected {expected_count} sessions, got {count}")
                            return logs
                    
                    self.log_test("Get Yoga Logs", True, details)
                    return logs
                else:
                    self.log_test("Get Yoga Logs", False, "Response is not a list")
                    return None
            else:
                self.log_test("Get Yoga Logs", False, f"Failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Get Yoga Logs", False, f"Error: {str(e)}")
            return None
    
    def test_delete_yoga_session(self, session_id):
        """Test deleting a yoga session"""
        try:
            response = self.session.delete(f"{BACKEND_URL}/yoga/logs/{session_id}")
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                self.log_test("Delete Yoga Session", True, f"Session deleted: {message}")
                return True
            else:
                self.log_test("Delete Yoga Session", False, 
                            f"Failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete Yoga Session", False, f"Error: {str(e)}")
            return False
    
    def run_comprehensive_test(self):
        """Run the complete yoga session tracker test flow"""
        print("=" * 60)
        print("YOGA SESSION TRACKER COMPREHENSIVE TEST")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Log first yoga session
        session1_data = {
            "pose_id": "childs_pose",
            "pose_name": "Child's Pose",
            "duration_minutes": 10,
            "body_feeling": "relaxed",
            "feeling_notes": "My back feels much better after this"
        }
        
        session1_id = self.test_log_yoga_session(session1_data)
        if not session1_id:
            print("❌ Failed to log first session. Cannot proceed.")
            return False
        
        # Step 3: Log second yoga session
        session2_data = {
            "pose_id": "warrior_pose",
            "pose_name": "Warrior II",
            "duration_minutes": 5,
            "body_feeling": "strong",
            "feeling_notes": "Legs feel stronger"
        }
        
        session2_id = self.test_log_yoga_session(session2_data)
        if not session2_id:
            print("❌ Failed to log second session. Cannot proceed.")
            return False
        
        # Step 4: Verify both sessions appear in logs
        logs = self.test_get_yoga_logs(expected_count=2)
        if logs is None:
            print("❌ Failed to retrieve logs after logging sessions.")
            return False
        
        # Verify session data
        session_ids = [log.get("session_id") for log in logs]
        if session1_id in session_ids and session2_id in session_ids:
            self.log_test("Verify Both Sessions Present", True, 
                        f"Both sessions found in logs: {session1_id}, {session2_id}")
        else:
            self.log_test("Verify Both Sessions Present", False, 
                        f"Sessions not found. Expected: {session1_id}, {session2_id}. Found: {session_ids}")
        
        # Step 5: Delete one session
        if not self.test_delete_yoga_session(session1_id):
            print("❌ Failed to delete session. Cannot proceed.")
            return False
        
        # Step 6: Verify only one session remains
        final_logs = self.test_get_yoga_logs(expected_count=1)
        if final_logs is not None:
            remaining_ids = [log.get("session_id") for log in final_logs]
            if session2_id in remaining_ids and session1_id not in remaining_ids:
                self.log_test("Verify Session Deletion", True, 
                            f"Correct session remains: {session2_id}")
            else:
                self.log_test("Verify Session Deletion", False, 
                            f"Unexpected sessions remain: {remaining_ids}")
        
        # Clean up - delete remaining session
        if session2_id:
            self.test_delete_yoga_session(session2_id)
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
        
        print("\nALL TEST RESULTS:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")

def main():
    """Main test execution"""
    tester = YogaSessionTester()
    
    try:
        success = tester.run_comprehensive_test()
        tester.print_summary()
        
        if success and all(result["success"] for result in tester.test_results):
            print("\n🎉 ALL YOGA SESSION TRACKER TESTS PASSED!")
            sys.exit(0)
        else:
            print("\n⚠️  SOME TESTS FAILED!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()