#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta
import os
import sys
import time
from dotenv import load_dotenv
import random

# Load environment variables from frontend/.env
load_dotenv("/app/frontend/.env")

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BACKEND_URL:
    print("Error: REACT_APP_BACKEND_URL not found in environment variables")
    sys.exit(1)

# Ensure the URL ends with /api
API_URL = f"{BACKEND_URL}/api"
print(f"Testing API at: {API_URL}")

# Test data
test_user = {
    "name": "Test Student",
    "email": "test.student@school.edu",
    "year_level": 10,
    "subjects": ["Math", "Science", "English", "History", "Physical Education"]
}

test_task = {
    "title": "Math Assignment",
    "description": "Complete algebra problems 1-20",
    "subject": "Math",
    "task_type": "assignment",
    "priority": "high",
    "due_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
    "estimated_duration": 60,
    "color": "#6366f1"
}

test_activity = {
    "title": "Basketball Practice",
    "description": "Weekly team practice",
    "activity_type": "sports",
    "start_datetime": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    "end_datetime": (datetime.utcnow() + timedelta(days=1, hours=2)).isoformat(),
    "location": "School Gym",
    "color": "#10b981"
}

# Helper functions
def print_test_result(test_name, success, response=None, error=None):
    if success:
        print(f"✅ {test_name}: PASSED")
        if response:
            try:
                print(f"   Response: {json.dumps(response.json(), indent=2)[:200]}...")
            except:
                print(f"   Response status: {response.status_code}")
    else:
        print(f"❌ {test_name}: FAILED")
        if error:
            print(f"   Error: {error}")
        if response:
            try:
                print(f"   Response: {response.text[:200]}...")
            except:
                print(f"   Response status: {response.status_code}")

def run_test(test_func):
    try:
        return test_func()
    except Exception as e:
        return False, None, str(e)

# Test functions
def test_root_endpoint():
    try:
        response = requests.get(f"{API_URL}/")
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_create_user():
    try:
        response = requests.post(f"{API_URL}/users", json=test_user)
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)
        
def test_create_user_with_custom_id():
    try:
        custom_user = test_user.copy()
        custom_user["name"] = "Custom ID User"
        custom_user["email"] = "custom.id@school.edu"
        custom_user["id"] = f"custom-{random.randint(1000, 9999)}"
        response = requests.post(f"{API_URL}/users", json=custom_user)
        success = response.status_code == 200 and response.json()["id"] == custom_user["id"]
        return success, response, None
    except Exception as e:
        return False, None, str(e)
        
def test_get_all_users():
    try:
        response = requests.get(f"{API_URL}/users")
        success = response.status_code == 200 and isinstance(response.json(), list)
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_get_user(user_id):
    try:
        response = requests.get(f"{API_URL}/users/{user_id}")
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_update_user(user_id):
    try:
        update_data = {
            "name": "Updated Student Name",
            "year_level": 11,
            "theme": "dark"
        }
        response = requests.put(f"{API_URL}/users/{user_id}", json=update_data)
        success = response.status_code == 200 and response.json()["name"] == update_data["name"]
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_invalid_user_year():
    try:
        invalid_user = test_user.copy()
        invalid_user["year_level"] = 13  # Invalid year level (should be 9-12)
        response = requests.post(f"{API_URL}/users", json=invalid_user)
        # Should fail with 422 Unprocessable Entity
        success = response.status_code == 422
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_create_task(user_id):
    try:
        task_data = test_task.copy()
        response = requests.post(f"{API_URL}/users/{user_id}/tasks", json=task_data)
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_get_tasks(user_id):
    try:
        response = requests.get(f"{API_URL}/users/{user_id}/tasks")
        success = response.status_code == 200 and isinstance(response.json(), list)
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_get_task(task_id):
    try:
        response = requests.get(f"{API_URL}/tasks/{task_id}")
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_update_task(task_id):
    try:
        update_data = {
            "title": "Updated Math Assignment",
            "priority": "medium",
            "completed": True
        }
        response = requests.put(f"{API_URL}/tasks/{task_id}", json=update_data)
        success = (response.status_code == 200 and 
                  response.json()["title"] == update_data["title"] and
                  response.json()["completed"] == True and
                  response.json()["completed_at"] is not None)
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_delete_task(task_id):
    try:
        response = requests.delete(f"{API_URL}/tasks/{task_id}")
        success = response.status_code == 200
        
        # Verify task is deleted
        verify_response = requests.get(f"{API_URL}/tasks/{task_id}")
        success = success and verify_response.status_code == 404
        
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_create_activity(user_id):
    try:
        activity_data = test_activity.copy()
        response = requests.post(f"{API_URL}/users/{user_id}/activities", json=activity_data)
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_get_activities(user_id):
    try:
        response = requests.get(f"{API_URL}/users/{user_id}/activities")
        success = response.status_code == 200 and isinstance(response.json(), list)
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_get_activity(activity_id):
    try:
        response = requests.get(f"{API_URL}/activities/{activity_id}")
        success = response.status_code == 200
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_update_activity(activity_id):
    try:
        update_data = {
            "title": "Updated Basketball Practice",
            "location": "Main Gym"
        }
        response = requests.put(f"{API_URL}/activities/{activity_id}", json=update_data)
        success = (response.status_code == 200 and 
                  response.json()["title"] == update_data["title"] and
                  response.json()["location"] == update_data["location"])
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_delete_activity(activity_id):
    try:
        response = requests.delete(f"{API_URL}/activities/{activity_id}")
        success = response.status_code == 200
        
        # Verify activity is deleted
        verify_response = requests.get(f"{API_URL}/activities/{activity_id}")
        success = success and verify_response.status_code == 404
        
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_calendar_endpoint(user_id):
    try:
        # Get calendar data for next 30 days
        start_date = datetime.utcnow().isoformat()
        end_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        response = requests.get(
            f"{API_URL}/users/{user_id}/calendar",
            params={"start_date": start_date, "end_date": end_date}
        )
        
        success = (response.status_code == 200 and 
                  "tasks" in response.json() and 
                  "activities" in response.json())
        
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def test_stats_endpoint(user_id):
    try:
        response = requests.get(f"{API_URL}/users/{user_id}/stats")
        
        success = (response.status_code == 200 and 
                  "total_tasks" in response.json() and 
                  "completed_tasks" in response.json() and
                  "pending_tasks" in response.json() and
                  "overdue_tasks" in response.json() and
                  "upcoming_tasks" in response.json() and
                  "total_activities" in response.json())
        
        return success, response, None
    except Exception as e:
        return False, None, str(e)

