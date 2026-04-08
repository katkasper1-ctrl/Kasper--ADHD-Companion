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
    times: List[str]  # ["08:00", "14:00"]
    reminders: bool = True
    created_at: datetime

class MedicationCreate(BaseModel):
    name: str
    dosage: str
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
    created_at: datetime

class ExpenseCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: str
    due_date: Optional[datetime] = None
    paid: Optional[bool] = False

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
