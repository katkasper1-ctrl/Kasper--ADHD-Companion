#!/usr/bin/env python3
"""
Backend Testing Script for ADHD Companion App - Grocery List and Receipt Tracker
Tests all grocery-related endpoints with authentication
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"

class GroceryTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_items = []
        self.test_receipts = []
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def authenticate(self):
        """Login and get JWT token"""
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
            self.log(f"❌ Authentication error: {str(e)}", "ERROR")
            return False
    
    def test_create_grocery_item(self):
        """Test POST /api/groceries - Create grocery item"""
        self.log("🛒 Testing grocery item creation...")
        
        test_items = [
            {"name": "Organic Milk", "quantity": "2 gallons", "category": "Dairy"},
            {"name": "Whole Wheat Bread", "quantity": "1 loaf", "category": "Bakery"},
            {"name": "Fresh Bananas", "quantity": "6", "category": "Produce"},
            {"name": "Greek Yogurt", "quantity": "4 cups", "category": "Dairy"},
            {"name": "Chicken Breast", "quantity": "2 lbs", "category": "Meat"}
        ]
        
        created_items = []
        for item_data in test_items:
            try:
                response = self.session.post(f"{BASE_URL}/groceries", json=item_data)
                if response.status_code == 200:
                    item = response.json()
                    created_items.append(item)
                    self.test_items.append(item)
                    self.log(f"✅ Created item: {item['name']} (ID: {item['item_id']})")
                else:
                    self.log(f"❌ Failed to create item {item_data['name']}: {response.status_code} - {response.text}", "ERROR")
                    return False
            except Exception as e:
                self.log(f"❌ Error creating item {item_data['name']}: {str(e)}", "ERROR")
                return False
        
        self.log(f"✅ Successfully created {len(created_items)} grocery items")
        return True
    
    def test_get_grocery_items(self):
        """Test GET /api/groceries - Get all grocery items"""
        self.log("📋 Testing grocery items retrieval...")
        
        try:
            response = self.session.get(f"{BASE_URL}/groceries")
            if response.status_code == 200:
                items = response.json()
                self.log(f"✅ Retrieved {len(items)} grocery items")
                
                # Verify our test items are in the list
                item_names = [item['name'] for item in items]
                expected_names = ["Organic Milk", "Whole Wheat Bread", "Fresh Bananas", "Greek Yogurt", "Chicken Breast"]
                
                for expected_name in expected_names:
                    if expected_name in item_names:
                        self.log(f"✅ Found expected item: {expected_name}")
                    else:
                        self.log(f"❌ Missing expected item: {expected_name}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Failed to get grocery items: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error getting grocery items: {str(e)}", "ERROR")
            return False
    
    def test_update_grocery_item(self):
        """Test PUT /api/groceries/{item_id} - Update item (toggle checked)"""
        self.log("✏️ Testing grocery item updates...")
        
        if not self.test_items:
            self.log("❌ No test items available for update", "ERROR")
            return False
        
        # Test checking off items
        for i, item in enumerate(self.test_items[:3]):  # Check first 3 items
            try:
                update_data = {"checked": True}
                response = self.session.put(f"{BASE_URL}/groceries/{item['item_id']}", json=update_data)
                
                if response.status_code == 200:
                    updated_item = response.json()
                    if updated_item.get("checked") == True:
                        self.log(f"✅ Successfully checked off: {item['name']}")
                        self.test_items[i] = updated_item  # Update our local copy
                    else:
                        self.log(f"❌ Item not marked as checked: {item['name']}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Failed to update item {item['name']}: {response.status_code} - {response.text}", "ERROR")
                    return False
            except Exception as e:
                self.log(f"❌ Error updating item {item['name']}: {str(e)}", "ERROR")
                return False
        
        # Test updating item details
        if len(self.test_items) > 3:
            test_item = self.test_items[3]
            try:
                update_data = {
                    "name": "Greek Yogurt - Updated",
                    "quantity": "6 cups",
                    "notes": "Buy the vanilla flavor"
                }
                response = self.session.put(f"{BASE_URL}/groceries/{test_item['item_id']}", json=update_data)
                
                if response.status_code == 200:
                    updated_item = response.json()
                    if (updated_item.get("name") == "Greek Yogurt - Updated" and 
                        updated_item.get("quantity") == "6 cups" and
                        updated_item.get("notes") == "Buy the vanilla flavor"):
                        self.log("✅ Successfully updated item details")
                    else:
                        self.log("❌ Item details not updated correctly", "ERROR")
                        return False
                else:
                    self.log(f"❌ Failed to update item details: {response.status_code} - {response.text}", "ERROR")
                    return False
            except Exception as e:
                self.log(f"❌ Error updating item details: {str(e)}", "ERROR")
                return False
        
        return True
    
    def test_delete_grocery_item(self):
        """Test DELETE /api/groceries/{item_id} - Delete an item"""
        self.log("🗑️ Testing grocery item deletion...")
        
        if not self.test_items:
            self.log("❌ No test items available for deletion", "ERROR")
            return False
        
        # Delete the last item
        item_to_delete = self.test_items[-1]
        try:
            response = self.session.delete(f"{BASE_URL}/groceries/{item_to_delete['item_id']}")
            
            if response.status_code == 200:
                result = response.json()
                if "deleted" in result.get("message", "").lower():
                    self.log(f"✅ Successfully deleted item: {item_to_delete['name']}")
                    self.test_items.pop()  # Remove from our list
                    return True
                else:
                    self.log(f"❌ Unexpected delete response: {result}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to delete item: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error deleting item: {str(e)}", "ERROR")
            return False
    
    def test_clear_checked_items(self):
        """Test DELETE /api/groceries/clear/checked - Clear all checked items"""
        self.log("🧹 Testing clear checked items...")
        
        try:
            response = self.session.delete(f"{BASE_URL}/groceries/clear/checked")
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message", "")
                self.log(f"✅ Clear checked items result: {message}")
                
                # Verify checked items are gone
                get_response = self.session.get(f"{BASE_URL}/groceries")
                if get_response.status_code == 200:
                    remaining_items = get_response.json()
                    checked_items = [item for item in remaining_items if item.get("checked", False)]
                    if len(checked_items) == 0:
                        self.log("✅ All checked items successfully cleared")
                        return True
                    else:
                        self.log(f"❌ {len(checked_items)} checked items still remain", "ERROR")
                        return False
                else:
                    self.log("❌ Failed to verify cleared items", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to clear checked items: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error clearing checked items: {str(e)}", "ERROR")
            return False
    
    def test_upload_receipt(self):
        """Test POST /api/groceries/receipts - Upload receipt"""
        self.log("🧾 Testing receipt upload...")
        
        test_receipts = [
            {
                "total_amount": 45.99,
                "store_name": "Walmart Supercenter",
                "notes": "Weekly grocery shopping",
                "receipt_image": None
            },
            {
                "total_amount": 23.50,
                "store_name": "Target",
                "notes": "Quick snack run",
                "receipt_image": None
            },
            {
                "total_amount": 67.85,
                "store_name": "Whole Foods Market",
                "notes": "Organic produce and meat",
                "receipt_image": None
            }
        ]
        
        for receipt_data in test_receipts:
            try:
                response = self.session.post(f"{BASE_URL}/groceries/receipts", json=receipt_data)
                
                if response.status_code == 200:
                    receipt = response.json()
                    self.test_receipts.append(receipt)
                    self.log(f"✅ Uploaded receipt: ${receipt['total_amount']} from {receipt['store_name']} (ID: {receipt['receipt_id']})")
                else:
                    self.log(f"❌ Failed to upload receipt: {response.status_code} - {response.text}", "ERROR")
                    return False
            except Exception as e:
                self.log(f"❌ Error uploading receipt: {str(e)}", "ERROR")
                return False
        
        self.log(f"✅ Successfully uploaded {len(self.test_receipts)} receipts")
        return True
    
    def test_get_receipts(self):
        """Test GET /api/groceries/receipts - Get all receipts"""
        self.log("📄 Testing receipts retrieval...")
        
        try:
            response = self.session.get(f"{BASE_URL}/groceries/receipts")
            
            if response.status_code == 200:
                receipts = response.json()
                self.log(f"✅ Retrieved {len(receipts)} receipts")
                
                # Verify our test receipts are in the list
                receipt_stores = [receipt['store_name'] for receipt in receipts]
                expected_stores = ["Walmart Supercenter", "Target", "Whole Foods Market"]
                
                for expected_store in expected_stores:
                    if expected_store in receipt_stores:
                        self.log(f"✅ Found receipt from: {expected_store}")
                    else:
                        self.log(f"❌ Missing receipt from: {expected_store}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Failed to get receipts: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error getting receipts: {str(e)}", "ERROR")
            return False
    
    def test_delete_receipt(self):
        """Test DELETE /api/groceries/receipts/{receipt_id} - Delete a receipt"""
        self.log("🗑️ Testing receipt deletion...")
        
        if not self.test_receipts:
            self.log("❌ No test receipts available for deletion", "ERROR")
            return False
        
        # Delete the first receipt
        receipt_to_delete = self.test_receipts[0]
        try:
            response = self.session.delete(f"{BASE_URL}/groceries/receipts/{receipt_to_delete['receipt_id']}")
            
            if response.status_code == 200:
                result = response.json()
                if "deleted" in result.get("message", "").lower():
                    self.log(f"✅ Successfully deleted receipt from: {receipt_to_delete['store_name']}")
                    self.test_receipts.pop(0)  # Remove from our list
                    return True
                else:
                    self.log(f"❌ Unexpected delete response: {result}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to delete receipt: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error deleting receipt: {str(e)}", "ERROR")
            return False
    
    def test_get_spending_summary(self):
        """Test GET /api/groceries/spending - Get spending summary"""
        self.log("💰 Testing spending summary...")
        
        try:
            response = self.session.get(f"{BASE_URL}/groceries/spending")
            
            if response.status_code == 200:
                spending = response.json()
                
                # Verify expected fields
                required_fields = ["total_all_time", "total_this_week", "total_this_month", "receipt_count"]
                for field in required_fields:
                    if field not in spending:
                        self.log(f"❌ Missing field in spending summary: {field}", "ERROR")
                        return False
                
                self.log(f"✅ Spending Summary:")
                self.log(f"   - Total All Time: ${spending['total_all_time']}")
                self.log(f"   - Total This Week: ${spending['total_this_week']}")
                self.log(f"   - Total This Month: ${spending['total_this_month']}")
                self.log(f"   - Receipt Count: {spending['receipt_count']}")
                
                # Verify the totals make sense (should be > 0 since we uploaded receipts)
                if spending['total_all_time'] > 0 and spending['receipt_count'] > 0:
                    self.log("✅ Spending summary data looks correct")
                    return True
                else:
                    self.log("❌ Spending summary shows no data despite uploaded receipts", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get spending summary: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error getting spending summary: {str(e)}", "ERROR")
            return False
    
    def run_full_test_suite(self):
        """Run all grocery-related tests"""
        self.log("🚀 Starting Grocery List and Receipt Tracker Backend Tests")
        self.log(f"🌐 Testing against: {BASE_URL}")
        
        tests = [
            ("Authentication", self.authenticate),
            ("Create Grocery Items", self.test_create_grocery_item),
            ("Get Grocery Items", self.test_get_grocery_items),
            ("Update Grocery Items", self.test_update_grocery_item),
            ("Delete Grocery Item", self.test_delete_grocery_item),
            ("Clear Checked Items", self.test_clear_checked_items),
            ("Upload Receipts", self.test_upload_receipt),
            ("Get Receipts", self.test_get_receipts),
            ("Delete Receipt", self.test_delete_receipt),
            ("Get Spending Summary", self.test_get_spending_summary)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*50}")
            self.log(f"Running: {test_name}")
            self.log(f"{'='*50}")
            
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} - PASSED")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} - FAILED")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} - FAILED with exception: {str(e)}", "ERROR")
        
        # Final summary
        self.log(f"\n{'='*60}")
        self.log(f"🏁 GROCERY BACKEND TESTING COMPLETE")
        self.log(f"{'='*60}")
        self.log(f"✅ Passed: {passed}")
        self.log(f"❌ Failed: {failed}")
        self.log(f"📊 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            self.log("🎉 ALL GROCERY TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️  {failed} test(s) failed. Check logs above for details.")
            return False

if __name__ == "__main__":
    tester = GroceryTester()
    success = tester.run_full_test_suite()
    sys.exit(0 if success else 1)