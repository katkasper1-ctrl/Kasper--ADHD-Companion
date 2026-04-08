#!/usr/bin/env python3
"""
Enhanced Medication Tracker and Medical Profile Test Suite
Testing the newly enhanced medication endpoints and medical profile functionality
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://adhd-companion-18.preview.emergentagent.com/api"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"

class EnhancedMedicationTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.created_medication_id = None
        
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
    
    def test_create_enhanced_medication(self):
        """Test creating medication with NEW enhanced fields"""
        self.log("💊 Testing enhanced medication creation...")
        
        # Test data with new fields as specified in the request
        medication_data = {
            "name": "Adderall",
            "dosage": "20mg",
            "frequency": "Twice daily",
            "instructions": "Take with food",
            "times": ["08:00", "14:00"]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/medications", json=medication_data)
            
            if response.status_code == 200:
                created_medication = response.json()
                self.created_medication_id = created_medication.get("med_id")
                self.log(f"✅ Enhanced medication created: {created_medication['name']}")
                
                # Verify new fields are present and correct
                required_fields = ["med_id", "user_id", "name", "dosage", "frequency", "instructions", "times", "reminders", "created_at"]
                missing_fields = []
                
                for field in required_fields:
                    if field not in created_medication:
                        missing_fields.append(field)
                
                if missing_fields:
                    self.log(f"❌ Missing fields in response: {missing_fields}", "ERROR")
                    return False
                
                # Verify specific field values
                if created_medication["frequency"] != "Twice daily":
                    self.log(f"❌ Frequency field incorrect: expected 'Twice daily', got '{created_medication['frequency']}'", "ERROR")
                    return False
                
                if created_medication["instructions"] != "Take with food":
                    self.log(f"❌ Instructions field incorrect: expected 'Take with food', got '{created_medication['instructions']}'", "ERROR")
                    return False
                
                if created_medication["times"] != ["08:00", "14:00"]:
                    self.log(f"❌ Times field incorrect: expected ['08:00', '14:00'], got {created_medication['times']}", "ERROR")
                    return False
                
                self.log("✅ All new fields verified correctly")
                return True
            else:
                self.log(f"❌ Failed to create medication: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating medication: {str(e)}", "ERROR")
            return False
    
    def test_get_medications_with_new_fields(self):
        """Test retrieving medications and verify new fields return correctly"""
        self.log("📋 Testing medication retrieval with new fields...")
        
        try:
            response = self.session.get(f"{BASE_URL}/medications")
            
            if response.status_code == 200:
                medications = response.json()
                self.log(f"✅ Retrieved {len(medications)} medications")
                
                # Find our created medication
                our_medication = None
                for med in medications:
                    if med.get("med_id") == self.created_medication_id:
                        our_medication = med
                        break
                
                if not our_medication:
                    self.log("❌ Created medication not found in retrieval", "ERROR")
                    return False
                
                # Verify new fields are present and correct
                if our_medication.get("frequency") != "Twice daily":
                    self.log(f"❌ Retrieved frequency incorrect: {our_medication.get('frequency')}", "ERROR")
                    return False
                
                if our_medication.get("instructions") != "Take with food":
                    self.log(f"❌ Retrieved instructions incorrect: {our_medication.get('instructions')}", "ERROR")
                    return False
                
                if our_medication.get("times") != ["08:00", "14:00"]:
                    self.log(f"❌ Retrieved times incorrect: {our_medication.get('times')}", "ERROR")
                    return False
                
                self.log("✅ All new fields retrieved correctly")
                self.log(f"   📄 {our_medication['name']} - {our_medication['dosage']} - {our_medication['frequency']}")
                self.log(f"   📄 Instructions: {our_medication['instructions']}")
                self.log(f"   📄 Times: {our_medication['times']}")
                
                return True
            else:
                self.log(f"❌ Failed to retrieve medications: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error retrieving medications: {str(e)}", "ERROR")
            return False
    
    def test_get_default_medical_profile(self):
        """Test getting default empty medical profile"""
        self.log("🏥 Testing default medical profile retrieval...")
        
        try:
            response = self.session.get(f"{BASE_URL}/medical-profile")
            
            if response.status_code == 200:
                profile = response.json()
                self.log("✅ Medical profile retrieved successfully")
                
                # Verify default empty structure
                expected_fields = [
                    "user_id", "allergies", "conditions", "emergency_contacts",
                    "hospital_name", "hospital_address", "hospital_phone",
                    "doctor_name", "doctor_phone", "doctor_specialty",
                    "blood_type", "insurance_info"
                ]
                
                missing_fields = []
                for field in expected_fields:
                    if field not in profile:
                        missing_fields.append(field)
                
                if missing_fields:
                    self.log(f"❌ Missing fields in profile: {missing_fields}", "ERROR")
                    return False
                
                # Verify empty defaults
                if profile["allergies"] != []:
                    self.log(f"❌ Allergies should be empty list, got: {profile['allergies']}", "ERROR")
                    return False
                
                if profile["conditions"] != []:
                    self.log(f"❌ Conditions should be empty list, got: {profile['conditions']}", "ERROR")
                    return False
                
                if profile["emergency_contacts"] != []:
                    self.log(f"❌ Emergency contacts should be empty list, got: {profile['emergency_contacts']}", "ERROR")
                    return False
                
                self.log("✅ Default empty profile structure verified")
                return True
            else:
                self.log(f"❌ Failed to get medical profile: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting medical profile: {str(e)}", "ERROR")
            return False
    
    def test_update_profile_allergies(self):
        """Test updating medical profile with allergies"""
        self.log("🤧 Testing medical profile allergies update...")
        
        allergies_data = {
            "allergies": ["Penicillin", "Shellfish"]
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/medical-profile", json=allergies_data)
            
            if response.status_code == 200:
                updated_profile = response.json()
                self.log("✅ Allergies updated successfully")
                
                if updated_profile.get("allergies") == ["Penicillin", "Shellfish"]:
                    self.log("✅ Allergies data verified correctly")
                    return True
                else:
                    self.log(f"❌ Allergies data incorrect: {updated_profile.get('allergies')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to update allergies: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error updating allergies: {str(e)}", "ERROR")
            return False
    
    def test_update_profile_conditions(self):
        """Test updating medical profile with conditions"""
        self.log("🩺 Testing medical profile conditions update...")
        
        conditions_data = {
            "conditions": ["ADHD", "Anxiety"]
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/medical-profile", json=conditions_data)
            
            if response.status_code == 200:
                updated_profile = response.json()
                self.log("✅ Conditions updated successfully")
                
                if updated_profile.get("conditions") == ["ADHD", "Anxiety"]:
                    self.log("✅ Conditions data verified correctly")
                    return True
                else:
                    self.log(f"❌ Conditions data incorrect: {updated_profile.get('conditions')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to update conditions: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error updating conditions: {str(e)}", "ERROR")
            return False
    
    def test_update_profile_emergency_contacts(self):
        """Test updating medical profile with emergency contacts"""
        self.log("📞 Testing medical profile emergency contacts update...")
        
        emergency_contacts_data = {
            "emergency_contacts": [
                {
                    "name": "Mom",
                    "phone": "555-0100",
                    "relationship": "Mother"
                }
            ]
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/medical-profile", json=emergency_contacts_data)
            
            if response.status_code == 200:
                updated_profile = response.json()
                self.log("✅ Emergency contacts updated successfully")
                
                expected_contact = {"name": "Mom", "phone": "555-0100", "relationship": "Mother"}
                if updated_profile.get("emergency_contacts") == [expected_contact]:
                    self.log("✅ Emergency contacts data verified correctly")
                    return True
                else:
                    self.log(f"❌ Emergency contacts data incorrect: {updated_profile.get('emergency_contacts')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to update emergency contacts: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error updating emergency contacts: {str(e)}", "ERROR")
            return False
    
    def test_update_profile_doctor_hospital_info(self):
        """Test updating medical profile with doctor and hospital info"""
        self.log("🏥 Testing medical profile doctor/hospital info update...")
        
        doctor_hospital_data = {
            "doctor_name": "Dr. Smith",
            "doctor_phone": "555-0200",
            "doctor_specialty": "Psychiatrist",
            "hospital_name": "City Hospital",
            "hospital_address": "123 Main St",
            "hospital_phone": "555-0300",
            "blood_type": "A+",
            "insurance_info": "Blue Cross #12345"
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/medical-profile", json=doctor_hospital_data)
            
            if response.status_code == 200:
                updated_profile = response.json()
                self.log("✅ Doctor/hospital info updated successfully")
                
                # Verify all fields
                for key, expected_value in doctor_hospital_data.items():
                    if updated_profile.get(key) != expected_value:
                        self.log(f"❌ {key} incorrect: expected '{expected_value}', got '{updated_profile.get(key)}'", "ERROR")
                        return False
                
                self.log("✅ All doctor/hospital info verified correctly")
                return True
            else:
                self.log(f"❌ Failed to update doctor/hospital info: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error updating doctor/hospital info: {str(e)}", "ERROR")
            return False
    
    def test_get_complete_medical_profile(self):
        """Test retrieving complete medical profile with all data"""
        self.log("📋 Testing complete medical profile retrieval...")
        
        try:
            response = self.session.get(f"{BASE_URL}/medical-profile")
            
            if response.status_code == 200:
                profile = response.json()
                self.log("✅ Complete medical profile retrieved")
                
                # Verify all data persisted correctly
                expected_data = {
                    "allergies": ["Penicillin", "Shellfish"],
                    "conditions": ["ADHD", "Anxiety"],
                    "emergency_contacts": [{"name": "Mom", "phone": "555-0100", "relationship": "Mother"}],
                    "doctor_name": "Dr. Smith",
                    "doctor_phone": "555-0200",
                    "doctor_specialty": "Psychiatrist",
                    "hospital_name": "City Hospital",
                    "hospital_address": "123 Main St",
                    "hospital_phone": "555-0300",
                    "blood_type": "A+",
                    "insurance_info": "Blue Cross #12345"
                }
                
                for key, expected_value in expected_data.items():
                    if profile.get(key) != expected_value:
                        self.log(f"❌ {key} not persisted correctly: expected {expected_value}, got {profile.get(key)}", "ERROR")
                        return False
                
                self.log("✅ All medical profile data persisted correctly")
                self.log("   📄 Allergies: " + ", ".join(profile["allergies"]))
                self.log("   📄 Conditions: " + ", ".join(profile["conditions"]))
                self.log(f"   📄 Emergency Contact: {profile['emergency_contacts'][0]['name']} ({profile['emergency_contacts'][0]['relationship']})")
                self.log(f"   📄 Doctor: {profile['doctor_name']} - {profile['doctor_specialty']}")
                self.log(f"   📄 Hospital: {profile['hospital_name']}")
                self.log(f"   📄 Blood Type: {profile['blood_type']}")
                
                return True
            else:
                self.log(f"❌ Failed to get complete profile: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting complete profile: {str(e)}", "ERROR")
            return False
    
    def test_delete_medication(self):
        """Test deleting the created medication"""
        self.log("🗑️ Testing medication deletion...")
        
        if not self.created_medication_id:
            self.log("❌ No medication ID to delete", "ERROR")
            return False
        
        try:
            response = self.session.delete(f"{BASE_URL}/medications/{self.created_medication_id}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Medication deleted successfully")
                
                # Verify deletion by trying to retrieve medications
                get_response = self.session.get(f"{BASE_URL}/medications")
                if get_response.status_code == 200:
                    medications = get_response.json()
                    medication_ids = [med.get("med_id") for med in medications]
                    
                    if self.created_medication_id not in medication_ids:
                        self.log("✅ Medication successfully removed from database")
                        return True
                    else:
                        self.log("❌ Medication still exists after deletion", "ERROR")
                        return False
                else:
                    self.log("⚠️ Could not verify deletion", "WARNING")
                    return True  # Assume success since delete returned 200
            else:
                self.log(f"❌ Failed to delete medication: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error deleting medication: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run the complete test suite"""
        self.log("🚀 Starting Enhanced Medication Tracker and Medical Profile Test Suite")
        self.log("=" * 80)
        
        # Test results tracking
        test_results = {}
        
        # 1. Authentication
        test_results['authentication'] = self.login()
        if not test_results['authentication']:
            self.log("❌ Authentication failed - cannot proceed with tests", "ERROR")
            return test_results
        
        # 2. Create enhanced medication
        test_results['create_enhanced_medication'] = self.test_create_enhanced_medication()
        
        # 3. Get medications with new fields
        test_results['get_medications_new_fields'] = self.test_get_medications_with_new_fields()
        
        # 4. Get default medical profile
        test_results['get_default_medical_profile'] = self.test_get_default_medical_profile()
        
        # 5. Update profile with allergies
        test_results['update_profile_allergies'] = self.test_update_profile_allergies()
        
        # 6. Update profile with conditions
        test_results['update_profile_conditions'] = self.test_update_profile_conditions()
        
        # 7. Update profile with emergency contacts
        test_results['update_profile_emergency_contacts'] = self.test_update_profile_emergency_contacts()
        
        # 8. Update profile with doctor/hospital info
        test_results['update_profile_doctor_hospital'] = self.test_update_profile_doctor_hospital_info()
        
        # 9. Get complete medical profile
        test_results['get_complete_medical_profile'] = self.test_get_complete_medical_profile()
        
        # 10. Delete medication
        test_results['delete_medication'] = self.test_delete_medication()
        
        # Summary
        self.log("=" * 80)
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
            self.log("🎉 ALL TESTS PASSED - Enhanced Medication Tracker and Medical Profile features are working correctly!")
        else:
            self.log("⚠️ Some tests failed - see details above")
        
        return test_results

def main():
    """Main test execution"""
    tester = EnhancedMedicationTest()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()