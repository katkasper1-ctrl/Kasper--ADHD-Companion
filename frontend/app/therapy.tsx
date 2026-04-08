import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';

const MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Struggling', color: '#E74C3C' },
  { score: 2, emoji: '😟', label: 'Anxious', color: '#E67E22' },
  { score: 3, emoji: '😐', label: 'Neutral', color: '#FFB84D' },
  { score: 4, emoji: '😊', label: 'Good', color: '#50C878' },
  { score: 5, emoji: '🤩', label: 'Great', color: '#4A90E2' },
];

const BUDDY_COLORS: Record<string, string> = {
  luna_cat: '#9B59B6', bear_dog: '#E67E22', ollie_owl: '#3498DB', penny_penguin: '#1ABC9C',
  rosie_rabbit: '#FF6B9D', felix_fox: '#E74C3C', ellie_elephant: '#7B68EE', sunny_sloth: '#50C878',
  kai_koala: '#888', dash_dolphin: '#4A90E2',
};

export default function TherapyScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeView, setActiveView] = useState<'chat' | 'progress'>('chat');
  const [buddy, setBuddy] = useState<any>(null);
  const [buddies, setBuddies] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showBuddyPicker, setShowBuddyPicker] = useState(false);
  const [showMoodCheckin, setShowMoodCheckin] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [buddyData, buddyList, history, progressData] = await Promise.all([
        api.getSelectedBuddy(),
        api.getAvailableBuddies(),
        api.getTherapyHistory(),
        api.getTherapyProgress(),
      ]);
      setBuddies(buddyList);
      setMessages(history);
      setProgress(progressData);
      if (buddyData.buddy_id) {
        setBuddy(buddyData);
      } else {
        setShowBuddyPicker(true);
      }
    } catch (error: any) {
      console.error('Therapy load error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBuddy(buddyId: string) {
    try {
      const selected = await api.selectBuddy(buddyId);
      setBuddy(selected);
      setShowBuddyPicker(false);
      // Send first greeting
      setSending(true);
      try {
        const resp = await api.sendTherapyMessage("Hi! I just chose you as my buddy.");
        setMessages(prev => [
          ...prev,
          { role: 'user', content: "Hi! I just chose you as my buddy.", created_at: new Date().toISOString() },
          { role: 'assistant', content: resp.response, created_at: new Date().toISOString() },
        ]);
      } catch (e) {}
      setSending(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: text, created_at: new Date().toISOString() }]);
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const resp = await api.sendTherapyMessage(text);
      setMessages(prev => [...prev, { role: 'assistant', content: resp.response, created_at: new Date().toISOString() }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had a little hiccup! Can you try again? I'm here for you. 💕", created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  }

  async function handleMoodCheckin(score: number, label: string) {
    try {
      await api.logMoodCheckin({ mood_score: score, mood_label: label });
      setShowMoodCheckin(false);
      const prog = await api.getTherapyProgress();
      setProgress(prog);
      Alert.alert('Mood Logged!', `Thanks for checking in. Your buddy is here whenever you need to talk.`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleClearHistory() {
    Alert.alert('Clear Chat', 'This will erase all conversation history. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        try { await api.clearTherapyHistory(); setMessages([]); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  const buddyColor = buddy ? (BUDDY_COLORS[buddy.buddy_id] || '#7B68EE') : '#7B68EE';

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.loadingContainer}><ActivityIndicator size="large" color="#7B68EE" /></View></SafeAreaView>;
  }

  // ===== BUDDY PICKER =====
  if (showBuddyPicker) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={s.title}>Choose Your Buddy</Text>
            <View style={{ width: 24 }} />
          </View>
          <Text style={s.pickerIntro}>Pick an animal friend to be your therapy companion. They'll listen, support you, and help you track your feelings.</Text>
          <View style={s.buddyGrid}>
            {buddies.map((b: any) => (
              <TouchableOpacity
                key={b.buddy_id}
                style={[s.buddyCard, { borderColor: BUDDY_COLORS[b.buddy_id] + '40' }]}
                onPress={() => handleSelectBuddy(b.buddy_id)}
                activeOpacity={0.8}
              >
                <Text style={s.buddyEmoji}>{b.emoji}</Text>
                <Text style={s.buddyName}>{b.name}</Text>
                <Text style={s.buddyAnimal}>{b.animal}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== MOOD CHECKIN =====
  if (showMoodCheckin) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.moodContainer}>
          <Text style={s.moodTitle}>How are you feeling right now?</Text>
          <Text style={s.moodSubtitle}>Be honest — your buddy {buddy?.buddy_name} is here for you no matter what</Text>
          <View style={s.moodGrid}>
            {MOOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.score}
                style={s.moodBtn}
                onPress={() => handleMoodCheckin(opt.score, opt.label)}
              >
                <Text style={s.moodEmoji}>{opt.emoji}</Text>
                <Text style={[s.moodLabel, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.skipMoodBtn} onPress={() => setShowMoodCheckin(false)}>
            <Text style={s.skipMoodText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity style={s.buddyHeaderInfo} onPress={() => setShowBuddyPicker(true)}>
          <Text style={s.buddyHeaderEmoji}>{buddy?.buddy_emoji || '🐱'}</Text>
          <View>
            <Text style={s.buddyHeaderName}>{buddy?.buddy_name || 'Buddy'}</Text>
            <Text style={s.buddyHeaderSub}>Tap to change buddy</Text>
          </View>
        </TouchableOpacity>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={() => setShowMoodCheckin(true)} style={s.headerActionBtn}>
            <Ionicons name="happy-outline" size={22} color="#FFB84D" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveView(activeView === 'chat' ? 'progress' : 'chat')} style={s.headerActionBtn}>
            <Ionicons name={activeView === 'chat' ? 'analytics-outline' : 'chatbubble-outline'} size={22} color="#7B68EE" />
          </TouchableOpacity>
        </View>
      </View>

      {activeView === 'chat' ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.chatBody} keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={s.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Welcome message if empty */}
            {messages.length === 0 && (
              <View style={s.welcomeBox}>
                <Text style={s.welcomeEmoji}>{buddy?.buddy_emoji || '🐱'}</Text>
                <Text style={s.welcomeTitle}>Hi! I'm {buddy?.buddy_name || 'your buddy'}!</Text>
                <Text style={s.welcomeText}>I'm here to listen and support you. Tell me about your day, how you're feeling, or anything on your mind.</Text>
                <View style={s.suggestionsRow}>
                  {["How is my day?", "I'm feeling stressed", "I need to talk"].map((txt) => (
                    <TouchableOpacity
                      key={txt}
                      style={[s.suggestionBtn, { borderColor: buddyColor + '40' }]}
                      onPress={() => { setInputText(txt); }}
                    >
                      <Text style={[s.suggestionText, { color: buddyColor }]}>{txt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg: any, idx: number) => {
              const isUser = msg.role === 'user';
              return (
                <View key={idx} style={[s.messageBubbleRow, isUser && s.messageBubbleRowUser]}>
                  {!isUser && <Text style={s.msgAvatar}>{buddy?.buddy_emoji || '🐱'}</Text>}
                  <View style={[s.messageBubble, isUser ? s.userBubble : [s.aiBubble, { backgroundColor: buddyColor + '12' }]]}>
                    <Text style={[s.messageText, isUser && s.userMessageText]}>{msg.content}</Text>
                  </View>
                </View>
              );
            })}

            {sending && (
              <View style={s.messageBubbleRow}>
                <Text style={s.msgAvatar}>{buddy?.buddy_emoji || '🐱'}</Text>
                <View style={[s.messageBubble, s.aiBubble, { backgroundColor: buddyColor + '12' }]}>
                  <Text style={s.typingText}>typing...</Text>
                </View>
              </View>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Input Bar */}
          <View style={s.inputBar}>
            <TextInput
              style={s.chatInput}
              placeholder={`Talk to ${buddy?.buddy_name || 'your buddy'}...`}
              value={inputText}
              onChangeText={setInputText}
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: inputText.trim() ? buddyColor : '#DDD' }]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={s.progressContainer} showsVerticalScrollIndicator={false}>
          <Text style={s.progressTitle}>Your Progress</Text>
          {progress && progress.total_checkins > 0 ? (
            <>
              {/* Summary Cards */}
              <View style={s.progressStats}>
                <View style={s.progStatCard}>
                  <Text style={s.progStatValue}>{progress.average_mood.toFixed(1)}</Text>
                  <Text style={s.progStatLabel}>Avg Mood</Text>
                </View>
                <View style={s.progStatCard}>
                  <Text style={s.progStatValue}>{progress.total_sessions}</Text>
                  <Text style={s.progStatLabel}>Messages</Text>
                </View>
                <View style={s.progStatCard}>
                  <Text style={s.progStatValue}>{progress.total_checkins}</Text>
                  <Text style={s.progStatLabel}>Check-ins</Text>
                </View>
              </View>

              {/* Trend */}
              <View style={[s.trendCard, { borderLeftColor: progress.trend === 'improving' ? '#50C878' : progress.trend === 'declining' ? '#FF6B6B' : '#FFB84D' }]}>
                <Ionicons
                  name={progress.trend === 'improving' ? 'trending-up' : progress.trend === 'declining' ? 'trending-down' : 'remove'}
                  size={24}
                  color={progress.trend === 'improving' ? '#50C878' : progress.trend === 'declining' ? '#FF6B6B' : '#FFB84D'}
                />
                <View style={s.trendInfo}>
                  <Text style={s.trendTitle}>
                    {progress.trend === 'improving' ? 'You\'re doing better!' : progress.trend === 'declining' ? 'You might need extra support' : 'Staying steady'}
                  </Text>
                  <Text style={s.trendText}>
                    {progress.trend === 'improving'
                      ? 'Your recent mood scores are trending upward. Keep it up!'
                      : progress.trend === 'declining'
                      ? 'Your mood has been lower recently. Consider talking to a medical professional — it\'s a sign of strength to ask for help.'
                      : 'Your mood has been consistent. Keep checking in with yourself.'}
                  </Text>
                </View>
              </View>

              {/* Needs Attention Alert */}
              {progress.needs_attention && (
                <View style={s.attentionCard}>
                  <Ionicons name="heart" size={24} color="#FF6B6B" />
                  <View style={s.attentionInfo}>
                    <Text style={s.attentionTitle}>Consider professional support</Text>
                    <Text style={s.attentionText}>Your average mood has been low. Talking to a therapist or doctor can make a big difference. You deserve to feel better.</Text>
                  </View>
                </View>
              )}

              {/* Recent Check-ins */}
              <Text style={s.recentTitle}>Recent Check-ins</Text>
              {(progress.checkins || []).slice(0, 15).map((c: any, idx: number) => {
                const moodOpt = MOOD_OPTIONS.find(m => m.score === c.mood_score);
                return (
                  <View key={idx} style={s.checkinRow}>
                    <Text style={s.checkinEmoji}>{moodOpt?.emoji || '😐'}</Text>
                    <View style={s.checkinInfo}>
                      <Text style={s.checkinLabel}>{moodOpt?.label || c.mood_label}</Text>
                      <Text style={s.checkinDate}>{c.date}</Text>
                    </View>
                    <View style={[s.checkinScore, { backgroundColor: (moodOpt?.color || '#999') + '20' }]}>
                      <Text style={[s.checkinScoreText, { color: moodOpt?.color || '#999' }]}>{c.mood_score}/5</Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={s.emptyProgress}>
              <Ionicons name="analytics-outline" size={64} color="#CCC" />
              <Text style={s.emptyText}>No check-ins yet</Text>
              <Text style={s.emptySubtext}>Tap the smiley icon to log how you're feeling. Over time, you'll see your mood patterns here.</Text>
              <TouchableOpacity style={[s.startCheckinBtn, { backgroundColor: buddyColor }]} onPress={() => setShowMoodCheckin(true)}>
                <Ionicons name="happy" size={20} color="#FFF" />
                <Text style={s.startCheckinBtnText}>Check In Now</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={s.clearHistoryBtn} onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
            <Text style={s.clearHistoryText}>Clear Chat History</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },

  // Buddy Picker
  pickerIntro: { fontSize: 15, color: '#666', paddingHorizontal: 24, marginBottom: 20, lineHeight: 22 },
  buddyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 0 },
  buddyCard: { width: '45%', marginHorizontal: '2.5%', marginBottom: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  buddyEmoji: { fontSize: 48, marginBottom: 8 },
  buddyName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  buddyAnimal: { fontSize: 13, color: '#888', marginTop: 2 },

  // Mood Check-in
  moodContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  moodTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 },
  moodSubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  moodBtn: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, minWidth: 80 },
  moodEmoji: { fontSize: 40, marginBottom: 8 },
  moodLabel: { fontSize: 13, fontWeight: '600' },
  skipMoodBtn: { marginTop: 32, padding: 12 },
  skipMoodText: { fontSize: 15, color: '#AAA' },

  // Chat Header
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  buddyHeaderInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 },
  buddyHeaderEmoji: { fontSize: 32, marginRight: 10 },
  buddyHeaderName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  buddyHeaderSub: { fontSize: 11, color: '#AAA' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { padding: 8 },

  // Chat Body
  chatBody: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Welcome
  welcomeBox: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  welcomeEmoji: { fontSize: 64, marginBottom: 12 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  welcomeText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 },
  suggestionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  suggestionText: { fontSize: 13, fontWeight: '500' },

  // Messages
  messageBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, maxWidth: '85%' },
  messageBubbleRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAvatar: { fontSize: 24, marginRight: 6, marginBottom: 4 },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  userBubble: { backgroundColor: '#7B68EE', borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, color: '#333', lineHeight: 22 },
  userMessageText: { color: '#FFF' },
  typingText: { fontSize: 14, color: '#999', fontStyle: 'italic' },

  // Input Bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8 },
  chatInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#1A1A1A' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // Progress
  progressContainer: { flex: 1, padding: 20 },
  progressTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  progressStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  progStatCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  progStatValue: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  progStatLabel: { fontSize: 11, color: '#888', marginTop: 4 },

  // Trend
  trendCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF', padding: 16, borderRadius: 14, borderLeftWidth: 4, marginBottom: 16 },
  trendInfo: { flex: 1 },
  trendTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  trendText: { fontSize: 14, color: '#666', lineHeight: 20 },

  // Attention
  attentionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF5F5', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#FFD0D0', marginBottom: 16 },
  attentionInfo: { flex: 1 },
  attentionTitle: { fontSize: 15, fontWeight: '700', color: '#E74C3C', marginBottom: 4 },
  attentionText: { fontSize: 14, color: '#666', lineHeight: 20 },

  // Recent Check-ins
  recentTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, marginTop: 8 },
  checkinRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 8 },
  checkinEmoji: { fontSize: 28, marginRight: 12 },
  checkinInfo: { flex: 1 },
  checkinLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  checkinDate: { fontSize: 12, color: '#999', marginTop: 2 },
  checkinScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  checkinScoreText: { fontSize: 13, fontWeight: '700' },

  // Empty progress
  emptyProgress: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  startCheckinBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginTop: 20 },
  startCheckinBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Clear history
  clearHistoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginTop: 16 },
  clearHistoryText: { fontSize: 14, color: '#FF6B6B' },
});
