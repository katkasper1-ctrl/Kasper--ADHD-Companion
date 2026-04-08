from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class Task(BaseModel):
    task_id: str
    user_id: str
    title: str
    description: Optional[str] = ""
    priority: str = "medium"  # low, medium, high
    ai_priority_score: Optional[float] = None
    due_date: Optional[datetime] = None
    completed: bool = False
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None

class Habit(BaseModel):
    habit_id: str
    user_id: str
    name: str
    color: str = "#4A90E2"
    frequency: str = "daily"  # daily, weekly
    target_days: Optional[List[str]] = []  # for weekly: ["mon", "wed", "fri"]
    current_streak: int = 0
    best_streak: int = 0
    check_ins: List[datetime] = []
    created_at: datetime

class HabitCreate(BaseModel):
    name: str
    color: Optional[str] = "#4A90E2"
    frequency: Optional[str] = "daily"
    target_days: Optional[List[str]] = []

class Medication(BaseModel):
    med_id: str
    user_id: str
    name: str
    dosage: str
    frequency: Optional[str] = ""  # daily, twice daily, as needed, etc.
    instructions: Optional[str] = ""  # take with food, before bed, etc.
    times: List[str]  # ["08:00", "14:00"]
    reminders: bool = True
    created_at: datetime

class MedicationCreate(BaseModel):
    name: str
    dosage: str
    frequency: Optional[str] = ""
    instructions: Optional[str] = ""
    times: List[str]
    reminders: Optional[bool] = True

class FocusSession(BaseModel):
    session_id: str
    user_id: str
    duration_minutes: int
    completed: bool = False
    task_id: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

class FocusSessionCreate(BaseModel):
    duration_minutes: int = 25
    task_id: Optional[str] = None

class Expense(BaseModel):
    expense_id: str
    user_id: str
    type: str  # "expense" or "bill"
    amount: float
    category: str
    description: str
    due_date: Optional[datetime] = None
    paid: bool = False
    photo: Optional[str] = None  # base64 image of bill/receipt
    created_at: datetime

class ExpenseCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: str
    due_date: Optional[datetime] = None
    paid: Optional[bool] = False
    photo: Optional[str] = None  # base64 image

class Event(BaseModel):
    event_id: str
    user_id: str
    title: str
    date: datetime
    time: Optional[str] = None
    reminder: bool = True
    created_at: datetime

class EventCreate(BaseModel):
    title: str
    date: datetime
    time: Optional[str] = None
    reminder: Optional[bool] = True

class Birthday(BaseModel):
    birthday_id: str
    user_id: str
    name: str
    date: str  # MM-DD format
    reminder_days_before: int = 3
    created_at: datetime

class BirthdayCreate(BaseModel):
    name: str
    date: str  # MM-DD format
    reminder_days_before: Optional[int] = 3

class Routine(BaseModel):
    routine_id: str
    user_id: str
    name: str
    time: str  # "07:00"
    steps: List[str]
    days: List[str]  # ["mon", "tue", "wed", "thu", "fri"]
    active: bool = True
    created_at: datetime

class RoutineCreate(BaseModel):
    name: str
    time: str
    steps: List[str]
    days: List[str]
    active: Optional[bool] = True

class HydrationLog(BaseModel):
    hydration_id: str
    user_id: str
    amount_ml: int
    timestamp: datetime
    date: str  # YYYY-MM-DD for daily aggregation

class HydrationLogCreate(BaseModel):
    amount_ml: int

class HydrationGoal(BaseModel):
    goal_id: str
    user_id: str
    daily_goal_ml: int
    created_at: datetime

class HydrationGoalCreate(BaseModel):
    daily_goal_ml: int

class Exercise(BaseModel):
    exercise_id: str
    user_id: str
    type: str  # Walking, Running, Cycling, Yoga, etc.
    duration_minutes: int
    intensity: str  # light, moderate, intense
    calories: Optional[int] = None
    timestamp: datetime
    date: str  # YYYY-MM-DD
    notes: Optional[str] = ""

class ExerciseCreate(BaseModel):
    type: str
    duration_minutes: int
    intensity: str = "moderate"
    calories: Optional[int] = None
    notes: Optional[str] = ""

class Mood(BaseModel):
    mood_id: str
    user_id: str
    mood: str  # Happy, Sad, Anxious, Calm, etc.
    emoji: str  # 😊, 😢, 😰, 😌, etc.
    intensity: int  # 1-5 scale
    notes: Optional[str] = ""
    timestamp: datetime
    date: str  # YYYY-MM-DD

class MoodCreate(BaseModel):
    mood: str
    emoji: str
    intensity: int = 3
    notes: Optional[str] = ""

class Course(BaseModel):
    course_id: str
    user_id: str
    name: str
    color: str = "#4A90E2"
    instructor: Optional[str] = ""
    schedule: Optional[str] = ""
    created_at: datetime

class CourseCreate(BaseModel):
    name: str
    color: Optional[str] = "#4A90E2"
    instructor: Optional[str] = ""
    schedule: Optional[str] = ""

class Assignment(BaseModel):
    assignment_id: str
    user_id: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    title: str
    description: Optional[str] = ""
    due_date: datetime
    priority: str = "medium"
    completed: bool = False
    grade: Optional[str] = None
    created_at: datetime

class AssignmentCreate(BaseModel):
    course_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    due_date: datetime
    priority: Optional[str] = "medium"

class StudySession(BaseModel):
    study_session_id: str
    user_id: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    duration_minutes: int
    topic: str
    notes: Optional[str] = ""
    timestamp: datetime
    date: str

class StudySessionCreate(BaseModel):
    course_id: Optional[str] = None
    duration_minutes: int
    topic: str
    notes: Optional[str] = ""

class Note(BaseModel):
    note_id: str
    user_id: str
    title: str
    content: str
    color: str = "#FFD700"
    pinned: bool = False
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime

class NoteCreate(BaseModel):
    title: str
    content: str
    color: Optional[str] = "#FFD700"
    pinned: Optional[bool] = False
    tags: Optional[List[str]] = []

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    pinned: Optional[bool] = None
    tags: Optional[List[str]] = None

class Chore(BaseModel):
    chore_id: str
    user_id: str
    name: str
    description: Optional[str] = ""
    frequency: str = "weekly"  # daily, weekly, monthly
    days: List[str] = []  # for weekly: ["mon", "wed", "fri"]
    room: Optional[str] = ""
    completed_dates: List[datetime] = []
    last_completed: Optional[datetime] = None
    current_streak: int = 0
    created_at: datetime

class ChoreCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    frequency: str = "weekly"
    days: Optional[List[str]] = []
    room: Optional[str] = ""

class Sleep(BaseModel):
    sleep_id: str
    user_id: str
    bedtime: datetime
    wake_time: datetime
    duration_hours: float
    quality: int  # 1-5 rating
    notes: Optional[str] = ""
    felt_rested: bool = False
    date: str  # YYYY-MM-DD
    created_at: datetime

class SleepCreate(BaseModel):
    bedtime: datetime
    wake_time: datetime
    quality: int
    notes: Optional[str] = ""
    felt_rested: Optional[bool] = False

class SleepGoal(BaseModel):
    sleep_goal_id: str
    user_id: str
    target_bedtime: str  # "22:00"
    target_wake_time: str  # "06:00"
    target_hours: float
    created_at: datetime

class SleepGoalCreate(BaseModel):
    target_bedtime: str
    target_wake_time: str
    target_hours: float

# ============= HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None) -> str:
    """Get user from session_token cookie or Authorization header"""
    token = None
    
    # Try cookie first
    if request:
        token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        else:
            token = authorization
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except:
        pass
    
    # Check if it's a session token from Google OAuth
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    return session_doc["user_id"]

