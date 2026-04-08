import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Image, Modal, TextInput, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import YOGA_POSES, { getYogaImage, YogaPose } from '../constants/yogaPoses';

const FEELING_OPTIONS = [
  { emoji: '🤩', label: 'Amazing', value: 'amazing' },
  { emoji: '😌', label: 'Relaxed', value: 'relaxed' },
  { emoji: '💪', label: 'Strong', value: 'strong' },
  { emoji: '😊', label: 'Good', value: 'good' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😣', label: 'Sore', value: 'sore' },
];

function PoseDetailModal({ pose, visible, onClose, onLogSession }: {
  pose: YogaPose | null; visible: boolean; onClose: () => void;
  onLogSession: (pose: YogaPose) => void;
}) {
  if (!pose) return null;
  const imageUri = getYogaImage(pose.imageKey);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={dm.container}>
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={dm.headerTitle}>{pose.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={dm.content} showsVerticalScrollIndicator={false}>
          {imageUri && (
            <View style={dm.imageWrapper}>
              <Image source={{ uri: imageUri }} style={dm.image} resizeMode="cover" />
              <View style={[dm.diffBadge, { backgroundColor: pose.color }]}>
                <Text style={dm.diffText}>{pose.difficulty}</Text>
              </View>
            </View>
          )}

          <View style={dm.metaRow}>
            <View style={dm.metaItem}>
              <Text style={dm.sanskritText}>{pose.sanskrit}</Text>
            </View>
            <View style={dm.metaItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={dm.metaText}>{pose.duration}</Text>
            </View>
          </View>

          {/* Body Parts */}
          <View style={dm.section}>
            <View style={dm.sectionHeader}>
              <Ionicons name="body-outline" size={20} color={pose.color} />
              <Text style={dm.sectionTitle}>Body Parts This Pose Helps</Text>
            </View>
            <View style={dm.bodyPartsGrid}>
              {pose.bodyParts.map((bp, i) => (
                <View key={i} style={[dm.bodyPartChip, { backgroundColor: bp.color + '15', borderColor: bp.color + '30' }]}>
                  <Ionicons name={bp.icon as any} size={18} color={bp.color} />
                  <Text style={[dm.bodyPartText, { color: bp.color }]}>{bp.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View style={dm.section}>
            <View style={dm.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={pose.color} />
              <Text style={dm.sectionTitle}>How To Do It</Text>
            </View>
            {pose.steps.map((step, i) => (
              <View key={i} style={dm.stepRow}>
                <View style={[dm.stepNum, { backgroundColor: pose.color }]}>
                  <Text style={dm.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={dm.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Benefits */}
          <View style={dm.section}>
            <View style={dm.sectionHeader}>
              <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
              <Text style={dm.sectionTitle}>Benefits</Text>
            </View>
            {pose.benefits.map((b, i) => (
              <View key={i} style={dm.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#50C878" />
                <Text style={dm.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Breathing Tip */}
          <View style={[dm.tipBox, { borderLeftColor: '#4A90E2' }]}>
            <View style={dm.tipHeader}>
              <Ionicons name="cloud-outline" size={20} color="#4A90E2" />
              <Text style={[dm.tipTitle, { color: '#4A90E2' }]}>Breathing Tip</Text>
            </View>
            <Text style={dm.tipText}>{pose.breathingTip}</Text>
          </View>

          {/* ADHD Tip */}
          <View style={[dm.tipBox, { borderLeftColor: pose.color }]}>
            <View style={dm.tipHeader}>
              <Ionicons name="bulb-outline" size={20} color={pose.color} />
              <Text style={[dm.tipTitle, { color: pose.color }]}>ADHD Tip</Text>
            </View>
            <Text style={dm.tipText}>{pose.adhdTip}</Text>
          </View>

          {/* Log Session Button */}
          <TouchableOpacity
            style={[dm.logBtn, { backgroundColor: pose.color }]}
            onPress={() => { onClose(); setTimeout(() => onLogSession(pose), 300); }}
          >
            <Ionicons name="checkmark-done" size={22} color="#FFF" />
            <Text style={dm.logBtnText}>I Did This Pose!</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function YogaScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'poses' | 'sessions'>('poses');
  const [selectedPose, setSelectedPose] = useState<YogaPose | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Log modal
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logPose, setLogPose] = useState<YogaPose | null>(null);
  const [logDuration, setLogDuration] = useState('');
  const [logFeeling, setLogFeeling] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    try {
      const data = await api.getYogaLogs();
      setSessions(data);
    } catch (error: any) {
      console.error('Load yoga logs error:', error);
    }
  }

  async function onRefresh() { setRefreshing(true); await loadSessions(); setRefreshing(false); }

  function openLogModal(pose: YogaPose) {
    setLogPose(pose);
    setLogDuration('');
    setLogFeeling('');
    setLogNotes('');
    setLogModalVisible(true);
  }

  async function handleLogSession() {
    if (!logPose || !logDuration || !logFeeling) {
      Alert.alert('Missing Info', 'Please select duration and how you feel');
      return;
    }
    setSaving(true);
    try {
      const newSession = await api.logYogaSession({
        pose_id: logPose.id,
        pose_name: logPose.name,
        duration_minutes: parseInt(logDuration),
        body_feeling: logFeeling,
        feeling_notes: logNotes,
      });
      setSessions([newSession, ...sessions]);
      setLogModalVisible(false);
      Alert.alert('Session Logged!', `Great job completing ${logPose.name}!`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    Alert.alert('Delete Session', 'Remove this session log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteYogaLog(sessionId); setSessions(sessions.filter(s => s.session_id !== sessionId)); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  // Count sessions per pose
  const poseCounts: Record<string, number> = {};
  sessions.forEach(s => { poseCounts[s.pose_id] = (poseCounts[s.pose_id] || 0) + 1; });
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <SafeAreaView style={st.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={st.title}>Yoga</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stats Bar */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <Ionicons name="leaf" size={22} color="#7B68EE" />
            <Text style={st.statValue}>{sessions.length}</Text>
            <Text style={st.statLabel}>Sessions</Text>
          </View>
          <View style={st.statCard}>
            <Ionicons name="time" size={22} color="#50C878" />
            <Text style={st.statValue}>{totalMinutes}</Text>
            <Text style={st.statLabel}>Minutes</Text>
          </View>
          <View style={st.statCard}>
            <Ionicons name="star" size={22} color="#FFB84D" />
            <Text style={st.statValue}>{Object.keys(poseCounts).length}</Text>
            <Text style={st.statLabel}>Poses Done</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={st.tabBar}>
          <TouchableOpacity
            style={[st.tab, activeTab === 'poses' && st.tabActive]}
            onPress={() => setActiveTab('poses')}
          >
            <Ionicons name="leaf-outline" size={18} color={activeTab === 'poses' ? '#FFF' : '#666'} />
            <Text style={[st.tabText, activeTab === 'poses' && st.tabTextActive]}>Poses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tab, activeTab === 'sessions' && st.tabActive]}
            onPress={() => setActiveTab('sessions')}
          >
            <Ionicons name="journal-outline" size={18} color={activeTab === 'sessions' ? '#FFF' : '#666'} />
            <Text style={[st.tabText, activeTab === 'sessions' && st.tabTextActive]}>My Sessions</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'poses' ? (
          <View style={st.posesContainer}>
            <Text style={st.intro}>Tap any pose to learn it, then log your session!</Text>

            {YOGA_POSES.map((pose) => {
              const imageUri = getYogaImage(pose.imageKey);
              const count = poseCounts[pose.id] || 0;
              return (
                <TouchableOpacity
                  key={pose.id}
                  style={st.poseCard}
                  onPress={() => { setSelectedPose(pose); setDetailVisible(true); }}
                  activeOpacity={0.85}
                >
                  {imageUri && (
                    <Image source={{ uri: imageUri }} style={st.poseImage} resizeMode="cover" />
                  )}
                  {count > 0 && (
                    <View style={st.doneOverlay}>
                      <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      <Text style={st.doneText}>{count}x</Text>
                    </View>
                  )}
                  <View style={st.poseContent}>
                    <View style={st.poseHeaderRow}>
                      <View style={[st.poseIcon, { backgroundColor: pose.color + '20' }]}>
                        <Ionicons name={pose.icon as any} size={22} color={pose.color} />
                      </View>
                      <View style={st.poseInfo}>
                        <Text style={st.poseName}>{pose.name}</Text>
                        <Text style={st.poseSanskrit}>{pose.sanskrit}</Text>
                      </View>
                      <View style={st.poseMeta}>
                        <View style={[st.poseBadge, { backgroundColor: pose.color + '15' }]}>
                          <Text style={[st.poseBadgeText, { color: pose.color }]}>{pose.difficulty}</Text>
                        </View>
                        <Text style={st.poseDuration}>{pose.duration}</Text>
                      </View>
                    </View>

                    <View style={st.bodyPartsRow}>
                      <Ionicons name="body-outline" size={14} color="#888" />
                      <Text style={st.bodyPartsLabel}>Helps: </Text>
                      {pose.bodyParts.map((bp, i) => (
                        <View key={i} style={[st.miniBodyPart, { backgroundColor: bp.color + '15' }]}>
                          <Text style={[st.miniBodyPartText, { color: bp.color }]}>{bp.name}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={st.cardActions}>
                      <TouchableOpacity
                        style={[st.quickLogBtn, { backgroundColor: pose.color }]}
                        onPress={(e) => { e.stopPropagation?.(); openLogModal(pose); }}
                      >
                        <Ionicons name="checkmark-done" size={16} color="#FFF" />
                        <Text style={st.quickLogBtnText}>Log Session</Text>
                      </TouchableOpacity>
                      <View style={st.tapHint}>
                        <Text style={st.tapHintText}>See instructions</Text>
                        <Ionicons name="chevron-forward" size={14} color="#CCC" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </View>
        ) : (
          <View style={st.sessionsContainer}>
            {sessions.length === 0 ? (
              <View style={st.emptyState}>
                <Ionicons name="journal-outline" size={64} color="#CCC" />
                <Text style={st.emptyText}>No sessions logged yet</Text>
                <Text style={st.emptySubtext}>Complete a yoga pose and log how you feel!</Text>
              </View>
            ) : (
              sessions.map((session: any) => {
                const pose = YOGA_POSES.find(p => p.id === session.pose_id);
                const feeling = FEELING_OPTIONS.find(f => f.value === session.body_feeling);
                return (
                  <View key={session.session_id} style={st.sessionCard}>
                    <View style={st.sessionHeader}>
                      <View style={[st.sessionIcon, { backgroundColor: (pose?.color || '#7B68EE') + '20' }]}>
                        <Ionicons name={(pose?.icon as any) || 'leaf'} size={22} color={pose?.color || '#7B68EE'} />
                      </View>
                      <View style={st.sessionInfo}>
                        <Text style={st.sessionPose}>{session.pose_name}</Text>
                        <Text style={st.sessionDate}>{session.date}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteSession(session.session_id)} style={st.sessionDeleteBtn}>
                        <Ionicons name="trash-outline" size={18} color="#DDD" />
                      </TouchableOpacity>
                    </View>

                    <View style={st.sessionDetails}>
                      <View style={st.sessionChip}>
                        <Ionicons name="time-outline" size={14} color="#4A90E2" />
                        <Text style={st.sessionChipText}>{session.duration_minutes} min</Text>
                      </View>
                      <View style={st.sessionChip}>
                        <Text style={st.feelingEmoji}>{feeling?.emoji || '😊'}</Text>
                        <Text style={st.sessionChipText}>{feeling?.label || session.body_feeling}</Text>
                      </View>
                    </View>

                    {session.feeling_notes ? (
                      <View style={st.sessionNotes}>
                        <Text style={st.sessionNotesText}>"{session.feeling_notes}"</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </View>
        )}
      </ScrollView>

      {/* Pose Detail Modal */}
      <PoseDetailModal
        pose={selectedPose}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onLogSession={openLogModal}
      />

      {/* Log Session Modal */}
      <Modal visible={logModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={lm.container}>
          <View style={lm.header}>
            <TouchableOpacity onPress={() => setLogModalVisible(false)}>
              <Text style={lm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={lm.headerTitle}>Log Session</Text>
            <TouchableOpacity onPress={handleLogSession} disabled={saving}>
              <Text style={[lm.saveText, saving && { opacity: 0.5 }]}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={lm.content} showsVerticalScrollIndicator={false}>
            {/* Pose Name */}
            {logPose && (
              <View style={lm.posePreview}>
                <View style={[lm.posePreviewIcon, { backgroundColor: logPose.color + '20' }]}>
                  <Ionicons name={logPose.icon as any} size={28} color={logPose.color} />
                </View>
                <Text style={lm.posePreviewName}>{logPose.name}</Text>
                <Text style={lm.posePreviewSanskrit}>{logPose.sanskrit}</Text>
              </View>
            )}

            {/* Duration */}
            <Text style={lm.label}>How long did you do this pose? *</Text>
            <View style={lm.durationGrid}>
              {['2', '5', '10', '15', '20', '30'].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[lm.durationBtn, logDuration === min && { backgroundColor: logPose?.color || '#7B68EE', borderColor: logPose?.color || '#7B68EE' }]}
                  onPress={() => setLogDuration(min)}
                >
                  <Text style={[lm.durationBtnText, logDuration === min && { color: '#FFF' }]}>{min} min</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={lm.customDuration}
              placeholder="Or type custom minutes..."
              value={!['2', '5', '10', '15', '20', '30'].includes(logDuration) ? logDuration : ''}
              onChangeText={setLogDuration}
              keyboardType="number-pad"
              placeholderTextColor="#999"
            />

            {/* Body Feeling */}
            <Text style={lm.label}>How does your body feel? *</Text>
            <View style={lm.feelingGrid}>
              {FEELING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[lm.feelingBtn, logFeeling === opt.value && lm.feelingBtnActive]}
                  onPress={() => setLogFeeling(opt.value)}
                >
                  <Text style={lm.feelingEmoji}>{opt.emoji}</Text>
                  <Text style={[lm.feelingLabel, logFeeling === opt.value && lm.feelingLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={lm.label}>Notes (optional)</Text>
            <TextInput
              style={lm.notesInput}
              placeholder="How did your body feel after? Any specific areas that felt good?"
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ===== MAIN STYLES =====
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 8, backgroundColor: '#ECEDF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#7B68EE', shadowColor: '#7B68EE', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Poses Tab
  posesContainer: { paddingTop: 4 },
  intro: { fontSize: 14, color: '#666', paddingHorizontal: 24, marginBottom: 12, lineHeight: 20 },
  poseCard: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  poseImage: { width: '100%', height: 150, backgroundColor: '#E8E8E8' },
  doneOverlay: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#50C878', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  doneText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  poseContent: { padding: 14 },
  poseHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  poseIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  poseInfo: { flex: 1, marginLeft: 10 },
  poseName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  poseSanskrit: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 1 },
  poseMeta: { alignItems: 'flex-end' },
  poseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  poseBadgeText: { fontSize: 11, fontWeight: '700' },
  poseDuration: { fontSize: 11, color: '#AAA', marginTop: 3 },
  bodyPartsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10, gap: 4 },
  bodyPartsLabel: { fontSize: 12, color: '#888', marginLeft: 4 },
  miniBodyPart: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  miniBodyPartText: { fontSize: 10, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  quickLogBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  quickLogBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tapHintText: { fontSize: 12, color: '#CCC' },

  // Sessions Tab
  sessionsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  sessionCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center' },
  sessionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sessionInfo: { flex: 1, marginLeft: 12 },
  sessionPose: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  sessionDate: { fontSize: 12, color: '#999', marginTop: 2 },
  sessionDeleteBtn: { padding: 8 },
  sessionDetails: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  sessionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F8F9FA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  sessionChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  feelingEmoji: { fontSize: 16 },
  sessionNotes: { marginTop: 10, backgroundColor: '#FAFAFA', padding: 12, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#7B68EE' },
  sessionNotesText: { fontSize: 14, color: '#555', fontStyle: 'italic', lineHeight: 20 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});

// ===== DETAIL MODAL STYLES =====
const dm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { flex: 1 },
  imageWrapper: { position: 'relative' },
  image: { width: '100%', height: 220, backgroundColor: '#E0E0E0' },
  diffBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  diffText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sanskritText: { fontSize: 15, color: '#888', fontStyle: 'italic', fontWeight: '500' },
  metaText: { fontSize: 14, color: '#555', fontWeight: '500' },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  bodyPartsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bodyPartChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  bodyPartText: { fontSize: 14, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1 },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 15, color: '#444', flex: 1 },
  tipBox: { marginHorizontal: 20, marginTop: 4, marginBottom: 12, padding: 16, backgroundColor: '#FFFBF0', borderLeftWidth: 4, borderRadius: 12 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipText: { fontSize: 14, color: '#555', lineHeight: 22 },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 20, marginTop: 12, paddingVertical: 16, borderRadius: 14 },
  logBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});

// ===== LOG MODAL STYLES =====
const lm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  cancelText: { fontSize: 16, color: '#FF6B6B' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#7B68EE' },
  content: { padding: 20 },
  posePreview: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16 },
  posePreviewIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  posePreviewName: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  posePreviewSanskrit: { fontSize: 14, color: '#999', fontStyle: 'italic', marginTop: 4 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10, marginTop: 16 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  durationBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  customDuration: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', marginTop: 10, color: '#1A1A1A' },
  feelingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  feelingBtn: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E8E8E8', minWidth: 80 },
  feelingBtnActive: { borderColor: '#7B68EE', backgroundColor: '#F3F0FF' },
  feelingEmoji: { fontSize: 24 },
  feelingLabel: { fontSize: 12, fontWeight: '500', color: '#888', marginTop: 4 },
  feelingLabelActive: { color: '#7B68EE', fontWeight: '700' },
  notesInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', minHeight: 100, textAlignVertical: 'top', color: '#1A1A1A' },
});
