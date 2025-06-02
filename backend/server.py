from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, time
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TaskType(str, Enum):
    ASSIGNMENT = "assignment"
    TEST = "test"
    PROJECT = "project"
    HOMEWORK = "homework"
    STUDY = "study"

class ActivityType(str, Enum):
    SPORTS = "sports"
    CLUB = "club"
    MEETING = "meeting"
    PRACTICE = "practice"
    COMPETITION = "competition"
    EVENT = "event"

class Theme(str, Enum):
    LIGHT = "light"
    DARK = "dark"

class ViewType(str, Enum):
    MONTH = "month"
    WEEK = "week"
    DAY = "day"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    year_level: int = Field(ge=9, le=12)
    theme: Theme = Theme.LIGHT
    default_view: ViewType = ViewType.MONTH
    subjects: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    year_level: int = Field(ge=9, le=12)
    subjects: List[str] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    year_level: Optional[int] = Field(None, ge=9, le=12)
    theme: Optional[Theme] = None
    default_view: Optional[ViewType] = None
    subjects: Optional[List[str]] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    subject: str
    task_type: TaskType
    priority: Priority = Priority.MEDIUM
    due_date: datetime
    due_time: Optional[time] = None
    estimated_duration: Optional[int] = None  # minutes
    completed: bool = False
    completed_at: Optional[datetime] = None
    color: Optional[str] = "#6366f1"  # Default purple
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject: str
    task_type: TaskType
    priority: Priority = Priority.MEDIUM
    due_date: datetime
    due_time: Optional[time] = None
    estimated_duration: Optional[int] = None
    color: Optional[str] = "#6366f1"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    task_type: Optional[TaskType] = None
    priority: Optional[Priority] = None
    due_date: Optional[datetime] = None
    due_time: Optional[time] = None
    estimated_duration: Optional[int] = None
    completed: Optional[bool] = None
    color: Optional[str] = None

class RecurrencePattern(BaseModel):
    frequency: str  # daily, weekly, monthly
    interval: int = 1  # every X days/weeks/months
    days_of_week: Optional[List[int]] = None  # 0=Monday, 6=Sunday
    end_date: Optional[date] = None

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    activity_type: ActivityType
    start_datetime: datetime
    end_datetime: datetime
    location: Optional[str] = None
    recurrence: Optional[RecurrencePattern] = None
    color: Optional[str] = "#10b981"  # Default green
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityCreate(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: ActivityType
    start_datetime: datetime
    end_datetime: datetime
    location: Optional[str] = None
    recurrence: Optional[RecurrencePattern] = None
    color: Optional[str] = "#10b981"

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[ActivityType] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None
    recurrence: Optional[RecurrencePattern] = None
    color: Optional[str] = None

# User routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    # Check if a custom ID was provided, otherwise generate one
    user_dict = user_data.dict()
    if not user_dict.get('id'):
        user_dict['id'] = str(uuid.uuid4())
    
    user = User(**user_dict)
    result = await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if update_data:
        result = await db.users.update_one(
            {"id": user_id}, 
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

# Task routes
@api_router.post("/users/{user_id}/tasks", response_model=Task)
async def create_task(user_id: str, task_data: TaskCreate):
    # Verify user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    task = Task(user_id=user_id, **task_data.dict())
    result = await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/users/{user_id}/tasks", response_model=List[Task])
async def get_user_tasks(user_id: str, completed: Optional[bool] = None):
    query = {"user_id": user_id}
    if completed is not None:
        query["completed"] = completed
    
    tasks = await db.tasks.find(query).sort("due_date", 1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    
    if "completed" in update_data and update_data["completed"]:
        update_data["completed_at"] = datetime.utcnow()
    elif "completed" in update_data and not update_data["completed"]:
        update_data["completed_at"] = None
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.update_one(
        {"id": task_id}, 
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Activity routes
@api_router.post("/users/{user_id}/activities", response_model=Activity)
async def create_activity(user_id: str, activity_data: ActivityCreate):
    # Verify user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    activity = Activity(user_id=user_id, **activity_data.dict())
    result = await db.activities.insert_one(activity.dict())
    return activity

@api_router.get("/users/{user_id}/activities", response_model=List[Activity])
async def get_user_activities(user_id: str):
    activities = await db.activities.find({"user_id": user_id}).sort("start_datetime", 1).to_list(1000)
    return [Activity(**activity) for activity in activities]

@api_router.get("/activities/{activity_id}", response_model=Activity)
async def get_activity(activity_id: str):
    activity = await db.activities.find_one({"id": activity_id})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return Activity(**activity)

@api_router.put("/activities/{activity_id}", response_model=Activity)
async def update_activity(activity_id: str, activity_update: ActivityUpdate):
    update_data = {k: v for k, v in activity_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.activities.update_one(
        {"id": activity_id}, 
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    updated_activity = await db.activities.find_one({"id": activity_id})
    return Activity(**updated_activity)

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str):
    result = await db.activities.delete_one({"id": activity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted successfully"}

# Calendar data endpoint
@api_router.get("/users/{user_id}/calendar")
async def get_calendar_data(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {"user_id": user_id}
    
    # Add date filtering if provided
    if start_date and end_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get tasks in date range
        task_query = {**query, "due_date": {"$gte": start_dt, "$lte": end_dt}}
        # Get activities in date range
        activity_query = {**query, "start_datetime": {"$gte": start_dt, "$lte": end_dt}}
    else:
        task_query = query
        activity_query = query
    
    tasks = await db.tasks.find(task_query).to_list(1000)
    activities = await db.activities.find(activity_query).to_list(1000)
    
    return {
        "tasks": [Task(**task) for task in tasks],
        "activities": [Activity(**activity) for activity in activities]
    }

# Dashboard stats endpoint
@api_router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str):
    # Get task statistics
    total_tasks = await db.tasks.count_documents({"user_id": user_id})
    completed_tasks = await db.tasks.count_documents({"user_id": user_id, "completed": True})
    pending_tasks = total_tasks - completed_tasks
    
    # Get overdue tasks
    now = datetime.utcnow()
    overdue_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": False,
        "due_date": {"$lt": now}
    })
    
    # Get upcoming tasks (next 7 days)
    from datetime import timedelta
    week_from_now = now + timedelta(days=7)
    upcoming_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": False,
        "due_date": {"$gte": now, "$lte": week_from_now}
    })
    
    # Get activities count
    total_activities = await db.activities.count_documents({"user_id": user_id})
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "upcoming_tasks": upcoming_tasks,
        "total_activities": total_activities
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Student Time Management API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
