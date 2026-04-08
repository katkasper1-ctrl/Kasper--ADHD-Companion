import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Image, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import EXERCISE_TIPS, { getExerciseImage, ExerciseTip } from '../constants/exerciseTips';

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

function TipDetailModal({ tip, visible, onClose }: { tip: ExerciseTip | null; visible: boolean; onClose: () => void }) {
  if (!tip) return null;
  const imageUri = getExerciseImage(tip.imageKey);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={tipDetailStyles.container}>
        <View style={tipDetailStyles.header}>
          <TouchableOpacity onPress={onClose} style={tipDetailStyles.closeBtn}>
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={tipDetailStyles.headerTitle}>{tip.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={tipDetailStyles.content} showsVerticalScrollIndicator={false}>
          {imageUri && (
            <View style={tipDetailStyles.imageWrapper}>
              <Image
                source={{ uri: imageUri }}
                style={tipDetailStyles.image}
                resizeMode="cover"
              />
              <View style={[tipDetailStyles.difficultyBadge, { backgroundColor: tip.color }]}>
                <Text style={tipDetailStyles.difficultyText}>{tip.difficulty}</Text>
              </View>
            </View>
          )}

          <View style={tipDetailStyles.metaRow}>
            <View style={tipDetailStyles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={tipDetailStyles.metaText}>{tip.duration}</Text>
            </View>
            <View style={tipDetailStyles.metaItem}>
              <Ionicons name="body-outline" size={18} color="#666" />
              <Text style={tipDetailStyles.metaText}>{tip.muscles}</Text>
            </View>
          </View>

          <View style={tipDetailStyles.section}>
            <View style={tipDetailStyles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={tip.color} />
              <Text style={tipDetailStyles.sectionTitle}>How To Do It</Text>
            </View>
            {tip.steps.map((step, index) => (
              <View key={index} style={tipDetailStyles.stepRow}>
                <View style={[tipDetailStyles.stepNumber, { backgroundColor: tip.color }]}>
                  <Text style={tipDetailStyles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={tipDetailStyles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={tipDetailStyles.section}>
            <View style={tipDetailStyles.sectionHeader}>
              <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
              <Text style={tipDetailStyles.sectionTitle}>Benefits</Text>
            </View>
            {tip.benefits.map((benefit, index) => (
              <View key={index} style={tipDetailStyles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#50C878" />
                <Text style={tipDetailStyles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={[tipDetailStyles.adhdBox, { borderLeftColor: tip.color }]}>
            <View style={tipDetailStyles.adhdHeader}>
              <Ionicons name="bulb-outline" size={20} color={tip.color} />
              <Text style={[tipDetailStyles.adhdTitle, { color: tip.color }]}>ADHD Tip</Text>
            </View>
            <Text style={tipDetailStyles.adhdText}>{tip.adhdTip}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ExerciseScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'activity' | 'tips'>('activity');
  const [todayData, setTodayData] = useState<any>({ total_minutes: 0, total_calories: 0, session_count: 0, logs: [] });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTip, setSelectedTip] = useState<ExerciseTip | null>(null);
  const [tipDetailVisible, setTipDetailVisible] = useState(false);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
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

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Ionicons name="today-outline" size={18} color={activeTab === 'activity' ? '#FFF' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Today's Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tips' && styles.tabActive]}
            onPress={() => setActiveTab('tips')}
          >
            <Ionicons name="bulb-outline" size={18} color={activeTab === 'tips' ? '#FFF' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'tips' && styles.tabTextActive]}>Exercise Tips</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'activity' ? (
          <View style={styles.logContainer}>
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
                    <View style={[styles.iconContainer, { backgroundColor: (EXERCISE_TYPES.find(t => t.name === log.type)?.color || '#4A90E2') + '20' }]}>
                      <Ionicons name={(EXERCISE_TYPES.find(t => t.name === log.type)?.icon as any) || 'fitness'} size={24} color={EXERCISE_TYPES.find(t => t.name === log.type)?.color || '#4A90E2'} />
                    </View>
                    <View style={styles.logDetails}>
                      <Text style={styles.logType}>{log.type}</Text>
                      <Text style={styles.logInfo}>{log.duration_minutes} min · {log.intensity}</Text>
                      <Text style={styles.logTime}>{format(new Date(log.timestamp), 'h:mm a')}</Text>
                    </View>
                    {log.calories ? <Text style={styles.calories}>{log.calories} cal</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(log.exercise_id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsIntro}>
              Easy exercises designed for ADHD minds. Tap any card to see step-by-step instructions!
            </Text>
            {EXERCISE_TIPS.map((tip) => {
              const imageUri = getExerciseImage(tip.imageKey);
              return (
                <TouchableOpacity
                  key={tip.id}
                  style={styles.tipCard}
                  onPress={() => { setSelectedTip(tip); setTipDetailVisible(true); }}
                  activeOpacity={0.85}
                >
                  {imageUri && (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.tipImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.tipCardContent}>
                    <View style={styles.tipHeaderRow}>
                      <View style={[styles.tipIcon, { backgroundColor: tip.color + '20' }]}>
                        <Ionicons name={tip.icon as any} size={22} color={tip.color} />
                      </View>
                      <View style={styles.tipInfo}>
                        <Text style={styles.tipTitle}>{tip.title}</Text>
                        <View style={styles.tipMeta}>
                          <View style={[styles.tipBadge, { backgroundColor: tip.color + '15' }]}>
                            <Text style={[styles.tipBadgeText, { color: tip.color }]}>{tip.difficulty}</Text>
                          </View>
                          <Text style={styles.tipDuration}>
                            <Ionicons name="time-outline" size={12} color="#999" /> {tip.duration}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </View>
                    <Text style={styles.tipMuscles}>{tip.muscles}</Text>
                    <View style={styles.tipPreviewSteps}>
                      {tip.steps.slice(0, 2).map((step, i) => (
                        <View key={i} style={styles.tipPreviewStep}>
                          <View style={[styles.miniDot, { backgroundColor: tip.color }]} />
                          <Text style={styles.tipPreviewStepText} numberOfLines={1}>{step}</Text>
                        </View>
                      ))}
                      <Text style={styles.tipMoreSteps}>+ {tip.steps.length - 2} more steps...</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 80 }} />
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <TipDetailModal
        tip={selectedTip}
        visible={tipDetailVisible}
        onClose={() => setTipDetailVisible(false)}
      />

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },

  // Tab Bar
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: '#ECEDF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#50C878', shadowColor: '#50C878', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Activity Tab
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
  deleteBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8 },

  // Tips Tab
  tipsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  tipsIntro: { fontSize: 14, color: '#666', marginBottom: 16, paddingHorizontal: 8, lineHeight: 20 },
  tipCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  tipImage: { width: '100%', height: 160, backgroundColor: '#E8E8E8' },
  tipCardContent: { padding: 16 },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  tipIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipInfo: { flex: 1, marginLeft: 12 },
  tipTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  tipMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
  tipBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tipBadgeText: { fontSize: 11, fontWeight: '700' },
  tipDuration: { fontSize: 12, color: '#999' },
  tipMuscles: { fontSize: 13, color: '#888', marginTop: 10, marginLeft: 56 },
  tipPreviewSteps: { marginTop: 10, marginLeft: 56 },
  tipPreviewStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  tipPreviewStepText: { fontSize: 13, color: '#555', flex: 1 },
  tipMoreSteps: { fontSize: 12, color: '#AAA', marginTop: 4, fontStyle: 'italic' },

  // FAB
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#50C878', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  // Modal
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

const tipDetailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { flex: 1 },
  imageWrapper: { position: 'relative' },
  image: { width: '100%', height: 220, backgroundColor: '#E0E0E0' },
  difficultyBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  difficultyText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: '#555', fontWeight: '500' },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1 },
  stepNumberText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 15, color: '#444', flex: 1 },
  adhdBox: { marginHorizontal: 20, marginTop: 4, padding: 16, backgroundColor: '#FFFBF0', borderLeftWidth: 4, borderRadius: 12 },
  adhdHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  adhdTitle: { fontSize: 15, fontWeight: '700' },
  adhdText: { fontSize: 14, color: '#555', lineHeight: 22 },
});
