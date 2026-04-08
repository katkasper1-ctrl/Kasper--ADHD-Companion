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
};
