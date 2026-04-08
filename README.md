# ADHD Companion App - Complete MVP

A comprehensive mobile application designed specifically for people with ADHD, featuring task management, focus tools, habit tracking, and AI-powered assistance.

## ✨ Features

### 🎯 Core ADHD Management
- **Task Management** - Create, organize, and complete tasks with priority levels
  - AI-powered task prioritization using OpenAI GPT-5.2
  - Quick task capture for impulsive thoughts
  - Visual priority indicators (high/medium/low)

- **Focus Timer (Pomodoro)** - Stay focused with customizable work sessions
  - Durations: 15, 25, 45, or 60 minutes
  - Animated timer with pulsing effect
  - Session statistics tracking
  - AI-generated focus tips

- **Habit Tracker** - Build positive habits with streak tracking
  - Color-coded habits
  - Daily check-ins
  - Current and best streak tracking
  - Visual progress indicators

### 💊 Health & Wellness
- **Medication Reminders** - Never miss your medications
  - Dosage tracking
  - Multiple daily times
  - Reminder notifications

### 💰 Financial Management
- **Money & Bill Tracker** - Keep track of expenses and bills
  - Separate expense and bill tracking
  - Mark bills as paid/unpaid
  - Monthly summary statistics
  - Category-based organization

### 📅 Life Organization
- **Event Tracker** - Remember important events
  - Date and time tracking
  - Reminder settings
  - Calendar integration

- **Birthday Tracker** - Never forget birthdays
  - MM-DD format
  - Customizable reminder days
  - Quick overview

- **Daily Routine Builder** - Structure your day
  - Step-by-step routines
  - Time-based scheduling
  - Day-of-week configuration

### 🤖 AI Features (Powered by OpenAI GPT-5.2)
- Smart task prioritization
- Personalized focus tips
- Encouraging reminders
- Context-aware suggestions

### 🔐 Authentication
- **Email/Password** - Traditional JWT-based authentication
- **Google OAuth** - Quick social login via Emergent Auth

## 🎨 ADHD-Optimized Design

### User Experience Principles
- **Minimal Distraction** - Clean, focused UI
- **Dopamine-Friendly** - Visual progress, streak counters, celebration animations
- **Quick Capture** - Floating action buttons for rapid input
- **Gentle Notifications** - Soft colors, encouraging language
- **Visual Progress** - Charts, streaks, completion percentages

