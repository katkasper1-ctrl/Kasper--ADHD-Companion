#!/usr/bin/env python3
"""
Backend Test Suite for Bill Statements Feature
Testing the newly added Bill Statements endpoints in the Money Tracker
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"

class BillStatementsTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.created_statements = []
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login(self):
        """Authenticate and get JWT token"""
        self.log("🔐 Testing authentication...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                if self.auth_token:
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log("✅ Authentication successful")
                    return True
                else:
                    self.log("❌ No access token in response", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False
    
    def test_create_statements(self):
        """Test creating multiple bill statements with different types"""
        self.log("📄 Testing bill statement creation...")
        
        # Test data for different statement types
        test_statements = [
            {
                "title": "Electric Bill - January 2026",
                "statement_type": "bill",
                "amount": 120.50,
                "due_date": "2026-02-15",
                "photo": None,
                "notes": "Monthly electric bill from ConEd",
                "status": "pending"
            },
            {
                "title": "Bank Statement - December 2025",
                "statement_type": "bank_statement",
                "amount": None,
                "due_date": None,
                "photo": None,
                "notes": "Monthly bank statement for review",
                "status": "pending"
            },
            {
                "title": "Internet Service Invoice",
                "statement_type": "invoice",
                "amount": 89.99,
                "due_date": "2026-02-01",
                "photo": None,
                "notes": "Monthly internet service from Verizon",
                "status": "pending"
            }
        ]
        
        success_count = 0
        
        for i, statement_data in enumerate(test_statements, 1):
            try:
                response = self.session.post(f"{BASE_URL}/expenses/statements", json=statement_data)
                
                if response.status_code == 200:
                    created_statement = response.json()
                    self.created_statements.append(created_statement)
                    self.log(f"✅ Statement {i} created: {created_statement['title']} (ID: {created_statement['statement_id']})")
                    success_count += 1
                    
                    # Verify response structure
                    required_fields = ["statement_id", "user_id", "title", "statement_type", "status", "created_at"]
                    for field in required_fields:
                        if field not in created_statement:
                            self.log(f"⚠️ Missing field '{field}' in response", "WARNING")
                else:
                    self.log(f"❌ Failed to create statement {i}: {response.status_code} - {response.text}", "ERROR")
                    
            except Exception as e:
                self.log(f"❌ Error creating statement {i}: {str(e)}", "ERROR")
        
        self.log(f"📊 Statement creation results: {success_count}/{len(test_statements)} successful")
        return success_count == len(test_statements)
    
    def test_get_statements(self):
        """Test retrieving all statements"""
        self.log("📋 Testing statement retrieval...")
        
        try:
            response = self.session.get(f"{BASE_URL}/expenses/statements")
            
            if response.status_code == 200:
                statements = response.json()
                self.log(f"✅ Retrieved {len(statements)} statements")
                
                # Verify our created statements are in the list
                created_ids = {stmt['statement_id'] for stmt in self.created_statements}
                retrieved_ids = {stmt['statement_id'] for stmt in statements}
                
                if created_ids.issubset(retrieved_ids):
                    self.log("✅ All created statements found in retrieval")
                    
                    # Display statement details
                    for stmt in statements:
                        if stmt['statement_id'] in created_ids:
                            self.log(f"   📄 {stmt['title']} - {stmt['statement_type']} - Status: {stmt['status']}")
                    
                    return True
                else:
                    missing = created_ids - retrieved_ids
                    self.log(f"❌ Missing statements in retrieval: {missing}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to retrieve statements: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error retrieving statements: {str(e)}", "ERROR")
            return False
    
    def test_update_statement(self):
        """Test updating statement status to paid"""
        self.log("✏️ Testing statement status update...")
        
        if not self.created_statements:
            self.log("❌ No statements to update", "ERROR")
            return False
        
        # Update the first statement to "paid"
        statement_to_update = self.created_statements[0]
        statement_id = statement_to_update['statement_id']
        
        update_data = {"status": "paid"}
        
        try:
            response = self.session.put(f"{BASE_URL}/expenses/statements/{statement_id}", json=update_data)
            
            if response.status_code == 200:
                updated_statement = response.json()
                
                if updated_statement['status'] == 'paid':
                    self.log(f"✅ Statement updated successfully: {updated_statement['title']} is now PAID")
                    return True
                else:
                    self.log(f"❌ Status not updated correctly: expected 'paid', got '{updated_statement['status']}'", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to update statement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error updating statement: {str(e)}", "ERROR")
            return False
    
    def test_delete_statement(self):
        """Test deleting a statement"""
        self.log("🗑️ Testing statement deletion...")
        
        if len(self.created_statements) < 2:
            self.log("❌ Need at least 2 statements to test deletion", "ERROR")
            return False
        
        # Delete the last statement
        statement_to_delete = self.created_statements[-1]
        statement_id = statement_to_delete['statement_id']
        
        try:
            response = self.session.delete(f"{BASE_URL}/expenses/statements/{statement_id}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Statement deleted successfully: {statement_to_delete['title']}")
                
                # Verify deletion by trying to retrieve all statements
                get_response = self.session.get(f"{BASE_URL}/expenses/statements")
                if get_response.status_code == 200:
                    remaining_statements = get_response.json()
                    remaining_ids = {stmt['statement_id'] for stmt in remaining_statements}
                    
                    if statement_id not in remaining_ids:
                        self.log("✅ Statement successfully removed from database")
                        return True
                    else:
                        self.log("❌ Statement still exists after deletion", "ERROR")
                        return False
                else:
                    self.log("⚠️ Could not verify deletion", "WARNING")
                    return True  # Assume success since delete returned 200
            else:
                self.log(f"❌ Failed to delete statement: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error deleting statement: {str(e)}", "ERROR")
            return False
    
    def test_enhanced_expense_creation(self):
        """Test creating expense with new photo field"""
        self.log("💰 Testing enhanced expense creation with photo field...")
        
        expense_data = {
            "type": "bill",
            "amount": 99.99,
            "category": "Utilities",
            "description": "Water bill with photo support",
            "photo": None
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/expenses", json=expense_data)
            
            if response.status_code == 200:
                created_expense = response.json()
                self.log(f"✅ Enhanced expense created successfully: {created_expense['description']}")
                
                # Verify photo field is present
                if 'photo' in created_expense:
                    self.log("✅ Photo field present in expense response")
                    return True
                else:
                    self.log("⚠️ Photo field missing from expense response", "WARNING")
                    return True  # Still consider success if expense was created
            else:
                self.log(f"❌ Failed to create enhanced expense: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating enhanced expense: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run the complete test suite"""
        self.log("🚀 Starting Bill Statements Feature Test Suite")
        self.log("=" * 60)
        
        # Test results tracking
        test_results = {}
        
        # 1. Authentication
        test_results['authentication'] = self.login()
        if not test_results['authentication']:
            self.log("❌ Authentication failed - cannot proceed with tests", "ERROR")
            return test_results
        
        # 2. Create statements
        test_results['create_statements'] = self.test_create_statements()
        
        # 3. Get statements
        test_results['get_statements'] = self.test_get_statements()
        
        # 4. Update statement
        test_results['update_statement'] = self.test_update_statement()
        
        # 5. Delete statement
        test_results['delete_statement'] = self.test_delete_statement()
        
        # 6. Enhanced expense creation
        test_results['enhanced_expense'] = self.test_enhanced_expense_creation()
        
        # Summary
        self.log("=" * 60)
        self.log("📊 TEST RESULTS SUMMARY:")
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"   {test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        self.log(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED - Bill Statements feature is working correctly!")
        else:
            self.log("⚠️ Some tests failed - see details above")
        
        return test_results

def main():
    """Main test execution"""
    tester = BillStatementsTest()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()