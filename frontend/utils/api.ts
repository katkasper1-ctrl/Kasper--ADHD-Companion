import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await AsyncStorage.getItem('auth_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  // Tasks
  getTasks: () => apiRequest('/tasks'),
  createTask: (data: any) => apiRequest('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => apiRequest(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),
  prioritizeTasks: () => apiRequest('/tasks/prioritize', { method: 'POST' }),

  // Habits
  getHabits: () => apiRequest('/habits'),
  createHabit: (data: any) => apiRequest('/habits', { method: 'POST', body: JSON.stringify(data) }),
  checkInHabit: (id: string) => apiRequest(`/habits/${id}/checkin`, { method: 'POST' }),
  deleteHabit: (id: string) => apiRequest(`/habits/${id}`, { method: 'DELETE' }),

  // Medications
  getMedications: () => apiRequest('/medications'),
  createMedication: (data: any) => apiRequest('/medications', { method: 'POST', body: JSON.stringify(data) }),
  deleteMedication: (id: string) => apiRequest(`/medications/${id}`, { method: 'DELETE' }),
  getMedicalProfile: () => apiRequest('/medical-profile'),
  updateMedicalProfile: (data: any) => apiRequest('/medical-profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Focus Sessions
  startFocusSession: (data: any) => apiRequest('/focus/start', { method: 'POST', body: JSON.stringify(data) }),
  completeFocusSession: (id: string) => apiRequest(`/focus/${id}/complete`, { method: 'POST' }),
  getFocusStats: () => apiRequest('/focus/stats'),

  // Expenses
  getExpenses: () => apiRequest('/expenses'),
  createExpense: (data: any) => apiRequest('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: any) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseSummary: () => apiRequest('/expenses/summary'),
  getStatements: () => apiRequest('/expenses/statements'),
  createStatement: (data: any) => apiRequest('/expenses/statements', { method: 'POST', body: JSON.stringify(data) }),
  updateStatement: (id: string, data: any) => apiRequest(`/expenses/statements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStatement: (id: string) => apiRequest(`/expenses/statements/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: () => apiRequest('/events'),
  createEvent: (data: any) => apiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => apiRequest(`/events/${id}`, { method: 'DELETE' }),

  // Birthdays
  getBirthdays: () => apiRequest('/birthdays'),
  createBirthday: (data: any) => apiRequest('/birthdays', { method: 'POST', body: JSON.stringify(data) }),
  deleteBirthday: (id: string) => apiRequest(`/birthdays/${id}`, { method: 'DELETE' }),

  // Routines
  getRoutines: () => apiRequest('/routines'),
  createRoutine: (data: any) => apiRequest('/routines', { method: 'POST', body: JSON.stringify(data) }),
  deleteRoutine: (id: string) => apiRequest(`/routines/${id}`, { method: 'DELETE' }),

  // AI
  getFocusTip: () => apiRequest('/ai/focus-tip', { method: 'POST' }),

  // Hydration
  logHydration: (amount_ml: number) => apiRequest('/hydration/log', { method: 'POST', body: JSON.stringify({ amount_ml }) }),
  getTodayHydration: () => apiRequest('/hydration/today'),
  getHydrationStats: () => apiRequest('/hydration/stats'),
  setHydrationGoal: (daily_goal_ml: number) => apiRequest('/hydration/goal', { method: 'POST', body: JSON.stringify({ daily_goal_ml }) }),
  deleteHydrationLog: (id: string) => apiRequest(`/hydration/${id}`, { method: 'DELETE' }),

  // Exercise
  logExercise: (data: any) => apiRequest('/exercise/log', { method: 'POST', body: JSON.stringify(data) }),
  getTodayExercise: () => apiRequest('/exercise/today'),
  getExerciseStats: () => apiRequest('/exercise/stats'),
  deleteExerciseLog: (id: string) => apiRequest(`/exercise/${id}`, { method: 'DELETE' }),

  // Mood
  logMood: (data: any) => apiRequest('/mood/log', { method: 'POST', body: JSON.stringify(data) }),
  getTodayMood: () => apiRequest('/mood/today'),
  getMoodStats: () => apiRequest('/mood/stats'),
  deleteMoodLog: (id: string) => apiRequest(`/mood/${id}`, { method: 'DELETE' }),

  // School/Study
  getCourses: () => apiRequest('/courses'),
  createCourse: (data: any) => apiRequest('/courses', { method: 'POST', body: JSON.stringify(data) }),
  deleteCourse: (id: string) => apiRequest(`/courses/${id}`, { method: 'DELETE' }),
  getAssignments: () => apiRequest('/assignments'),
  createAssignment: (data: any) => apiRequest('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (id: string, data: any) => apiRequest(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id: string) => apiRequest(`/assignments/${id}`, { method: 'DELETE' }),
  createStudySession: (data: any) => apiRequest('/study-sessions', { method: 'POST', body: JSON.stringify(data) }),
  getStudyStats: () => apiRequest('/study-sessions/stats'),
  deleteStudySession: (id: string) => apiRequest(`/study-sessions/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: () => apiRequest('/notes'),
  createNote: (data: any) => apiRequest('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: any) => apiRequest(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id: string) => apiRequest(`/notes/${id}`, { method: 'DELETE' }),

  // Chores
  getChores: () => apiRequest('/chores'),
  getTodayChores: () => apiRequest('/chores/today'),
  createChore: (data: any) => apiRequest('/chores', { method: 'POST', body: JSON.stringify(data) }),
  completeChore: (id: string) => apiRequest(`/chores/${id}/complete`, { method: 'POST' }),
  deleteChore: (id: string) => apiRequest(`/chores/${id}`, { method: 'DELETE' }),

  // Sleep
  logSleep: (data: any) => apiRequest('/sleep/log', { method: 'POST', body: JSON.stringify(data) }),
  getSleepStats: () => apiRequest('/sleep/stats'),
  getSleepGoal: () => apiRequest('/sleep/goal'),
  setSleepGoal: (data: any) => apiRequest('/sleep/goal', { method: 'POST', body: JSON.stringify(data) }),
  deleteSleepLog: (id: string) => apiRequest(`/sleep/${id}`, { method: 'DELETE' }),

  // Groceries
  getGroceryItems: () => apiRequest('/groceries'),
  createGroceryItem: (data: any) => apiRequest('/groceries', { method: 'POST', body: JSON.stringify(data) }),
  updateGroceryItem: (id: string, data: any) => apiRequest(`/groceries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroceryItem: (id: string) => apiRequest(`/groceries/${id}`, { method: 'DELETE' }),
  clearCheckedGroceries: () => apiRequest('/groceries/clear/checked', { method: 'DELETE' }),
  getGroceryReceipts: () => apiRequest('/groceries/receipts'),
  uploadGroceryReceipt: (data: any) => apiRequest('/groceries/receipts', { method: 'POST', body: JSON.stringify(data) }),
  deleteGroceryReceipt: (id: string) => apiRequest(`/groceries/receipts/${id}`, { method: 'DELETE' }),
  getGrocerySpending: () => apiRequest('/groceries/spending'),

  // Yoga Sessions
  logYogaSession: (data: any) => apiRequest('/yoga/log', { method: 'POST', body: JSON.stringify(data) }),
  getYogaLogs: () => apiRequest('/yoga/logs'),
  deleteYogaLog: (id: string) => apiRequest(`/yoga/logs/${id}`, { method: 'DELETE' }),

  // Therapy Buddy
  getAvailableBuddies: () => apiRequest('/therapy/buddies'),
  getSelectedBuddy: () => apiRequest('/therapy/buddy'),
  selectBuddy: (buddyId: string) => apiRequest('/therapy/buddy', { method: 'PUT', body: JSON.stringify({ buddy_id: buddyId }) }),
  sendTherapyMessage: (message: string) => apiRequest('/therapy/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  getTherapyHistory: () => apiRequest('/therapy/history'),
  clearTherapyHistory: () => apiRequest('/therapy/history', { method: 'DELETE' }),
  logMoodCheckin: (data: any) => apiRequest('/therapy/mood', { method: 'POST', body: JSON.stringify(data) }),
  getTherapyProgress: () => apiRequest('/therapy/progress'),

  // Diet Tracker
  logDietEntry: (data: any) => apiRequest('/diet/log', { method: 'POST', body: JSON.stringify(data) }),
  getTodayDiet: () => apiRequest('/diet/today'),
  getDietLogs: () => apiRequest('/diet/logs'),
  deleteDietEntry: (id: string) => apiRequest(`/diet/logs/${id}`, { method: 'DELETE' }),
  getDietInsights: () => apiRequest('/diet/insights'),
  analyzeFood: (food: string) => apiRequest('/diet/analyze', { method: 'POST', body: JSON.stringify({ food_description: food }) }),

  // First Aid
  getFirstAidCategories: () => apiRequest('/firstaid/categories'),
  getFirstAidGuides: () => apiRequest('/firstaid/guides'),
  getFirstAidGuide: (guideId: string) => apiRequest(`/firstaid/guides/${guideId}`),
  searchFirstAid: (query: string) => apiRequest('/firstaid/search', { method: 'POST', body: JSON.stringify({ query }) }),
};
