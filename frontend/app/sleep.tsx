import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function SleepScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({ average_duration: 0, average_quality: 0, recent_logs: [], consistency_score: 0, meeting_goal: false });
  const [modalVisible, setModalVisible] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [newLog, setNewLog] = useState({ bedtime: new Date().toISOString(), wake_time: new Date().toISOString(), quality: 3, felt_rested: false, notes: '' });
  const [goal, setGoal] = useState({ target_bedtime: '22:00', target_wake_time: '06:00', target_hours: 8 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsData, goalData] = await Promise.all([api.getSleepStats(), api.getSleepGoal()]);
      setStats(statsData);
      if (goalData) {
        setGoal({ target_bedtime: goalData.target_bedtime, target_wake_time: goalData.target_wake_time, target_hours: goalData.target_hours });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleLogSleep() {
    try {
      await api.logSleep(newLog);
      setModalVisible(false);
      setNewLog({ bedtime: new Date().toISOString(), wake_time: new Date().toISOString(), quality: 3, felt_rested: false, notes: '' });
      loadData();
      Alert.alert('😴 Logged!', 'Sleep data recorded');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleSaveGoal() {
    try {
      await api.setSleepGoal(goal);
      setGoalModal(false);
      loadData();
      Alert.alert('✅ Goal Set', 'Your sleep goals have been updated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
          <Text style={styles.title}>Sleep Tracker</Text>
          <TouchableOpacity onPress={() => setGoalModal(true)}><Ionicons name="settings-outline" size={24} color="#1A1A1A" /></TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, stats.meeting_goal && styles.statCardSuccess]}>
            <Ionicons name="moon" size={32} color={stats.meeting_goal ? '#50C878' : '#7B68EE'} />
            <Text style={styles.statValue}>{stats.average_duration}h</Text>
            <Text style={styles.statLabel}>Avg Sleep</Text>
            <Text style={styles.goalText}>Goal: {stats.target_hours || 8}h</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#FFD700" />
            <Text style={styles.statValue}>{stats.average_quality}/5</Text>
            <Text style={styles.statLabel}>Quality</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="analytics" size={32} color="#4A90E2" />
            <Text style={styles.statValue}>{stats.consistency_score}%</Text>
            <Text style={styles.statLabel}>Consistency</Text>
          </View>
        </View>

        {stats.rested_percentage !== undefined && (
          <View style={styles.restedCard}>
            <Text style={styles.restedText}>
              😊 You felt rested {stats.rested_percentage}% of the time
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Recent Sleep Log</Text>
        {stats.recent_logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bed-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No sleep logs yet</Text>
          </View>
        ) : (
          stats.recent_logs.map((log: any) => (
            <View key={log.sleep_id} style={styles.logCard}>
              <Ionicons name="moon" size={24} color="#7B68EE" />
              <View style={styles.logContent}>
                <Text style={styles.logDate}>{format(new Date(log.wake_time), 'MMM dd')}</Text>
                <Text style={styles.logTime}>
                  {format(new Date(log.bedtime), 'h:mm a')} → {format(new Date(log.wake_time), 'h:mm a')}
                </Text>
                <View style={styles.logDetails}>
                  <Text style={styles.duration}>{log.duration_hours}h</Text>
                  <View style={styles.stars}>
                    {[1,2,3,4,5].map(i => (
                      <Ionicons key={i} name={i <= log.quality ? 'star' : 'star-outline'} size={12} color="#FFD700" />
                    ))}
                  </View>
                  {log.felt_rested && <Ionicons name="happy" size={16} color="#50C878" />}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Log Sleep</Text>
            <TouchableOpacity onPress={handleLogSleep}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Bedtime</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD HH:MM" value={newLog.bedtime} onChangeText={(text) => setNewLog({ ...newLog, bedtime: text })} placeholderTextColor="#999" />
            
            <Text style={styles.label}>Wake Time</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD HH:MM" value={newLog.wake_time} onChangeText={(text) => setNewLog({ ...newLog, wake_time: text })} placeholderTextColor="#999" />
            
            <Text style={styles.label}>Quality ({newLog.quality}/5)</Text>
            <View style={styles.qualityButtons}>
              {[1,2,3,4,5].map(q => (
                <TouchableOpacity key={q} style={[styles.qualityButton, newLog.quality === q && styles.qualityButtonActive]} onPress={() => setNewLog({ ...newLog, quality: q })}>
                  <Ionicons name="star" size={24} color={newLog.quality === q ? '#FFD700' : '#CCC'} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.restedToggle} onPress={() => setNewLog({ ...newLog, felt_rested: !newLog.felt_rested })}>
              <Ionicons name={newLog.felt_rested ? 'checkbox' : 'square-outline'} size={24} color="#4A90E2" />
              <Text style={styles.restedToggleText}>I felt rested</Text>
            </TouchableOpacity>

            <TextInput style={[styles.input, styles.textArea]} placeholder="Notes (optional)" value={newLog.notes} onChangeText={(text) => setNewLog({ ...newLog, notes: text })} multiline numberOfLines={3} placeholderTextColor="#999" />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={goalModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setGoalModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Sleep Goals</Text>
            <TouchableOpacity onPress={handleSaveGoal}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Target Bedtime (HH:MM)</Text>
            <TextInput style={styles.input} placeholder="22:00" value={goal.target_bedtime} onChangeText={(text) => setGoal({ ...goal, target_bedtime: text })} placeholderTextColor="#999" />
            
            <Text style={styles.label}>Target Wake Time (HH:MM)</Text>
            <TextInput style={styles.input} placeholder="06:00" value={goal.target_wake_time} onChangeText={(text) => setGoal({ ...goal, target_wake_time: text })} placeholderTextColor="#999" />
            
            <Text style={styles.label}>Target Hours</Text>
            <TextInput style={styles.input} placeholder="8" value={String(goal.target_hours)} onChangeText={(text) => setGoal({ ...goal, target_hours: parseFloat(text) || 8 })} keyboardType="decimal-pad" placeholderTextColor="#999" />
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
  statCardSuccess: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#50C878' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  goalText: { fontSize: 10, color: '#999', marginTop: 2 },
  restedCard: { backgroundColor: '#FFF', margin: 16, marginTop: 0, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  restedText: { fontSize: 14, color: '#666', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginHorizontal: 24, marginTop: 8, marginBottom: 12 },
  logCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  logContent: { flex: 1, marginLeft: 12 },
  logDate: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  logTime: { fontSize: 12, color: '#666', marginTop: 4 },
  logDetails: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  duration: { fontSize: 12, fontWeight: '600', color: '#7B68EE' },
  stars: { flexDirection: 'row', gap: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#7B68EE', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#7B68EE' },
  modalContent: { padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 80, textAlignVertical: 'top' },
  qualityButtons: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  qualityButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  qualityButtonActive: { borderColor: '#FFD700', borderWidth: 2 },
  restedToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  restedToggleText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginLeft: 12 },
});
