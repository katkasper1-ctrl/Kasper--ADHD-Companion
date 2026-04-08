import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { format } from 'date-fns';

const MOODS = [
  { name: 'Happy', emoji: '😊', color: '#FFD700' },
  { name: 'Excited', emoji: '🤩', color: '#FF6B6B' },
  { name: 'Calm', emoji: '😌', color: '#87CEEB' },
  { name: 'Energetic', emoji: '⚡', color: '#FFB84D' },
  { name: 'Grateful', emoji: '🙏', color: '#50C878' },
  { name: 'Confident', emoji: '💪', color: '#9B59B6' },
  { name: 'Sad', emoji: '😢', color: '#6495ED' },
  { name: 'Anxious', emoji: '😰', color: '#FFA07A' },
  { name: 'Tired', emoji: '😴', color: '#B0C4DE' },
  { name: 'Frustrated', emoji: '😤', color: '#F08080' },
  { name: 'Overwhelmed', emoji: '😵', color: '#DDA0DD' },
  { name: 'Lonely', emoji: '😔', color: '#778899' },
];

export default function MoodScreen() {
  const router = useRouter();
  const [todayData, setTodayData] = useState<any>({ check_in_count: 0, logs: [], latest_mood: null, latest_emoji: null });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => { loadTodayData(); }, []);

  async function loadTodayData() {
    try {
      const data = await api.getTodayMood();
      setTodayData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleLogMood() {
    try {
      await api.logMood({
        mood: selectedMood.name,
        emoji: selectedMood.emoji,
        intensity,
        notes
      });
      setNotes('');
      setIntensity(3);
      setModalVisible(false);
      loadTodayData();
      Alert.alert(`${selectedMood.emoji} Logged!`, 'Thanks for checking in with yourself');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(moodId: string) {
    Alert.alert('Delete Entry', 'Remove this mood log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteMoodLog(moodId);
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>How are you feeling?</Text>
          <View style={{ width: 24 }} />
        </View>

        {todayData.latest_emoji && (
          <View style={styles.currentMoodCard}>
            <Text style={styles.currentMoodEmoji}>{todayData.latest_emoji}</Text>
            <Text style={styles.currentMoodLabel}>Current mood: {todayData.latest_mood}</Text>
            <Text style={styles.checkInCount}>{todayData.check_in_count} check-in{todayData.check_in_count !== 1 ? 's' : ''} today</Text>
          </View>
        )}

        <View style={styles.quickMoodContainer}>
          <Text style={styles.sectionTitle}>Quick Check-in</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.name}
                style={styles.moodOption}
                onPress={() => {
                  setSelectedMood(mood);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodName}>{mood.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.logContainer}>
          <Text style={styles.sectionTitle}>Today's Timeline</Text>
          {todayData.logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💭</Text>
              <Text style={styles.emptyText}>No mood check-ins yet</Text>
              <Text style={styles.emptySubtext}>Tap an emoji above to track how you're feeling</Text>
            </View>
          ) : (
            todayData.logs.map((log: any) => (
              <View key={log.mood_id} style={styles.logCard}>
                <Text style={styles.logEmoji}>{log.emoji}</Text>
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logMood}>{log.mood}</Text>
                    <Text style={styles.logTime}>{format(new Date(log.timestamp), 'h:mm a')}</Text>
                  </View>
                  <View style={styles.intensityBar}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.intensityDot,
                          level <= log.intensity && { backgroundColor: MOODS.find(m => m.name === log.mood)?.color || '#4A90E2' }
                        ]}
                      />
                    ))}
                  </View>
                  {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(log.mood_id)}>
                  <Text style={styles.deleteButton}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Feeling {selectedMood.name}</Text>
            <TouchableOpacity onPress={handleLogMood}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.selectedMoodDisplay}>
              <Text style={styles.selectedMoodEmoji}>{selectedMood.emoji}</Text>
              <Text style={styles.selectedMoodName}>{selectedMood.name}</Text>
            </View>

            <Text style={styles.label}>How intense? ({intensity}/5)</Text>
            <View style={styles.intensitySlider}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.intensityButton,
                    intensity === level && { backgroundColor: selectedMood.color }
                  ]}
                  onPress={() => setIntensity(level)}
                >
                  <Text style={[styles.intensityButtonText, intensity === level && { color: '#FFF' }]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's on your mind?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 16 },
  backButton: { fontSize: 32, color: '#1A1A1A' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  currentMoodCard: { backgroundColor: '#FFF', margin: 16, marginTop: 0, padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  currentMoodEmoji: { fontSize: 64 },
  currentMoodLabel: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginTop: 12 },
  checkInCount: { fontSize: 14, color: '#666', marginTop: 4 },
  quickMoodContainer: { padding: 24, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moodOption: { width: '22.5%', aspectRatio: 1, backgroundColor: '#FFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  moodEmoji: { fontSize: 36 },
  moodName: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  logContainer: { padding: 24, paddingTop: 0 },
  logCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  logEmoji: { fontSize: 40, marginRight: 12 },
  logContent: { flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logMood: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  logTime: { fontSize: 12, color: '#999' },
  intensityBar: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  intensityDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E0E0E0' },
  logNotes: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  deleteButton: { fontSize: 32, color: '#FF6B6B', fontWeight: '300' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 64 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#4A90E2' },
  modalContent: { padding: 24 },
  selectedMoodDisplay: { alignItems: 'center', padding: 32 },
  selectedMoodEmoji: { fontSize: 96 },
  selectedMoodName: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginTop: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12, marginTop: 16 },
  intensitySlider: { flexDirection: 'row', gap: 8 },
  intensityButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  intensityButtonText: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 100, textAlignVertical: 'top' },
});
