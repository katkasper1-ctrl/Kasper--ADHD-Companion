import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

export default function RootLayout() {
  const { setUser, setToken } = useAuthStore();

  useEffect(() => {
    loadAuth();
  }, []);

  async function loadAuth() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setToken(token);
        const user = await api.getMe();
        setUser(user);
      }
    } catch (error) {
      console.error('Auth load error:', error);
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="home" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="focus" />
      <Stack.Screen name="habits" />
      <Stack.Screen name="medications" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="events" />
      <Stack.Screen name="birthdays" />
      <Stack.Screen name="routines" />
      <Stack.Screen name="hydration" />
    </Stack>
  );
}
