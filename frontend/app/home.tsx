import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout: storeLogout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    tasks: 0,
    habits: 0,
    focusMinutes: 0,
    upcomingEvents: 0,
  });
  const [focusTip, setFocusTip] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [tasks, habits, focusStats] = await Promise.all([
        api.getTasks(),
        api.getHabits(),
        api.getFocusStats(),
      ]);

      setStats({
        tasks: tasks.filter((t: any) => !t.completed).length,
        habits: habits.length,
        focusMinutes: focusStats.total_minutes || 0,
        upcomingEvents: 0,
      });

      // Get AI focus tip
      const tipResponse = await api.getFocusTip();
      setFocusTip(tipResponse.tip);
    } catch (error: any) {
      console.error('Dashboard load error:', error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.logout();
              await AsyncStorage.removeItem('auth_token');
              storeLogout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  }

  const features = [
    { title: 'Tasks', icon: 'checkbox', route: '/tasks', color: '#4A90E2', count: stats.tasks },
    { title: 'Focus', icon: 'timer', route: '/focus', color: '#7B68EE', count: `${Math.floor(stats.focusMinutes / 60)}h` },
    { title: 'Habits', icon: 'flame', route: '/habits', color: '#50C878', count: stats.habits },
    { title: 'Notes', icon: 'document-text', route: '/notes', color: '#FFD700', count: null },
    { title: 'Chores', icon: 'home', route: '/chores', color: '#2ECC71', count: null },
    { title: 'School', icon: 'school', route: '/school', color: '#6A5ACD', count: null },
    { title: 'Mood', icon: 'happy', route: '/mood', color: '#FF69B4', count: null },
    { title: 'Exercise', icon: 'fitness', route: '/exercise', color: '#1ABC9C', count: null },
    { title: 'Hydration', icon: 'water', route: '/hydration', color: '#87CEEB', count: null },
    { title: 'Medications', icon: 'medical', route: '/medications', color: '#FF6B6B', count: null },
    { title: 'Money', icon: 'cash', route: '/expenses', color: '#FFB84D', count: null },
    { title: 'Events', icon: 'calendar', route: '/events', color: '#9B59B6', count: null },
    { title: 'Birthdays', icon: 'gift', route: '/birthdays', color: '#E74C3C', count: null },
    { title: 'Routines', icon: 'list', route: '/routines', color: '#3498DB', count: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* AI Focus Tip */}
        {focusTip ? (
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color="#FFB84D" />
            <Text style={styles.tipText}>{focusTip}</Text>
          </View>
        ) : null}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="checkbox" size={32} color="#4A90E2" />
            <Text style={styles.statNumber}>{stats.tasks}</Text>
            <Text style={styles.statLabel}>Active Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#50C878" />
            <Text style={styles.statNumber}>{stats.habits}</Text>
            <Text style={styles.statLabel}>Habits</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="timer" size={32} color="#7B68EE" />
            <Text style={styles.statNumber}>{Math.floor(stats.focusMinutes / 60)}h</Text>
            <Text style={styles.statLabel}>Focused</Text>
          </View>
        </View>

        {/* Features Grid */}
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.title}
              style={[styles.featureCard, { borderLeftColor: feature.color }]}
              onPress={() => router.push(feature.route as any)}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <Ionicons name={feature.icon as any} size={28} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              {feature.count !== null && (
                <Text style={styles.featureCount}>{feature.count}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 4,
  },
  tipCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  featuresGrid: {
    padding: 16,
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 16,
  },
  featureCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
});
