import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const ROOMS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Laundry', 'Outdoor', 'Other'];
const DAYS = [
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
  { label: 'Sat', value: 'sat' },
  { label: 'Sun', value: 'sun' },
];

export default function ChoresScreen() {
  const router = useRouter();
  const [view, setView] = useState('today'); // 'today' or 'all'
  const [todayChores, setTodayChores] = useState<any[]>([]);
  const [allChores, setAllChores] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChore, setNewChore] = useState({ name: '', frequency: 'weekly', days: ['mon'], room: '' });

  useEffect(() => { loadChores(); }, []);

  async function loadChores() {
    try {
      const [today, all] = await Promise.all([api.getTodayChores(), api.getChores()]);
      setTodayChores(today);
      setAllChores(all);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreate() {
    if (!newChore.name.trim()) {
      Alert.alert('Error', 'Please enter chore name');
      return;
    }
    try {
      await api.createChore(newChore);
      setNewChore({ name: '', frequency: 'weekly', days: ['mon'], room: '' });
      setModalVisible(false);
      loadChores();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleComplete(choreId: string) {
    try {
      const result = await api.completeChore(choreId);
      Alert.alert('✅ Great!', result.message);
      loadChores();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(choreId: string) {
    Alert.alert('Delete Chore', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteChore(choreId);
          loadChores();
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  }

  function toggleDay(day: string) {
    const days = newChore.days.includes(day)
      ? newChore.days.filter(d => d !== day)
      : [...newChore.days, day];
    setNewChore({ ...newChore, days });
  }

  const displayChores = view === 'today' ? todayChores : allChores;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.title}>Chores</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, view === 'today' && styles.tabActive]} onPress={() => setView('today')}>
          <Text style={[styles.tabText, view === 'today' && styles.tabTextActive]}>Today ({todayChores.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'all' && styles.tabActive]} onPress={() => setView('all')}>
          <Text style={[styles.tabText, view === 'all' && styles.tabTextActive]}>All Chores</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayChores}
        keyExtractor={(item) => item.chore_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.choreCard}>
            <TouchableOpacity onPress={() => handleComplete(item.chore_id)}>
              <Ionicons name={item.completed_today ? 'checkmark-circle' : 'ellipse-outline'} size={32} color={item.completed_today ? '#50C878' : '#CCC'} />
            </TouchableOpacity>
            <View style={styles.choreContent}>
              <Text style={[styles.choreName, item.completed_today && styles.choreCompleted]}>{item.name}</Text>
              <View style={styles.choreInfo}>
                {item.room && <Text style={styles.roomBadge}>{item.room}</Text>}
                <Text style={styles.frequency}>{item.frequency}</Text>
                {item.current_streak > 0 && (
                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={14} color="#FF6B6B" />
                    <Text style={styles.streakText}>{item.current_streak}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.chore_id)}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>{view === 'today' ? 'No chores today!' : 'No chores yet'}</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Chore</Text>
            <TouchableOpacity onPress={handleCreate}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Chore name" value={newChore.name} onChangeText={(text) => setNewChore({ ...newChore, name: text })} placeholderTextColor="#999" />
            
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyButtons}>
              {['daily', 'weekly', 'monthly'].map((freq) => (
                <TouchableOpacity key={freq} style={[styles.freqButton, newChore.frequency === freq && styles.freqButtonActive]} onPress={() => setNewChore({ ...newChore, frequency: freq })}>
                  <Text style={[styles.freqButtonText, newChore.frequency === freq && styles.freqButtonTextActive]}>{freq}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {newChore.frequency === 'weekly' && (
              <>
                <Text style={styles.label}>Days</Text>
                <View style={styles.daysGrid}>
                  {DAYS.map((day) => (
                    <TouchableOpacity key={day.value} style={[styles.dayButton, newChore.days.includes(day.value) && styles.dayButtonActive]} onPress={() => toggleDay(day.value)}>
                      <Text style={[styles.dayButtonText, newChore.days.includes(day.value) && styles.dayButtonTextActive]}>{day.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Room (optional)</Text>
            <View style={styles.roomsGrid}>
              {ROOMS.map((room) => (
                <TouchableOpacity key={room} style={[styles.roomChip, newChore.room === room && styles.roomChipActive]} onPress={() => setNewChore({ ...newChore, room })}>
                  <Text style={[styles.roomChipText, newChore.room === room && styles.roomChipTextActive]}>{room}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  tabs: { flexDirection: 'row', padding: 16, gap: 8 },
  tab: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#E0E0E0', alignItems: 'center' },
  tabActive: { backgroundColor: '#50C878' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },
  list: { padding: 16 },
  choreCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  choreContent: { flex: 1, marginLeft: 12 },
  choreName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  choreCompleted: { textDecorationLine: 'line-through', color: '#999' },
  choreInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomBadge: { fontSize: 11, color: '#666', backgroundColor: '#E0E0E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  frequency: { fontSize: 11, color: '#999', textTransform: 'capitalize' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakText: { fontSize: 11, fontWeight: 'bold', color: '#FF6B6B' },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#50C878', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#50C878' },
  modalContent: { padding: 24 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 8 },
  frequencyButtons: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  freqButtonActive: { backgroundColor: '#50C878', borderColor: '#50C878' },
  freqButtonText: { fontSize: 14, fontWeight: '600', color: '#666', textTransform: 'capitalize' },
  freqButtonTextActive: { color: '#FFF' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayButton: { width: '13%', padding: 8, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  dayButtonActive: { backgroundColor: '#50C878', borderColor: '#50C878' },
  dayButtonText: { fontSize: 12, fontWeight: '600', color: '#666' },
  dayButtonTextActive: { color: '#FFF' },
  roomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roomChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E0E0E0' },
  roomChipActive: { backgroundColor: '#50C878' },
  roomChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  roomChipTextActive: { color: '#FFF' },
});
