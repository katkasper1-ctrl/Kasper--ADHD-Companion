import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const EXERCISE_TYPES = [
  { name: 'Walking', icon: 'walk', color: '#4A90E2' },
  { name: 'Running', icon: 'fitness', color: '#FF6B6B' },
  { name: 'Cycling', icon: 'bicycle', color: '#50C878' },
  { name: 'Yoga', icon: 'body', color: '#9B59B6' },
  { name: 'Strength', icon: 'barbell', color: '#E74C3C' },
  { name: 'Swimming', icon: 'water', color: '#3498DB' },
  { name: 'Dancing', icon: 'musical-notes', color: '#FFB84D' },
  { name: 'Sports', icon: 'football', color: '#1ABC9C' },
];

export default function ExerciseScreen() {
  const router = useRouter();
  const [todayData, setTodayData] = useState<any>({ total_minutes: 0, total_calories: 0, session_count: 0, logs: [] });
  const [modalVisible, setModalVisible] = useState(false);
  const [newExercise, setNewExercise] = useState({ type: 'Walking', duration_minutes: '', intensity: 'moderate', calories: '' });

  useEffect(() => { loadTodayData(); }, []);

  async function loadTodayData() {
    try {
      const data = await api.getTodayExercise();
      setTodayData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleLogExercise() {
    const duration = parseInt(newExercise.duration_minutes);
    if (!duration || duration <= 0) {
      Alert.alert('Error', 'Please enter duration');
      return;
    }

    try {
      const data: any = {
        type: newExercise.type,
        duration_minutes: duration,
        intensity: newExercise.intensity,
      };
      if (newExercise.calories) {
        data.calories = parseInt(newExercise.calories);
      }
      await api.logExercise(data);
      setNewExercise({ type: 'Walking', duration_minutes: '', intensity: 'moderate', calories: '' });
      setModalVisible(false);
      loadTodayData();
      Alert.alert('🏃 Great job!', `Logged ${duration} min of ${newExercise.type}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(exerciseId: string) {
    Alert.alert('Delete Log', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteExerciseLog(exerciseId);
          loadTodayData();
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
          <Text style={styles.title}>Exercise</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#4A90E2" />
            <Text style={styles.statValue}>{todayData.total_minutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#FF6B6B" />
            <Text style={styles.statValue}>{todayData.total_calories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={32} color="#50C878" />
            <Text style={styles.statValue}>{todayData.session_count}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        <View style={styles.logContainer}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          {todayData.logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No exercise logged yet</Text>
              <Text style={styles.emptySubtext}>Tap + to log your workout!</Text>
            </View>
          ) : (
            todayData.logs.map((log: any) => (
              <View key={log.exercise_id} style={styles.logCard}>
                <View style={styles.logContent}>
                  <View style={[styles.iconContainer, { backgroundColor: EXERCISE_TYPES.find(t => t.name === log.type)?.color + '20' || '#4A90E2' }]}>
                    <Ionicons name={EXERCISE_TYPES.find(t => t.name === log.type)?.icon as any || 'fitness'} size={24} color={EXERCISE_TYPES.find(t => t.name === log.type)?.color || '#4A90E2'} />
                  </View>
                  <View style={styles.logDetails}>
                    <Text style={styles.logType}>{log.type}</Text>
                    <Text style={styles.logInfo}>{log.duration_minutes} min · {log.intensity}</Text>
                    <Text style={styles.logTime}>{format(new Date(log.timestamp), 'h:mm a')}</Text>
                  </View>
                  {log.calories && <Text style={styles.calories}>{log.calories} cal</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(log.exercise_id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Log Exercise</Text>
            <TouchableOpacity onPress={handleLogExercise}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Exercise Type</Text>
            <View style={styles.exerciseGrid}>
              {EXERCISE_TYPES.map((exercise) => (
                <TouchableOpacity
                  key={exercise.name}
                  style={[styles.exerciseOption, newExercise.type === exercise.name && { borderColor: exercise.color, borderWidth: 2 }]}
                  onPress={() => setNewExercise({ ...newExercise, type: exercise.name })}
                >
                  <Ionicons name={exercise.icon as any} size={32} color={exercise.color} />
                  <Text style={styles.exerciseOptionText}>{exercise.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput style={styles.input} placeholder="e.g., 30" value={newExercise.duration_minutes} onChangeText={(text) => setNewExercise({ ...newExercise, duration_minutes: text })} keyboardType="number-pad" placeholderTextColor="#999" />

            <Text style={styles.label}>Intensity</Text>
            <View style={styles.intensityButtons}>
              {['light', 'moderate', 'intense'].map((intensity) => (
                <TouchableOpacity
                  key={intensity}
                  style={[styles.intensityButton, newExercise.intensity === intensity && styles.intensityButtonActive]}
                  onPress={() => setNewExercise({ ...newExercise, intensity })}
                >
                  <Text style={[styles.intensityButtonText, newExercise.intensity === intensity && styles.intensityButtonTextActive]}>{intensity}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Calories (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g., 200" value={newExercise.calories} onChangeText={(text) => setNewExercise({ ...newExercise, calories: text })} keyboardType="number-pad" placeholderTextColor="#999" />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  logContainer: { padding: 24, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 },
  logCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  logContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  logDetails: { marginLeft: 12, flex: 1 },
  logType: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  logInfo: { fontSize: 14, color: '#666', marginTop: 4 },
  logTime: { fontSize: 12, color: '#999', marginTop: 2 },
  calories: { fontSize: 14, fontWeight: '600', color: '#FF6B6B', marginRight: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#50C878', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#50C878' },
  modalContent: { padding: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12, marginTop: 16 },
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  exerciseOption: { width: '23%', backgroundColor: '#FFF', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  exerciseOptionText: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  intensityButtons: { flexDirection: 'row', gap: 12 },
  intensityButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  intensityButtonActive: { backgroundColor: '#50C878', borderColor: '#50C878' },
  intensityButtonText: { fontSize: 14, fontWeight: '600', color: '#666', textTransform: 'capitalize' },
  intensityButtonTextActive: { color: '#FFF' },
});