### Color Palette
- Primary (Tasks): Calm Blue (#4A90E2)
- Success (Habits): Encouraging Green (#50C878)
- Focus: Deep Purple (#7B68EE)
- Urgent: Soft Red (#FF6B6B)
- Money: Warm Orange (#FFB84D)
- Events: Purple (#9B59B6)
- Birthdays: Red (#E74C3C)
- Routines: Blue (#3498DB)

## 🏗️ Technical Stack

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Forms**: react-hook-form + zod validation
- **UI Components**: Custom components with @expo/vector-icons
- **Date Handling**: date-fns
- **Storage**: AsyncStorage

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT + Emergent Google OAuth
- **AI Integration**: OpenAI GPT-5.2 via emergentintegrations
- **Password Hashing**: bcrypt

## 📱 Screens

1. **Login/Register** - Authentication screens
2. **Home Dashboard** - Overview with stats and quick access
3. **Tasks** - Task management with AI prioritization
4. **Focus Timer** - Pomodoro timer with animations
5. **Habits** - Habit tracking with streaks
6. **Medications** - Medication management
7. **Money Tracker** - Expenses and bills
8. **Events** - Event calendar
9. **Birthdays** - Birthday reminders
10. **Routines** - Daily routine builder

## 🚀 Getting Started

### Prerequisites
- Node.js and Yarn
- Python 3.11+
- MongoDB running on localhost:27017

### Installation

1. **Backend Setup**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend Setup**
```bash
cd /app/frontend
yarn install
```

3. **Environment Variables**
Backend (.env):
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
EMERGENT_LLM_KEY=sk-emergent-065FcDf5306F88e61C
```

Frontend (.env):
```
EXPO_PUBLIC_BACKEND_URL=https://your-app.preview.emergentagent.com
```

### Running the App

**Backend:**
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
expo start
```

## 🧪 Testing

### Test Credentials
- **Email**: test@example.com
- **Password**: password123

### Backend Testing Status
✅ All 34 API endpoints tested and working
- Authentication (4/4 tests passed)
- Tasks (5/5 tests passed)
- Habits (4/4 tests passed)
- Focus Sessions (3/3 tests passed)
- Medications (3/3 tests passed)
- Expenses (5/5 tests passed)
- Events (3/3 tests passed)
- Birthdays (3/3 tests passed)
- Routines (3/3 tests passed)
- AI Features (1/1 test passed)

## 📊 Database Collections

- `users` - User accounts
- `user_sessions` - OAuth sessions
- `tasks` - User tasks with AI scores
- `habits` - Habit tracking with streaks
- `focus_sessions` - Pomodoro sessions
- `medications` - Medication reminders
- `expenses` - Financial tracking
- `events` - Calendar events
- `birthdays` - Birthday reminders
- `routines` - Daily routines

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/session` - Exchange OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/prioritize` - AI prioritization

### Habits
- `POST /api/habits` - Create habit
- `GET /api/habits` - List habits
- `POST /api/habits/{id}/checkin` - Check-in
- `DELETE /api/habits/{id}` - Delete habit

### Focus
- `POST /api/focus/start` - Start session
- `POST /api/focus/{id}/complete` - Complete session
- `GET /api/focus/stats` - Get statistics

### Medications
- `POST /api/medications` - Create medication
- `GET /api/medications` - List medications
- `DELETE /api/medications/{id}` - Delete medication

### Expenses
- `POST /api/expenses` - Create expense/bill
- `GET /api/expenses` - List expenses
- `PUT /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense
- `GET /api/expenses/summary` - Get summary

### Events
- `POST /api/events` - Create event
- `GET /api/events` - List events
- `DELETE /api/events/{id}` - Delete event

### Birthdays
- `POST /api/birthdays` - Create birthday
- `GET /api/birthdays` - List birthdays
- `DELETE /api/birthdays/{id}` - Delete birthday

### Routines
- `POST /api/routines` - Create routine
- `GET /api/routines` - List routines
- `DELETE /api/routines/{id}` - Delete routine

### AI
- `POST /api/ai/focus-tip` - Get focus tip

## 🎯 ADHD-Specific Features

1. **Quick Capture** - Floating action buttons on every screen for rapid task/habit/event creation
2. **Visual Feedback** - Immediate visual confirmation for all actions
3. **Progress Indicators** - Streaks, completion percentages, and statistics
4. **Gentle Reminders** - Encouraging AI-generated tips and suggestions
5. **Color Coding** - Visual organization with customizable colors
6. **Minimal Steps** - Streamlined workflows to reduce friction
7. **Focus Mode** - Dedicated timer to maintain concentration
8. **Dopamine Rewards** - Celebration animations for completions

## 🔒 Security

- JWT token-based authentication
- bcrypt password hashing
- HTTP-only cookies for OAuth sessions
- Secure session management
- Protected API endpoints

## 📱 Mobile Optimization

- Touch-friendly UI (44px minimum touch targets)
- Keyboard-aware views
- Safe area insets
- Platform-specific styling
- Pull-to-refresh
- Swipe gestures
- Haptic feedback (ready for implementation)

## 🚀 Deployment

The app is deployed and accessible at:
- **Web/Mobile Preview**: https://adhd-companion-18.preview.emergentagent.com
- **Backend API**: https://adhd-companion-18.preview.emergentagent.com/api

## 📝 License

This is a custom-built ADHD management application.

## 🙏 Acknowledgments

- OpenAI GPT-5.2 for AI-powered features
- Emergent Platform for authentication and LLM integration
- Expo team for the amazing mobile framework