async def get_ai_suggestion(prompt: str, context: str = "") -> str:
    """Get AI suggestion using Emergent LLM"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"adhd_ai_{uuid.uuid4().hex[:8]}",
            system_message="You are a helpful AI assistant for people with ADHD. Provide concise, encouraging, and practical advice. Keep responses brief and actionable."
        ).with_model("openai", "gpt-5.2")
        
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        response = await chat.send_message(UserMessage(text=full_prompt))
        return response
    except Exception as e:
        logger.error(f"AI suggestion error: {e}")
        return "Stay focused! You've got this! 💪"

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register with email and password"""
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user)
    
    token = create_jwt_token(user_id)
    return {"token": token, "user": User(**{k: v for k, v in user.items() if k != "password_hash"})}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email and password"""
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc["user_id"])
    return {"token": token, "user": User(**{k: v for k, v in user_doc.items() if k != "password_hash"})}

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id from Google OAuth for user data"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent Auth API
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session_data = auth_response.json()
    except Exception as e:
        logger.error(f"Auth API error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")
    
    # Get or create user
    user_doc = await db.users.find_one({"email": session_data["email"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": session_data["email"],
            "name": session_data["name"],
            "picture": session_data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    else:
        # Update existing user
        user_id = user_doc["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": session_data["name"],
                "picture": session_data.get("picture")
            }}
        )
        user_doc["name"] = session_data["name"]
        user_doc["picture"] = session_data.get("picture")
    
    # Create session
    session_token = session_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return User(**{k: v for k, v in user_doc.items() if k != "password_hash" and k != "_id"})

@api_router.get("/auth/me")
async def get_me(user_id: str = Header(None, alias="user_id"), authorization: Optional[str] = Header(None), request: Request = None):
    """Get current user info"""
    if not user_id:
        user_id = await get_current_user(authorization, request)
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

@api_router.post("/auth/logout")
async def logout(response: Response, authorization: Optional[str] = Header(None), request: Request = None):
    """Logout user"""
    try:
        user_id = await get_current_user(authorization, request)
        
        # Get token
        token = request.cookies.get("session_token") if request else None
        if token:
            await db.user_sessions.delete_many({"session_token": token})
        
        # Clear cookie
        response.delete_cookie(key="session_token", path="/")
        
        return {"message": "Logged out successfully"}
    except:
        return {"message": "Logged out"}

# ============= TASK ENDPOINTS =============

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new task"""
    user_id = await get_current_user(authorization, request)
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task = {
        "task_id": task_id,
        "user_id": user_id,
        "title": task_data.title,
        "description": task_data.description or "",
        "priority": task_data.priority or "medium",
        "ai_priority_score": None,
        "due_date": task_data.due_date,
        "completed": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.tasks.insert_one(task)
    return Task(**task)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all tasks for user"""
    user_id = await get_current_user(authorization, request)
    
    tasks = await db.tasks.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: Dict[str, Any], authorization: Optional[str] = Header(None), request: Request = None):
    """Update a task"""
    user_id = await get_current_user(authorization, request)
    
    task = await db.tasks.find_one({"task_id": task_id, "user_id": user_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.tasks.update_one(
        {"task_id": task_id, "user_id": user_id},
        {"$set": task_data}
    )
    
    updated_task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a task"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.tasks.delete_one({"task_id": task_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted"}

@api_router.post("/tasks/prioritize")
async def prioritize_tasks(authorization: Optional[str] = Header(None), request: Request = None):
    """Use AI to prioritize tasks"""
    user_id = await get_current_user(authorization, request)
    
    tasks = await db.tasks.find({"user_id": user_id, "completed": False}, {"_id": 0}).to_list(100)
    
    if not tasks:
        return {"message": "No tasks to prioritize"}
    
    # Create context for AI
    task_list = "\n".join([f"- {t['title']} (due: {t.get('due_date', 'no date')})" for t in tasks])
    prompt = f"Prioritize these tasks for someone with ADHD. Consider urgency, importance, and energy levels:\n{task_list}\n\nProvide a brief prioritization tip (max 2 sentences)."
    
    suggestion = await get_ai_suggestion(prompt)
    
    return {"suggestion": suggestion, "task_count": len(tasks)}

# ============= HABIT ENDPOINTS =============

@api_router.post("/habits", response_model=Habit)
async def create_habit(habit_data: HabitCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new habit"""
    user_id = await get_current_user(authorization, request)
    
    habit_id = f"habit_{uuid.uuid4().hex[:12]}"
    habit = {
        "habit_id": habit_id,
        "user_id": user_id,
        "name": habit_data.name,
        "color": habit_data.color or "#4A90E2",
        "frequency": habit_data.frequency or "daily",
        "target_days": habit_data.target_days or [],
        "current_streak": 0,
        "best_streak": 0,
        "check_ins": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.habits.insert_one(habit)
    return Habit(**habit)

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all habits for user"""
    user_id = await get_current_user(authorization, request)
    
    habits = await db.habits.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [Habit(**habit) for habit in habits]

@api_router.post("/habits/{habit_id}/checkin")
async def check_in_habit(habit_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Check in a habit"""
    user_id = await get_current_user(authorization, request)
    
    habit = await db.habits.find_one({"habit_id": habit_id, "user_id": user_id}, {"_id": 0})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check if already checked in today
    check_ins = habit.get("check_ins", [])
    today_checkins = [c for c in check_ins if isinstance(c, datetime) and c >= today_start]
    
    if today_checkins:
        return {"message": "Already checked in today", "habit": Habit(**habit)}
    
    # Add check-in
    check_ins.append(now)
    
    # Calculate streak
    current_streak = 1
    check_date = today_start
    sorted_checkins = sorted([c for c in check_ins if isinstance(c, datetime)], reverse=True)
    
    for i in range(len(sorted_checkins) - 1):
        prev_day = check_date - timedelta(days=1)
        prev_day_checkins = [c for c in sorted_checkins if c.date() == prev_day.date()]
        if prev_day_checkins:
            current_streak += 1
            check_date = prev_day
        else:
            break
    
    best_streak = max(habit.get("best_streak", 0), current_streak)
    
    await db.habits.update_one(
        {"habit_id": habit_id},
        {"$set": {
            "check_ins": check_ins,
            "current_streak": current_streak,
            "best_streak": best_streak
        }}
    )
    
    updated_habit = await db.habits.find_one({"habit_id": habit_id}, {"_id": 0})
    return {"message": "Checked in!", "habit": Habit(**updated_habit)}

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a habit"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.habits.delete_one({"habit_id": habit_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    return {"message": "Habit deleted"}

# ============= MEDICATION ENDPOINTS =============

@api_router.post("/medications", response_model=Medication)
async def create_medication(med_data: MedicationCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new medication"""
    user_id = await get_current_user(authorization, request)
    
    med_id = f"med_{uuid.uuid4().hex[:12]}"
    medication = {
        "med_id": med_id,
        "user_id": user_id,
        "name": med_data.name,
        "dosage": med_data.dosage,
        "frequency": med_data.frequency or "",
        "instructions": med_data.instructions or "",
        "times": med_data.times,
        "reminders": med_data.reminders if med_data.reminders is not None else True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.medications.insert_one(medication)
    return Medication(**medication)

@api_router.get("/medications", response_model=List[Medication])
async def get_medications(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all medications for user"""
    user_id = await get_current_user(authorization, request)
    
    medications = await db.medications.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [Medication(**med) for med in medications]

@api_router.delete("/medications/{med_id}")
async def delete_medication(med_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a medication"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.medications.delete_one({"med_id": med_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return {"message": "Medication deleted"}

# ============= MEDICAL PROFILE ENDPOINTS =============

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = ""

class MedicalProfileUpdate(BaseModel):
    allergies: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    emergency_contacts: Optional[List[Dict[str, str]]] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    hospital_phone: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None
    doctor_specialty: Optional[str] = None
    blood_type: Optional[str] = None
    insurance_info: Optional[str] = None

@api_router.get("/medical-profile")
async def get_medical_profile(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's medical profile"""
    user_id = await get_current_user(authorization, request)
    profile = await db.medical_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        # Return default empty profile
        return {
            "user_id": user_id,
            "allergies": [],
            "conditions": [],
            "emergency_contacts": [],
            "hospital_name": "",
            "hospital_address": "",
            "hospital_phone": "",
            "doctor_name": "",
            "doctor_phone": "",
            "doctor_specialty": "",
            "blood_type": "",
            "insurance_info": ""
        }
    return profile

@api_router.put("/medical-profile")
async def update_medical_profile(data: MedicalProfileUpdate, authorization: Optional[str] = Header(None), request: Request = None):
    """Update user's medical profile (upsert)"""
    user_id = await get_current_user(authorization, request)
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["user_id"] = user_id
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.medical_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    profile = await db.medical_profiles.find_one({"user_id": user_id}, {"_id": 0})
    return profile

# ============= FOCUS SESSION ENDPOINTS =============

@api_router.post("/focus/start", response_model=FocusSession)
async def start_focus_session(session_data: FocusSessionCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Start a new focus session"""
    user_id = await get_current_user(authorization, request)
    
    session_id = f"focus_{uuid.uuid4().hex[:12]}"
    session = {
        "session_id": session_id,
        "user_id": user_id,
        "duration_minutes": session_data.duration_minutes,
        "completed": False,
        "task_id": session_data.task_id,
        "started_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    
    await db.focus_sessions.insert_one(session)
    return FocusSession(**session)

@api_router.post("/focus/{session_id}/complete")
async def complete_focus_session(session_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Complete a focus session"""
    user_id = await get_current_user(authorization, request)
    
    session = await db.focus_sessions.find_one({"session_id": session_id, "user_id": user_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.focus_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "completed": True,
            "completed_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_session = await db.focus_sessions.find_one({"session_id": session_id}, {"_id": 0})
    return {"message": "Session completed!", "session": FocusSession(**updated_session)}

@api_router.get("/focus/stats")
async def get_focus_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get focus session statistics"""
    user_id = await get_current_user(authorization, request)
    
    sessions = await db.focus_sessions.find({"user_id": user_id, "completed": True}, {"_id": 0}).to_list(1000)
    
    total_sessions = len(sessions)
    total_minutes = sum(s["duration_minutes"] for s in sessions)
    
    return {
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "total_hours": round(total_minutes / 60, 1)
    }

# ============= EXPENSE/MONEY ENDPOINTS =============

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new expense or bill"""
    user_id = await get_current_user(authorization, request)
    
    expense_id = f"exp_{uuid.uuid4().hex[:12]}"
    expense = {
        "expense_id": expense_id,
        "user_id": user_id,
        "type": expense_data.type,
        "amount": expense_data.amount,
        "category": expense_data.category,
        "description": expense_data.description,
        "due_date": expense_data.due_date,
        "paid": expense_data.paid if expense_data.paid is not None else False,
        "photo": expense_data.photo,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.expenses.insert_one(expense)
    return Expense(**expense)

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all expenses for user"""
    user_id = await get_current_user(authorization, request)
    
    expenses = await db.expenses.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Expense(**exp) for exp in expenses]

@api_router.get("/expenses/summary")
async def get_expense_summary(authorization: Optional[str] = Header(None), request: Request = None):
    """Get expense summary"""
    user_id = await get_current_user(authorization, request)
    
    # Get this month's expenses
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    expenses = await db.expenses.find(
        {"user_id": user_id, "created_at": {"$gte": month_start}},
        {"_id": 0}
    ).to_list(1000)
    
    total_spent = sum(e["amount"] for e in expenses if e["type"] == "expense")
    unpaid_bills = sum(e["amount"] for e in expenses if e["type"] == "bill" and not e["paid"])
    
    return {
        "total_spent": total_spent,
        "unpaid_bills": unpaid_bills,
        "expense_count": len([e for e in expenses if e["type"] == "expense"]),
        "bill_count": len([e for e in expenses if e["type"] == "bill"])
    }

@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, expense_data: Dict[str, Any], authorization: Optional[str] = Header(None), request: Request = None):
    """Update an expense"""
    user_id = await get_current_user(authorization, request)
    
    expense = await db.expenses.find_one({"expense_id": expense_id, "user_id": user_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    await db.expenses.update_one(
        {"expense_id": expense_id},
        {"$set": expense_data}
    )
    
    updated_expense = await db.expenses.find_one({"expense_id": expense_id}, {"_id": 0})
    return Expense(**updated_expense)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete an expense"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.expenses.delete_one({"expense_id": expense_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense deleted"}

# ============= BILL STATEMENTS ENDPOINTS =============

class StatementCreate(BaseModel):
    title: str
    statement_type: str = "bill"  # bill, bank_statement, invoice
    amount: Optional[float] = None
    due_date: Optional[str] = None  # YYYY-MM-DD
    photo: Optional[str] = None  # base64 image
    notes: Optional[str] = ""
    status: Optional[str] = "pending"  # pending, paid, overdue

@api_router.post("/expenses/statements")
async def create_statement(data: StatementCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Upload a bill or bank statement with photo"""
    user_id = await get_current_user(authorization, request)
    statement = {
        "statement_id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": data.title,
        "statement_type": data.statement_type,
        "amount": data.amount,
        "due_date": data.due_date,
        "photo": data.photo,
        "notes": data.notes,
        "status": data.status or "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bill_statements.insert_one(statement)
    statement.pop("_id", None)
    return statement

@api_router.get("/expenses/statements")
async def get_statements(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all bill statements for user"""
    user_id = await get_current_user(authorization, request)
    statements = await db.bill_statements.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return statements

@api_router.put("/expenses/statements/{statement_id}")
async def update_statement(statement_id: str, updates: Dict[str, Any], authorization: Optional[str] = Header(None), request: Request = None):
    """Update a statement (mark as paid, etc.)"""
    user_id = await get_current_user(authorization, request)
    allowed = {"title", "amount", "due_date", "notes", "status", "photo"}
    update_data = {k: v for k, v in updates.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields")
    result = await db.bill_statements.update_one(
        {"statement_id": statement_id, "user_id": user_id}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Statement not found")
    updated = await db.bill_statements.find_one({"statement_id": statement_id}, {"_id": 0})
    return updated

@api_router.delete("/expenses/statements/{statement_id}")
async def delete_statement(statement_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a statement"""
    user_id = await get_current_user(authorization, request)
    result = await db.bill_statements.delete_one({"statement_id": statement_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Statement not found")
    return {"message": "Statement deleted"}

# ============= EVENT ENDPOINTS =============

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new event"""
    user_id = await get_current_user(authorization, request)
    
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    event = {
        "event_id": event_id,
        "user_id": user_id,
        "title": event_data.title,
        "date": event_data.date,
        "time": event_data.time,
        "reminder": event_data.reminder if event_data.reminder is not None else True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.events.insert_one(event)
    return Event(**event)

@api_router.get("/events", response_model=List[Event])
async def get_events(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all events for user"""
    user_id = await get_current_user(authorization, request)
    
    events = await db.events.find({"user_id": user_id}, {"_id": 0}).sort("date", 1).to_list(1000)
    return [Event(**evt) for evt in events]

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete an event"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.events.delete_one({"event_id": event_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted"}

# ============= BIRTHDAY ENDPOINTS =============

@api_router.post("/birthdays", response_model=Birthday)
async def create_birthday(birthday_data: BirthdayCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new birthday"""
    user_id = await get_current_user(authorization, request)
    
    birthday_id = f"bday_{uuid.uuid4().hex[:12]}"
    birthday = {
        "birthday_id": birthday_id,
        "user_id": user_id,
        "name": birthday_data.name,
        "date": birthday_data.date,
        "reminder_days_before": birthday_data.reminder_days_before if birthday_data.reminder_days_before is not None else 3,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.birthdays.insert_one(birthday)
    return Birthday(**birthday)

@api_router.get("/birthdays", response_model=List[Birthday])
async def get_birthdays(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all birthdays for user"""
    user_id = await get_current_user(authorization, request)
    
    birthdays = await db.birthdays.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [Birthday(**bday) for bday in birthdays]

@api_router.delete("/birthdays/{birthday_id}")
async def delete_birthday(birthday_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a birthday"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.birthdays.delete_one({"birthday_id": birthday_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Birthday not found")
    
    return {"message": "Birthday deleted"}

# ============= ROUTINE ENDPOINTS =============

@api_router.post("/routines", response_model=Routine)
async def create_routine(routine_data: RoutineCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new routine"""
    user_id = await get_current_user(authorization, request)
    
    routine_id = f"rtn_{uuid.uuid4().hex[:12]}"
    routine = {
        "routine_id": routine_id,
        "user_id": user_id,
        "name": routine_data.name,
        "time": routine_data.time,
        "steps": routine_data.steps,
        "days": routine_data.days,
        "active": routine_data.active if routine_data.active is not None else True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.routines.insert_one(routine)
    return Routine(**routine)

@api_router.get("/routines", response_model=List[Routine])
async def get_routines(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all routines for user"""
    user_id = await get_current_user(authorization, request)
    
    routines = await db.routines.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [Routine(**rtn) for rtn in routines]

@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a routine"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.routines.delete_one({"routine_id": routine_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    return {"message": "Routine deleted"}

# ============= HYDRATION ENDPOINTS =============

@api_router.post("/hydration/log", response_model=HydrationLog)
async def log_hydration(log_data: HydrationLogCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log water intake"""
    user_id = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    hydration_id = f"hydrate_{uuid.uuid4().hex[:12]}"
    log = {
        "hydration_id": hydration_id,
        "user_id": user_id,
        "amount_ml": log_data.amount_ml,
        "timestamp": now,
        "date": now.strftime("%Y-%m-%d")
    }
    
    await db.hydration_logs.insert_one(log)
    return HydrationLog(**log)

@api_router.get("/hydration/today")
async def get_today_hydration(authorization: Optional[str] = Header(None), request: Request = None):
    """Get today's hydration total and logs"""
    user_id = await get_current_user(authorization, request)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    logs = await db.hydration_logs.find(
        {"user_id": user_id, "date": today},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(1000)
    
    total_ml = sum(log["amount_ml"] for log in logs)
    
    # Get user's goal
    goal_doc = await db.hydration_goals.find_one({"user_id": user_id}, {"_id": 0})
    daily_goal_ml = goal_doc["daily_goal_ml"] if goal_doc else 2000  # Default 2L
    
    return {
        "total_ml": total_ml,
        "daily_goal_ml": daily_goal_ml,
        "percentage": min(100, int((total_ml / daily_goal_ml) * 100)),
        "logs": [HydrationLog(**log) for log in logs]
    }

@api_router.get("/hydration/stats")
async def get_hydration_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get hydration statistics"""
    user_id = await get_current_user(authorization, request)
    
    # Get last 7 days
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    
    logs = await db.hydration_logs.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate daily totals
    daily_totals = {}
    for log in logs:
        date = log["date"]
        daily_totals[date] = daily_totals.get(date, 0) + log["amount_ml"]
    
    # Get average
    avg_ml = int(sum(daily_totals.values()) / 7) if daily_totals else 0
    
    return {
        "last_7_days": daily_totals,
        "average_ml": avg_ml,
        "total_logs": len(logs)
    }

@api_router.post("/hydration/goal", response_model=HydrationGoal)
async def set_hydration_goal(goal_data: HydrationGoalCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Set daily hydration goal"""
    user_id = await get_current_user(authorization, request)
    
    # Check if goal exists
    existing_goal = await db.hydration_goals.find_one({"user_id": user_id}, {"_id": 0})
    
    if existing_goal:
        # Update existing goal
        await db.hydration_goals.update_one(
            {"user_id": user_id},
            {"$set": {"daily_goal_ml": goal_data.daily_goal_ml}}
        )
        existing_goal["daily_goal_ml"] = goal_data.daily_goal_ml
        return HydrationGoal(**existing_goal)
    else:
        # Create new goal
        goal_id = f"goal_{uuid.uuid4().hex[:12]}"
        goal = {
            "goal_id": goal_id,
            "user_id": user_id,
            "daily_goal_ml": goal_data.daily_goal_ml,
            "created_at": datetime.now(timezone.utc)
        }
        await db.hydration_goals.insert_one(goal)
        return HydrationGoal(**goal)

@api_router.delete("/hydration/{hydration_id}")
async def delete_hydration_log(hydration_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a hydration log"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.hydration_logs.delete_one({"hydration_id": hydration_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hydration log not found")
    
    return {"message": "Log deleted"}

# ============= EXERCISE ENDPOINTS =============

@api_router.post("/exercise/log", response_model=Exercise)
async def log_exercise(exercise_data: ExerciseCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log an exercise session"""
    user_id = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    exercise_id = f"exercise_{uuid.uuid4().hex[:12]}"
    exercise = {
        "exercise_id": exercise_id,
        "user_id": user_id,
        "type": exercise_data.type,
        "duration_minutes": exercise_data.duration_minutes,
        "intensity": exercise_data.intensity,
        "calories": exercise_data.calories,
        "timestamp": now,
        "date": now.strftime("%Y-%m-%d"),
        "notes": exercise_data.notes or ""
    }
    
    await db.exercises.insert_one(exercise)
    return Exercise(**exercise)

@api_router.get("/exercise/today")
async def get_today_exercise(authorization: Optional[str] = Header(None), request: Request = None):
    """Get today's exercise logs"""
    user_id = await get_current_user(authorization, request)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    logs = await db.exercises.find(
        {"user_id": user_id, "date": today},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(1000)
    
    total_minutes = sum(log["duration_minutes"] for log in logs)
    total_calories = sum(log.get("calories", 0) for log in logs if log.get("calories"))
    
    return {
        "total_minutes": total_minutes,
        "total_calories": total_calories,
        "session_count": len(logs),
        "logs": [Exercise(**log) for log in logs]
    }

@api_router.get("/exercise/stats")
async def get_exercise_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get exercise statistics"""
    user_id = await get_current_user(authorization, request)
    
    # Get last 7 days
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    
    logs = await db.exercises.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate daily totals
    daily_minutes = {}
    for log in logs:
        date = log["date"]
        daily_minutes[date] = daily_minutes.get(date, 0) + log["duration_minutes"]
    
    # Get average
    avg_minutes = int(sum(daily_minutes.values()) / 7) if daily_minutes else 0
    total_minutes = sum(log["duration_minutes"] for log in logs)
    total_sessions = len(logs)
    
    # Count by type
    type_counts = {}
    for log in logs:
        exercise_type = log["type"]
        type_counts[exercise_type] = type_counts.get(exercise_type, 0) + 1
    
    return {
        "last_7_days": daily_minutes,
        "average_minutes_per_day": avg_minutes,
        "total_minutes": total_minutes,
        "total_sessions": total_sessions,
        "exercise_types": type_counts
    }

@api_router.delete("/exercise/{exercise_id}")
async def delete_exercise_log(exercise_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete an exercise log"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.exercises.delete_one({"exercise_id": exercise_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exercise log not found")
    
    return {"message": "Exercise log deleted"}

# ============= MOOD TRACKER ENDPOINTS =============

@api_router.post("/mood/log", response_model=Mood)
async def log_mood(mood_data: MoodCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log current mood/feeling"""
    user_id = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    mood_id = f"mood_{uuid.uuid4().hex[:12]}"
    mood = {
        "mood_id": mood_id,
        "user_id": user_id,
        "mood": mood_data.mood,
        "emoji": mood_data.emoji,
        "intensity": mood_data.intensity,
        "notes": mood_data.notes or "",
        "timestamp": now,
        "date": now.strftime("%Y-%m-%d")
    }
    
    await db.moods.insert_one(mood)
    return Mood(**mood)

@api_router.get("/mood/today")
async def get_today_mood(authorization: Optional[str] = Header(None), request: Request = None):
    """Get today's mood logs"""
    user_id = await get_current_user(authorization, request)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    logs = await db.moods.find(
        {"user_id": user_id, "date": today},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(1000)
    
    return {
        "check_in_count": len(logs),
        "logs": [Mood(**log) for log in logs],
        "latest_mood": logs[0]["mood"] if logs else None,
        "latest_emoji": logs[0]["emoji"] if logs else None
    }

@api_router.get("/mood/stats")
async def get_mood_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get mood statistics"""
    user_id = await get_current_user(authorization, request)
    
    # Get last 7 days
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    
    logs = await db.moods.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Count moods
    mood_counts = {}
    for log in logs:
        mood = log["mood"]
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Get daily check-ins
    daily_checkins = {}
    for log in logs:
        date = log["date"]
        daily_checkins[date] = daily_checkins.get(date, 0) + 1
    
    # Get most common mood
    most_common_mood = max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else None
    most_common_emoji = None
    if most_common_mood:
        for log in logs:
            if log["mood"] == most_common_mood:
                most_common_emoji = log["emoji"]
                break
    
    return {
        "total_check_ins": len(logs),
        "mood_distribution": mood_counts,
        "daily_check_ins": daily_checkins,
        "most_common_mood": most_common_mood,
        "most_common_emoji": most_common_emoji
    }

@api_router.delete("/mood/{mood_id}")
async def delete_mood_log(mood_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a mood log"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.moods.delete_one({"mood_id": mood_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mood log not found")
    
    return {"message": "Mood log deleted"}

# ============= SCHOOL/STUDY ENDPOINTS =============

@api_router.post("/courses", response_model=Course)
async def create_course(course_data: CourseCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new course/subject"""
    user_id = await get_current_user(authorization, request)
    
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    course = {
        "course_id": course_id,
        "user_id": user_id,
        "name": course_data.name,
        "color": course_data.color or "#4A90E2",
        "instructor": course_data.instructor or "",
        "schedule": course_data.schedule or "",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.courses.insert_one(course)
    return Course(**course)

@api_router.get("/courses", response_model=List[Course])
async def get_courses(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all courses"""
    user_id = await get_current_user(authorization, request)
    
    courses = await db.courses.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [Course(**course) for course in courses]

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a course"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.courses.delete_one({"course_id": course_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return {"message": "Course deleted"}

@api_router.post("/assignments", response_model=Assignment)
async def create_assignment(assignment_data: AssignmentCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new assignment"""
    user_id = await get_current_user(authorization, request)
    
    assignment_id = f"assign_{uuid.uuid4().hex[:12]}"
    
    # Get course name if course_id provided
    course_name = None
    if assignment_data.course_id:
        course = await db.courses.find_one({"course_id": assignment_data.course_id}, {"_id": 0})
        if course:
            course_name = course["name"]
    
    assignment = {
        "assignment_id": assignment_id,
        "user_id": user_id,
        "course_id": assignment_data.course_id,
        "course_name": course_name,
        "title": assignment_data.title,
        "description": assignment_data.description or "",
        "due_date": assignment_data.due_date,
        "priority": assignment_data.priority or "medium",
        "completed": False,
        "grade": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.assignments.insert_one(assignment)
    return Assignment(**assignment)

@api_router.get("/assignments", response_model=List[Assignment])
async def get_assignments(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all assignments"""
    user_id = await get_current_user(authorization, request)
    
    assignments = await db.assignments.find({"user_id": user_id}, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return [Assignment(**assignment) for assignment in assignments]

@api_router.put("/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, assignment_data: Dict[str, Any], authorization: Optional[str] = Header(None), request: Request = None):
    """Update an assignment"""
    user_id = await get_current_user(authorization, request)
    
    assignment = await db.assignments.find_one({"assignment_id": assignment_id, "user_id": user_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    await db.assignments.update_one(
        {"assignment_id": assignment_id},
        {"$set": assignment_data}
    )
    
    updated = await db.assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    return Assignment(**updated)

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete an assignment"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.assignments.delete_one({"assignment_id": assignment_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {"message": "Assignment deleted"}

@api_router.post("/study-sessions", response_model=StudySession)
async def create_study_session(session_data: StudySessionCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log a study session"""
    user_id = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    session_id = f"study_{uuid.uuid4().hex[:12]}"
    
    # Get course name if course_id provided
    course_name = None
    if session_data.course_id:
        course = await db.courses.find_one({"course_id": session_data.course_id}, {"_id": 0})
        if course:
            course_name = course["name"]
    
    session = {
        "study_session_id": session_id,
        "user_id": user_id,
        "course_id": session_data.course_id,
        "course_name": course_name,
        "duration_minutes": session_data.duration_minutes,
        "topic": session_data.topic,
        "notes": session_data.notes or "",
        "timestamp": now,
        "date": now.strftime("%Y-%m-%d")
    }
    
    await db.study_sessions.insert_one(session)
    return StudySession(**session)

@api_router.get("/study-sessions/stats")
async def get_study_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get study session statistics"""
    user_id = await get_current_user(authorization, request)
    
    # Get last 7 days
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    
    sessions = await db.study_sessions.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": seven_days_ago}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Get today's sessions
    today_str = today.strftime("%Y-%m-%d")
    today_sessions = [s for s in sessions if s["date"] == today_str]
    today_minutes = sum(s["duration_minutes"] for s in today_sessions)
    
    # Total stats
    total_minutes = sum(s["duration_minutes"] for s in sessions)
    total_sessions = len(sessions)
    
    return {
        "today_minutes": today_minutes,
        "today_sessions": len(today_sessions),
        "week_total_minutes": total_minutes,
        "week_total_sessions": total_sessions,
        "recent_sessions": [StudySession(**s) for s in sorted(sessions, key=lambda x: x["timestamp"], reverse=True)[:5]]
    }

@api_router.delete("/study-sessions/{session_id}")
async def delete_study_session(session_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a study session"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.study_sessions.delete_one({"study_session_id": session_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Study session not found")
    
    return {"message": "Study session deleted"}

# ============= NOTES ENDPOINTS =============

@api_router.post("/notes", response_model=Note)
async def create_note(note_data: NoteCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new note"""
    user_id = await get_current_user(authorization, request)
    
    now = datetime.now(timezone.utc)
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    note = {
        "note_id": note_id,
        "user_id": user_id,
        "title": note_data.title,
        "content": note_data.content,
        "color": note_data.color or "#FFD700",
        "pinned": note_data.pinned if note_data.pinned is not None else False,
        "tags": note_data.tags or [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.notes.insert_one(note)
    return Note(**note)

@api_router.get("/notes", response_model=List[Note])
async def get_notes(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all notes (pinned first, then by updated_at)"""
    user_id = await get_current_user(authorization, request)
    
    notes = await db.notes.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Sort: pinned first, then by updated_at descending
    sorted_notes = sorted(notes, key=lambda x: (not x.get("pinned", False), -x["updated_at"].timestamp()))
    
    return [Note(**note) for note in sorted_notes]

@api_router.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: str, note_data: NoteUpdate, authorization: Optional[str] = Header(None), request: Request = None):
    """Update a note"""
    user_id = await get_current_user(authorization, request)
    
    note = await db.notes.find_one({"note_id": note_id, "user_id": user_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_fields = {k: v for k, v in note_data.dict().items() if v is not None}
    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    await db.notes.update_one(
        {"note_id": note_id},
        {"$set": update_fields}
    )
    
    updated = await db.notes.find_one({"note_id": note_id}, {"_id": 0})
    return Note(**updated)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a note"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.notes.delete_one({"note_id": note_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}

# ============= CHORES ENDPOINTS =============

@api_router.post("/chores", response_model=Chore)
async def create_chore(chore_data: ChoreCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new chore"""
    user_id = await get_current_user(authorization, request)
    
    chore_id = f"chore_{uuid.uuid4().hex[:12]}"
    chore = {
        "chore_id": chore_id,
        "user_id": user_id,
        "name": chore_data.name,
        "description": chore_data.description or "",
        "frequency": chore_data.frequency,
        "days": chore_data.days or [],
        "room": chore_data.room or "",
        "completed_dates": [],
        "last_completed": None,
        "current_streak": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.chores.insert_one(chore)
    return Chore(**chore)

@api_router.get("/chores", response_model=List[Chore])
async def get_chores(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all chores"""
    user_id = await get_current_user(authorization, request)
    
    chores = await db.chores.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return [Chore(**chore) for chore in chores]

@api_router.post("/chores/{chore_id}/complete")
async def complete_chore(chore_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Mark chore as completed"""
    user_id = await get_current_user(authorization, request)
    
    chore = await db.chores.find_one({"chore_id": chore_id, "user_id": user_id}, {"_id": 0})
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check if already completed today
    completed_dates = chore.get("completed_dates", [])
    today_completions = [d for d in completed_dates if isinstance(d, datetime) and d >= today_start]
    
    if today_completions:
        return {"message": "Already completed today", "chore": Chore(**chore)}
    
    # Add completion
    completed_dates.append(now)
    
    # Calculate streak
    current_streak = 1
    check_date = today_start
    sorted_dates = sorted([d for d in completed_dates if isinstance(d, datetime)], reverse=True)
    
    for i in range(len(sorted_dates) - 1):
        prev_day = check_date - timedelta(days=1)
        prev_day_completions = [d for d in sorted_dates if d.date() == prev_day.date()]
        if prev_day_completions:
            current_streak += 1
            check_date = prev_day
        else:
            break
    
    await db.chores.update_one(
        {"chore_id": chore_id},
        {"$set": {
            "completed_dates": completed_dates,
            "last_completed": now,
            "current_streak": current_streak
        }}
    )
    
    updated_chore = await db.chores.find_one({"chore_id": chore_id}, {"_id": 0})
    return {"message": "Chore completed!", "chore": Chore(**updated_chore)}

@api_router.get("/chores/today")
async def get_today_chores(authorization: Optional[str] = Header(None), request: Request = None):
    """Get today's chores (based on frequency)"""
    user_id = await get_current_user(authorization, request)
    
    all_chores = await db.chores.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    today = datetime.now(timezone.utc)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    day_name = today.strftime("%a").lower()[:3]  # "mon", "tue", etc.
    
    today_chores = []
    for chore in all_chores:
        # Check if due today based on frequency
        if chore["frequency"] == "daily":
            today_chores.append(chore)
        elif chore["frequency"] == "weekly" and day_name in chore.get("days", []):
            today_chores.append(chore)
        elif chore["frequency"] == "monthly" and today.day == 1:
            today_chores.append(chore)
    
    # Mark which are completed today
    for chore in today_chores:
        completed_dates = chore.get("completed_dates", [])
        today_completions = [d for d in completed_dates if isinstance(d, datetime) and d >= today_start]
        chore["completed_today"] = len(today_completions) > 0
    
    return today_chores

@api_router.delete("/chores/{chore_id}")
async def delete_chore(chore_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a chore"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.chores.delete_one({"chore_id": chore_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chore not found")
    
    return {"message": "Chore deleted"}

# ============= SLEEP TRACKER ENDPOINTS =============

@api_router.post("/sleep/log", response_model=Sleep)
async def log_sleep(sleep_data: SleepCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log a sleep session"""
    user_id = await get_current_user(authorization, request)
    
    # Calculate duration
    duration = (sleep_data.wake_time - sleep_data.bedtime).total_seconds() / 3600
    
    sleep_id = f"sleep_{uuid.uuid4().hex[:12]}"
    sleep = {
        "sleep_id": sleep_id,
        "user_id": user_id,
        "bedtime": sleep_data.bedtime,
        "wake_time": sleep_data.wake_time,
        "duration_hours": round(duration, 2),
        "quality": sleep_data.quality,
        "notes": sleep_data.notes or "",
        "felt_rested": sleep_data.felt_rested if sleep_data.felt_rested is not None else False,
        "date": sleep_data.wake_time.strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.sleep_logs.insert_one(sleep)
    return Sleep(**sleep)

@api_router.get("/sleep/stats")
async def get_sleep_stats(authorization: Optional[str] = Header(None), request: Request = None):
    """Get sleep statistics"""
    user_id = await get_current_user(authorization, request)
    
    # Get last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    logs = await db.sleep_logs.find(
        {
            "user_id": user_id,
            "created_at": {"$gte": seven_days_ago}
        },
        {"_id": 0}
    ).sort("wake_time", -1).to_list(1000)
    
    if not logs:
        return {
            "average_duration": 0,
            "average_quality": 0,
            "total_nights": 0,
            "rested_percentage": 0,
            "recent_logs": [],
            "consistency_score": 0
        }
    
    # Calculate stats
    avg_duration = sum(log["duration_hours"] for log in logs) / len(logs)
    avg_quality = sum(log["quality"] for log in logs) / len(logs)
    rested_count = sum(1 for log in logs if log.get("felt_rested", False))
    rested_percentage = int((rested_count / len(logs)) * 100)
    
    # Calculate consistency (how similar are bedtimes)
    bedtimes = [log["bedtime"] for log in logs]
    if len(bedtimes) > 1:
        # Convert to minutes from midnight
        bedtime_minutes = [(bt.hour * 60 + bt.minute) for bt in bedtimes]
        avg_bedtime = sum(bedtime_minutes) / len(bedtime_minutes)
        variance = sum((t - avg_bedtime) ** 2 for t in bedtime_minutes) / len(bedtime_minutes)
        # Lower variance = higher consistency (0-100 scale)
        consistency_score = max(0, int(100 - (variance / 100)))
    else:
        consistency_score = 100
    
    # Get goal
    goal_doc = await db.sleep_goals.find_one({"user_id": user_id}, {"_id": 0})
    target_hours = goal_doc["target_hours"] if goal_doc else 8
    
    return {
        "average_duration": round(avg_duration, 1),
        "average_quality": round(avg_quality, 1),
        "total_nights": len(logs),
        "rested_percentage": rested_percentage,
        "recent_logs": [Sleep(**log) for log in logs[:7]],
        "consistency_score": consistency_score,
        "target_hours": target_hours,
        "meeting_goal": avg_duration >= target_hours if logs else False
    }

@api_router.post("/sleep/goal", response_model=SleepGoal)
async def set_sleep_goal(goal_data: SleepGoalCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Set sleep goals"""
    user_id = await get_current_user(authorization, request)
    
    # Check if goal exists
    existing_goal = await db.sleep_goals.find_one({"user_id": user_id}, {"_id": 0})
    
    if existing_goal:
        # Update existing goal
        await db.sleep_goals.update_one(
            {"user_id": user_id},
            {"$set": {
                "target_bedtime": goal_data.target_bedtime,
                "target_wake_time": goal_data.target_wake_time,
                "target_hours": goal_data.target_hours
            }}
        )
        existing_goal.update({
            "target_bedtime": goal_data.target_bedtime,
            "target_wake_time": goal_data.target_wake_time,
            "target_hours": goal_data.target_hours
        })
        return SleepGoal(**existing_goal)
    else:
        # Create new goal
        goal_id = f"sleepgoal_{uuid.uuid4().hex[:12]}"
        goal = {
            "sleep_goal_id": goal_id,
            "user_id": user_id,
            "target_bedtime": goal_data.target_bedtime,
            "target_wake_time": goal_data.target_wake_time,
            "target_hours": goal_data.target_hours,
            "created_at": datetime.now(timezone.utc)
        }
        await db.sleep_goals.insert_one(goal)
        return SleepGoal(**goal)

@api_router.get("/sleep/goal")
async def get_sleep_goal(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's sleep goal"""
    user_id = await get_current_user(authorization, request)
    
    goal = await db.sleep_goals.find_one({"user_id": user_id}, {"_id": 0})
    if goal:
        return SleepGoal(**goal)
    
    # Return default goal
    return {
        "sleep_goal_id": None,
        "user_id": user_id,
        "target_bedtime": "22:00",
        "target_wake_time": "06:00",
        "target_hours": 8,
        "created_at": datetime.now(timezone.utc)
    }

@api_router.delete("/sleep/{sleep_id}")
async def delete_sleep_log(sleep_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a sleep log"""
    user_id = await get_current_user(authorization, request)
    
    result = await db.sleep_logs.delete_one({"sleep_id": sleep_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    
    return {"message": "Sleep log deleted"}

# ============= GROCERY ENDPOINTS =============

class GroceryItemCreate(BaseModel):
    name: str
    quantity: Optional[str] = "1"
    category: Optional[str] = "Other"
    notes: Optional[str] = ""

class GroceryReceiptCreate(BaseModel):
    total_amount: float
    store_name: Optional[str] = ""
    receipt_image: Optional[str] = None  # base64 image
    notes: Optional[str] = ""

@api_router.get("/groceries")
async def get_grocery_items(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all grocery items for the current user"""
    user_id = await get_current_user(authorization, request)
    items = await db.grocery_items.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/groceries")
async def create_grocery_item(item: GroceryItemCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Create a new grocery item"""
    user_id = await get_current_user(authorization, request)
    grocery_item = {
        "item_id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": item.name,
        "quantity": item.quantity,
        "category": item.category,
        "notes": item.notes,
        "checked": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.grocery_items.insert_one(grocery_item)
    grocery_item.pop("_id", None)
    return grocery_item

@api_router.put("/groceries/{item_id}")
async def update_grocery_item(item_id: str, updates: Dict[str, Any], authorization: Optional[str] = Header(None), request: Request = None):
    """Update a grocery item (toggle checked, edit name, etc.)"""
    user_id = await get_current_user(authorization, request)
    allowed_fields = {"name", "quantity", "category", "notes", "checked"}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    result = await db.grocery_items.update_one(
        {"item_id": item_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Grocery item not found")
    updated = await db.grocery_items.find_one({"item_id": item_id}, {"_id": 0})
    return updated

@api_router.delete("/groceries/{item_id}")
async def delete_grocery_item(item_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a grocery item"""
    user_id = await get_current_user(authorization, request)
    result = await db.grocery_items.delete_one({"item_id": item_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grocery item not found")
    return {"message": "Grocery item deleted"}

@api_router.delete("/groceries/clear/checked")
async def clear_checked_items(authorization: Optional[str] = Header(None), request: Request = None):
    """Clear all checked grocery items"""
    user_id = await get_current_user(authorization, request)
    result = await db.grocery_items.delete_many({"user_id": user_id, "checked": True})
    return {"message": f"Cleared {result.deleted_count} items"}

@api_router.post("/groceries/receipts")
async def upload_receipt(receipt: GroceryReceiptCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Upload a grocery receipt with photo and total"""
    user_id = await get_current_user(authorization, request)
    receipt_doc = {
        "receipt_id": str(uuid.uuid4()),
        "user_id": user_id,
        "total_amount": receipt.total_amount,
        "store_name": receipt.store_name,
        "receipt_image": receipt.receipt_image,
        "notes": receipt.notes,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.grocery_receipts.insert_one(receipt_doc)
    receipt_doc.pop("_id", None)
    return receipt_doc

@api_router.get("/groceries/receipts")
async def get_receipts(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all receipts for the current user"""
    user_id = await get_current_user(authorization, request)
    receipts = await db.grocery_receipts.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return receipts

@api_router.delete("/groceries/receipts/{receipt_id}")
async def delete_receipt(receipt_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a receipt"""
    user_id = await get_current_user(authorization, request)
    result = await db.grocery_receipts.delete_one({"receipt_id": receipt_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"message": "Receipt deleted"}

@api_router.get("/groceries/spending")
async def get_grocery_spending(authorization: Optional[str] = Header(None), request: Request = None):
    """Get spending summary for groceries"""
    user_id = await get_current_user(authorization, request)
    receipts = await db.grocery_receipts.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)

    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    month_start = now.strftime("%Y-%m-01")

    total_all_time = sum(r.get("total_amount", 0) for r in receipts)
    total_this_week = sum(r.get("total_amount", 0) for r in receipts if r.get("date", "") >= week_ago)
    total_this_month = sum(r.get("total_amount", 0) for r in receipts if r.get("date", "") >= month_start)
    receipt_count = len(receipts)

    return {
        "total_all_time": round(total_all_time, 2),
        "total_this_week": round(total_this_week, 2),
        "total_this_month": round(total_this_month, 2),
        "receipt_count": receipt_count
    }

# ============= DIET TRACKER ENDPOINTS =============

class DietLogCreate(BaseModel):
    food_name: str
    meal_type: str = "snack"  # breakfast, lunch, dinner, snack
    food_category: str = "balanced"  # nutritious, comfort, balanced
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    portion_size: Optional[str] = ""
    mood_before: Optional[str] = ""
    mood_after: Optional[str] = ""
    notes: Optional[str] = ""

class FoodAnalyzeRequest(BaseModel):
    food_description: str

@api_router.post("/diet/log")
async def log_diet_entry(data: DietLogCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log a food/meal entry"""
    user_id = await get_current_user(authorization, request)
    entry = {
        "entry_id": str(uuid.uuid4()),
        "user_id": user_id,
        "food_name": data.food_name,
        "meal_type": data.meal_type,
        "food_category": data.food_category,
        "calories": data.calories,
        "protein_g": data.protein_g,
        "carbs_g": data.carbs_g,
        "fat_g": data.fat_g,
        "fiber_g": data.fiber_g,
        "sugar_g": data.sugar_g,
        "portion_size": data.portion_size or "",
        "mood_before": data.mood_before or "",
        "mood_after": data.mood_after or "",
        "notes": data.notes or "",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.diet_logs.insert_one(entry)
    entry.pop("_id", None)
    return entry

@api_router.get("/diet/today")
async def get_today_diet(authorization: Optional[str] = Header(None), request: Request = None):
    """Get today's diet log with nutritional summary"""
    user_id = await get_current_user(authorization, request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    logs = await db.diet_logs.find(
        {"user_id": user_id, "date": today}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)

    total_cal = sum(l.get("calories") or 0 for l in logs)
    total_protein = sum(l.get("protein_g") or 0 for l in logs)
    total_carbs = sum(l.get("carbs_g") or 0 for l in logs)
    total_fat = sum(l.get("fat_g") or 0 for l in logs)
    total_fiber = sum(l.get("fiber_g") or 0 for l in logs)
    total_sugar = sum(l.get("sugar_g") or 0 for l in logs)
    nutritious_count = sum(1 for l in logs if l.get("food_category") == "nutritious")
    comfort_count = sum(1 for l in logs if l.get("food_category") == "comfort")

    return {
        "date": today,
        "logs": logs,
        "summary": {
            "total_calories": total_cal,
            "total_protein_g": round(total_protein, 1),
            "total_carbs_g": round(total_carbs, 1),
            "total_fat_g": round(total_fat, 1),
            "total_fiber_g": round(total_fiber, 1),
            "total_sugar_g": round(total_sugar, 1),
            "meal_count": len(logs),
            "nutritious_count": nutritious_count,
            "comfort_count": comfort_count,
        }
    }

@api_router.get("/diet/logs")
async def get_diet_logs(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all diet logs"""
    user_id = await get_current_user(authorization, request)
    logs = await db.diet_logs.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return logs

@api_router.delete("/diet/logs/{entry_id}")
async def delete_diet_entry(entry_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a diet entry"""
    user_id = await get_current_user(authorization, request)
    result = await db.diet_logs.delete_one({"entry_id": entry_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diet entry not found")
    return {"message": "Diet entry deleted"}

@api_router.get("/diet/insights")
async def get_diet_insights(authorization: Optional[str] = Header(None), request: Request = None):
    """Get diet insights and mood-food correlations"""
    user_id = await get_current_user(authorization, request)
    logs = await db.diet_logs.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    if len(logs) == 0:
        return {"insights": [], "total_entries": 0, "comfort_ratio": 0, "avg_daily_calories": 0}

    total = len(logs)
    comfort = sum(1 for l in logs if l.get("food_category") == "comfort")
    nutritious = sum(1 for l in logs if l.get("food_category") == "nutritious")

    # Calculate average daily calories
    dates = set(l.get("date", "") for l in logs)
    total_cals = sum(l.get("calories") or 0 for l in logs)
    avg_daily = round(total_cals / max(len(dates), 1))

    # Mood patterns
    mood_after_comfort = [l.get("mood_after", "") for l in logs if l.get("food_category") == "comfort" and l.get("mood_after")]
    mood_after_nutritious = [l.get("mood_after", "") for l in logs if l.get("food_category") == "nutritious" and l.get("mood_after")]

    insights = []
    if comfort / max(total, 1) > 0.5:
        insights.append({"type": "warning", "title": "High Comfort Food Intake", "text": "Over half your meals are comfort foods. Try adding one nutritious meal per day for better energy and focus."})
    if nutritious / max(total, 1) > 0.6:
        insights.append({"type": "positive", "title": "Great Nutritious Eating!", "text": "You're eating mostly nutritious foods. This is great for your ADHD focus and energy levels!"})
    if avg_daily > 2500:
        insights.append({"type": "info", "title": "High Calorie Intake", "text": f"Your average daily intake is {avg_daily} cal. Consider speaking to a nutritionist about your ideal daily target."})
    if avg_daily > 0 and avg_daily < 1200:
        insights.append({"type": "warning", "title": "Low Calorie Intake", "text": "You might not be eating enough. Your brain needs fuel to focus — make sure you're nourishing yourself."})

    return {
        "total_entries": total,
        "comfort_ratio": round(comfort / max(total, 1) * 100),
        "nutritious_ratio": round(nutritious / max(total, 1) * 100),
        "avg_daily_calories": avg_daily,
        "days_tracked": len(dates),
        "insights": insights,
    }

@api_router.post("/diet/analyze")
async def analyze_food(data: FoodAnalyzeRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """Use AI to analyze a food item and estimate nutritional value"""
    user_id = await get_current_user(authorization, request)

    prompt = f"""Analyze this food item and provide nutritional estimates. Return ONLY valid JSON with no additional text:
{{
  "food_name": "cleaned name of the food",
  "calories": estimated calories (integer),
  "protein_g": grams of protein (number),
  "carbs_g": grams of carbs (number),
  "fat_g": grams of fat (number),
  "fiber_g": grams of fiber (number),
  "sugar_g": grams of sugar (number),
  "food_category": "nutritious" or "comfort" or "balanced",
  "impact_mind": "brief description of how this food affects mental clarity and focus for someone with ADHD",
  "impact_body": "brief description of how this food affects energy and body",
  "impact_mood": "brief description of how this food affects mood",
  "healthier_alternative": "if comfort food, suggest a healthier alternative, otherwise null"
}}

Food: {data.food_description}"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"diet_{user_id}_{uuid.uuid4().hex[:6]}",
            system_message="You are a nutritional analyst. Always respond with only valid JSON, no markdown formatting."
        ).with_model("openai", "gpt-5.2")

        response = await chat.send_message(UserMessage(text=prompt))
        import json as json_lib
        # Try to parse the AI response as JSON
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean
            clean = clean.rsplit("```", 1)[0] if "```" in clean else clean
        result = json_lib.loads(clean)
        return result
    except Exception as e:
        logger.error(f"Food analysis error: {e}")
        return {
            "food_name": data.food_description,
            "calories": None,
            "protein_g": None,
            "carbs_g": None,
            "fat_g": None,
            "fiber_g": None,
            "sugar_g": None,
            "food_category": "balanced",
            "impact_mind": "Unable to analyze at this time",
            "impact_body": "Unable to analyze at this time",
            "impact_mood": "Unable to analyze at this time",
            "healthier_alternative": None,
            "error": "Analysis temporarily unavailable"
        }

# ============= YOGA SESSION ENDPOINTS =============

class YogaSessionCreate(BaseModel):
    pose_id: str
    pose_name: str
    duration_minutes: int
    body_feeling: str  # emoji or text
    feeling_notes: Optional[str] = ""

@api_router.post("/yoga/log")
async def log_yoga_session(data: YogaSessionCreate, authorization: Optional[str] = Header(None), request: Request = None):
    """Log a completed yoga session"""
    user_id = await get_current_user(authorization, request)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "pose_id": data.pose_id,
        "pose_name": data.pose_name,
        "duration_minutes": data.duration_minutes,
        "body_feeling": data.body_feeling,
        "feeling_notes": data.feeling_notes or "",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.yoga_sessions.insert_one(session)
    session.pop("_id", None)
    return session

@api_router.get("/yoga/logs")
async def get_yoga_logs(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all yoga session logs for user"""
    user_id = await get_current_user(authorization, request)
    logs = await db.yoga_sessions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return logs

@api_router.delete("/yoga/logs/{session_id}")
async def delete_yoga_log(session_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Delete a yoga session log"""
    user_id = await get_current_user(authorization, request)
    result = await db.yoga_sessions.delete_one({"session_id": session_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Yoga session not found")
    return {"message": "Yoga session deleted"}

# ============= AI THERAPY BUDDY ENDPOINTS =============

ANIMAL_BUDDIES = {
    "luna_cat": {"name": "Luna", "animal": "Cat", "emoji": "🐱", "personality": "calm, gentle, and a great listener. You speak softly and reassuringly, often using purring metaphors."},
    "bear_dog": {"name": "Bear", "animal": "Dog", "emoji": "🐶", "personality": "enthusiastic, loyal, and always excited to see the user. You are warm and supportive like a best friend."},
    "ollie_owl": {"name": "Ollie", "animal": "Owl", "emoji": "🦉", "personality": "wise, thoughtful, and reflective. You ask deep questions and help the user see things from different perspectives."},
    "penny_penguin": {"name": "Penny", "animal": "Penguin", "emoji": "🐧", "personality": "playful, encouraging, and optimistic. You use humor gently and always find the silver lining."},
    "rosie_rabbit": {"name": "Rosie", "animal": "Rabbit", "emoji": "🐰", "personality": "soft, nurturing, and empathetic. You make the user feel safe and understood, speaking tenderly."},
    "felix_fox": {"name": "Felix", "animal": "Fox", "emoji": "🦊", "personality": "smart, curious, and resourceful. You help the user problem-solve while being emotionally supportive."},
    "ellie_elephant": {"name": "Ellie", "animal": "Elephant", "emoji": "🐘", "personality": "patient, remembers everything, and never judges. You have a calm, steady presence and great memory."},
    "sunny_sloth": {"name": "Sunny", "animal": "Sloth", "emoji": "🦥", "personality": "relaxed, takes things slow, and reminds the user it is ok to rest. You encourage self-care and breathing exercises."},
    "kai_koala": {"name": "Kai", "animal": "Koala", "emoji": "🐨", "personality": "cozy, comforting, and soothing. You specialize in calming anxiety and helping the user feel grounded."},
    "dash_dolphin": {"name": "Dash", "animal": "Dolphin", "emoji": "🐬", "personality": "energetic, positive, and uplifting. You celebrate small wins and encourage the user with high energy."},
}

class BuddySelect(BaseModel):
    buddy_id: str

class TherapyMessage(BaseModel):
    message: str

class MoodCheckIn(BaseModel):
    mood_score: int  # 1-5
    mood_label: str  # sad, anxious, neutral, good, great
    notes: Optional[str] = ""

@api_router.get("/therapy/buddies")
async def get_available_buddies():
    """Get list of available animal buddies"""
    buddies = []
    for bid, info in ANIMAL_BUDDIES.items():
        buddies.append({"buddy_id": bid, "name": info["name"], "animal": info["animal"], "emoji": info["emoji"]})
    return buddies

@api_router.get("/therapy/buddy")
async def get_selected_buddy(authorization: Optional[str] = Header(None), request: Request = None):
    """Get user's selected buddy"""
    user_id = await get_current_user(authorization, request)
    selection = await db.therapy_buddies.find_one({"user_id": user_id}, {"_id": 0})
    if not selection:
        return {"buddy_id": None}
    return selection

@api_router.put("/therapy/buddy")
async def select_buddy(data: BuddySelect, authorization: Optional[str] = Header(None), request: Request = None):
    """Select or change animal buddy"""
    user_id = await get_current_user(authorization, request)
    if data.buddy_id not in ANIMAL_BUDDIES:
        raise HTTPException(status_code=400, detail="Invalid buddy ID")
    buddy_info = ANIMAL_BUDDIES[data.buddy_id]
    doc = {
        "user_id": user_id,
        "buddy_id": data.buddy_id,
        "buddy_name": buddy_info["name"],
        "buddy_animal": buddy_info["animal"],
        "buddy_emoji": buddy_info["emoji"],
        "selected_at": datetime.now(timezone.utc).isoformat()
    }
    await db.therapy_buddies.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return doc

@api_router.post("/therapy/chat")
async def therapy_chat(data: TherapyMessage, authorization: Optional[str] = Header(None), request: Request = None):
    """Send a message to your AI therapy buddy"""
    user_id = await get_current_user(authorization, request)

    # Get buddy selection
    selection = await db.therapy_buddies.find_one({"user_id": user_id})
    if not selection or not selection.get("buddy_id"):
        raise HTTPException(status_code=400, detail="Please select a buddy first")

    buddy_id = selection["buddy_id"]
    buddy_info = ANIMAL_BUDDIES.get(buddy_id, ANIMAL_BUDDIES["luna_cat"])

    # Get recent chat history for context
    recent = await db.therapy_chats.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(10).to_list(10)
    recent.reverse()

    context_messages = ""
    for msg in recent:
        role = "User" if msg.get("role") == "user" else buddy_info["name"]
        context_messages += f"{role}: {msg.get('content', '')}\n"

    system_prompt = f"""You are {buddy_info['name']} the {buddy_info['animal']} {buddy_info['emoji']}, an AI therapy buddy for someone with ADHD. Your personality is {buddy_info['personality']}

IMPORTANT GUIDELINES:
- Be warm, empathetic, and non-judgmental
- Ask thoughtful follow-up questions like "How does that make you feel?" or "Tell me more about that"
- Periodically suggest calming exercises like "Let's take a few nice calm breaths together. Breathe in... 1... 2... 3... 4... 5... and slowly breathe out"
- If the user seems distressed, gently remind them that talking to a medical professional is always a good idea
- Keep responses conversational and not too long (2-4 sentences usually)
- Remember you are a supportive companion, NOT a replacement for professional therapy
- Use your animal personality naturally in conversation
- If the user seems to be in crisis, kindly suggest they reach out to a helpline or trusted person
- Track emotional themes and gently reflect patterns you notice
- Celebrate small victories and progress

Recent conversation context:
{context_messages}"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"therapy_{user_id}_{uuid.uuid4().hex[:6]}",
            system_message=system_prompt
        ).with_model("openai", "gpt-5.2")

        ai_response = await chat.send_message(UserMessage(text=data.message))
    except Exception as e:
        logger.error(f"Therapy chat error: {e}")
        ai_response = f"I'm here for you! 💕 Sometimes my thoughts get a little fuzzy, but I'm always listening. Can you tell me more about how you're feeling?"

    now = datetime.now(timezone.utc).isoformat()
    # Store user message
    await db.therapy_chats.insert_one({
        "chat_id": str(uuid.uuid4()),
        "user_id": user_id,
        "role": "user",
        "content": data.message,
        "created_at": now
    })
    # Store AI response
    ai_chat_id = str(uuid.uuid4())
    await db.therapy_chats.insert_one({
        "chat_id": ai_chat_id,
        "user_id": user_id,
        "role": "assistant",
        "content": ai_response,
        "buddy_id": buddy_id,
        "created_at": now
    })

    return {"response": ai_response, "chat_id": ai_chat_id}

@api_router.get("/therapy/history")
async def get_therapy_history(authorization: Optional[str] = Header(None), request: Request = None):
    """Get chat history"""
    user_id = await get_current_user(authorization, request)
    chats = await db.therapy_chats.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return chats

@api_router.delete("/therapy/history")
async def clear_therapy_history(authorization: Optional[str] = Header(None), request: Request = None):
    """Clear all chat history"""
    user_id = await get_current_user(authorization, request)
    result = await db.therapy_chats.delete_many({"user_id": user_id})
    return {"message": f"Cleared {result.deleted_count} messages"}

@api_router.post("/therapy/mood")
async def log_mood_checkin(data: MoodCheckIn, authorization: Optional[str] = Header(None), request: Request = None):
    """Log a mood check-in for progress tracking"""
    user_id = await get_current_user(authorization, request)
    checkin = {
        "checkin_id": str(uuid.uuid4()),
        "user_id": user_id,
        "mood_score": data.mood_score,
        "mood_label": data.mood_label,
        "notes": data.notes or "",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.mood_checkins.insert_one(checkin)
    checkin.pop("_id", None)
    return checkin

@api_router.get("/therapy/progress")
async def get_therapy_progress(authorization: Optional[str] = Header(None), request: Request = None):
    """Get mood progress over time"""
    user_id = await get_current_user(authorization, request)
    checkins = await db.mood_checkins.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    total = len(checkins)
    if total == 0:
        return {"checkins": [], "average_mood": 0, "total_sessions": 0, "trend": "neutral"}

    avg = sum(c.get("mood_score", 3) for c in checkins) / total
    # Check trend from last 5 vs previous 5
    recent_5 = checkins[:5]
    older_5 = checkins[5:10]
    trend = "neutral"
    if len(older_5) >= 3:
        recent_avg = sum(c.get("mood_score", 3) for c in recent_5) / len(recent_5)
        older_avg = sum(c.get("mood_score", 3) for c in older_5) / len(older_5)
        if recent_avg > older_avg + 0.3:
            trend = "improving"
        elif recent_avg < older_avg - 0.3:
            trend = "declining"

    # Count chat sessions
    chat_count = await db.therapy_chats.count_documents({"user_id": user_id, "role": "user"})

    return {
        "checkins": checkins[:30],
        "average_mood": round(avg, 1),
        "total_sessions": chat_count,
        "total_checkins": total,
        "trend": trend,
        "needs_attention": avg < 2.5 and total >= 5
    }

# ============= AI ENDPOINTS =============

@api_router.post("/ai/focus-tip")
async def get_focus_tip(authorization: Optional[str] = Header(None), request: Request = None):
    """Get an AI-generated focus tip"""
    user_id = await get_current_user(authorization, request)
    
    # Get user's recent activity
    recent_sessions = await db.focus_sessions.find(
        {"user_id": user_id, "completed": True},
        {"_id": 0}
    ).sort("started_at", -1).limit(5).to_list(5)
    
    context = f"User has completed {len(recent_sessions)} recent focus sessions."
    prompt = "Provide a brief, encouraging focus tip for someone with ADHD who's about to start a focus session. Keep it to 1-2 sentences."
    
    tip = await get_ai_suggestion(prompt, context)
    return {"tip": tip}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