def run_all_tests():
    print("\n=== TESTING STUDENT TIME MANAGEMENT API ===\n")
    
    # Test root endpoint
    print("\n--- Testing Core API Health ---")
    success, response, error = run_test(test_root_endpoint)
    print_test_result("Root endpoint", success, response, error)
    
    # Test user management
    print("\n--- Testing User Management ---")
    success, response, error = run_test(test_create_user)
    print_test_result("Create user", success, response, error)
    
    if success:
        user_id = response.json()["id"]
        print(f"Created test user with ID: {user_id}")
        
        success, response, error = run_test(lambda: test_get_user(user_id))
        print_test_result("Get user", success, response, error)
        
        success, response, error = run_test(lambda: test_update_user(user_id))
        print_test_result("Update user", success, response, error)
        
        success, response, error = run_test(test_invalid_user_year)
        print_test_result("Validate user year level", success, response, error)
        
        # Test task management
        print("\n--- Testing Task Management ---")
        success, response, error = run_test(lambda: test_create_task(user_id))
        print_test_result("Create task", success, response, error)
        
        if success:
            task_id = response.json()["id"]
            print(f"Created test task with ID: {task_id}")
            
            success, response, error = run_test(lambda: test_get_tasks(user_id))
            print_test_result("Get user tasks", success, response, error)
            
            success, response, error = run_test(lambda: test_get_task(task_id))
            print_test_result("Get task by ID", success, response, error)
            
            success, response, error = run_test(lambda: test_update_task(task_id))
            print_test_result("Update task", success, response, error)
            
            # Create another task for testing calendar and stats
            another_task = test_task.copy()
            another_task["title"] = "Science Project"
            another_task["subject"] = "Science"
            another_task["task_type"] = "project"
            another_task["priority"] = "medium"
            another_task["due_date"] = (datetime.utcnow() + timedelta(days=5)).isoformat()
            
            requests.post(f"{API_URL}/users/{user_id}/tasks", json=another_task)
            
            # Test activity management
            print("\n--- Testing Activity Management ---")
            success, response, error = run_test(lambda: test_create_activity(user_id))
            print_test_result("Create activity", success, response, error)
            
            if success:
                activity_id = response.json()["id"]
                print(f"Created test activity with ID: {activity_id}")
                
                success, response, error = run_test(lambda: test_get_activities(user_id))
                print_test_result("Get user activities", success, response, error)
                
                success, response, error = run_test(lambda: test_get_activity(activity_id))
                print_test_result("Get activity by ID", success, response, error)
                
                success, response, error = run_test(lambda: test_update_activity(activity_id))
                print_test_result("Update activity", success, response, error)
                
                # Create another activity for testing calendar and stats
                another_activity = test_activity.copy()
                another_activity["title"] = "Chess Club Meeting"
                another_activity["activity_type"] = "club"
                another_activity["start_datetime"] = (datetime.utcnow() + timedelta(days=2)).isoformat()
                another_activity["end_datetime"] = (datetime.utcnow() + timedelta(days=2, hours=1)).isoformat()
                
                requests.post(f"{API_URL}/users/{user_id}/activities", json=another_activity)
                
                # Test calendar integration
                print("\n--- Testing Calendar Integration ---")
                success, response, error = run_test(lambda: test_calendar_endpoint(user_id))
                print_test_result("Calendar data aggregation", success, response, error)
                
                # Test statistics endpoint
                print("\n--- Testing Statistics Endpoint ---")
                success, response, error = run_test(lambda: test_stats_endpoint(user_id))
                print_test_result("Dashboard statistics", success, response, error)
                
                # Clean up - delete activity
                success, response, error = run_test(lambda: test_delete_activity(activity_id))
                print_test_result("Delete activity", success, response, error)
            
            # Clean up - delete task
            success, response, error = run_test(lambda: test_delete_task(task_id))
            print_test_result("Delete task", success, response, error)
    
    print("\n=== TEST SUMMARY ===")
    print("All tests completed. Check results above for details.")

if __name__ == "__main__":
    run_all_tests()
