import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny', color: '#FFB84D' },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant', color: '#4A90E2' },
  { id: 'dinner', label: 'Dinner', icon: 'moon', color: '#7B68EE' },
  { id: 'snack', label: 'Snack', icon: 'cafe', color: '#50C878' },
];

const FOOD_CATEGORIES = [
  { id: 'nutritious', label: 'Nutritious', icon: 'leaf', color: '#50C878', desc: 'Healthy, whole foods' },
  { id: 'balanced', label: 'Balanced', icon: 'scale', color: '#4A90E2', desc: 'Mix of good and okay' },
  { id: 'comfort', label: 'Comfort', icon: 'heart', color: '#FF6B6B', desc: 'Treats and comfort food' },
];

const MOOD_OPTIONS = [
  { id: 'energized', emoji: '⚡', label: 'Energized' },
  { id: 'focused', emoji: '🎯', label: 'Focused' },
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
  { id: 'foggy', emoji: '🌫️', label: 'Foggy' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'irritable', emoji: '😤', label: 'Irritable' },
];

export default function DietScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'today' | 'insights'>('today');
  const [todayData, setTodayData] = useState<any>({ logs: [], summary: { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, meal_count: 0, nutritious_count: 0, comfort_count: 0 } });
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Log modal
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('snack');
  const [foodCategory, setFoodCategory] = useState('balanced');
  const [portionSize, setPortionSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [moodBefore, setMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // AI analysis result
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [today, insightData] = await Promise.all([
        api.getTodayDiet(),
        api.getDietInsights(),
      ]);
      setTodayData(today);
      setInsights(insightData);
    } catch (error: any) {
      console.error('Diet load error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  async function handleAnalyzeFood() {
    if (!foodName.trim()) { Alert.alert('Error', 'Enter a food name first'); return; }
    setAnalyzing(true);
    try {
      const result = await api.analyzeFood(foodName.trim() + (portionSize ? `, ${portionSize}` : ''));
      setAiAnalysis(result);
      if (result.calories) setCalories(String(result.calories));
      if (result.protein_g) setProtein(String(result.protein_g));
      if (result.carbs_g) setCarbs(String(result.carbs_g));
      if (result.fat_g) setFat(String(result.fat_g));
      if (result.food_category) setFoodCategory(result.food_category);
    } catch (error: any) {
      Alert.alert('Error', 'Could not analyze food');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleLogFood() {
    if (!foodName.trim()) { Alert.alert('Error', 'Please enter what you ate'); return; }
    setSaving(true);
    try {
      await api.logDietEntry({
        food_name: foodName.trim(),
        meal_type: mealType,
        food_category: foodCategory,
        calories: calories ? parseInt(calories) : null,
        protein_g: protein ? parseFloat(protein) : null,
        carbs_g: carbs ? parseFloat(carbs) : null,
        fat_g: fat ? parseFloat(fat) : null,
        portion_size: portionSize,
        mood_before: moodBefore,
        mood_after: moodAfter,
        notes: notes,
      });
      resetForm();
      setLogModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFoodName(''); setMealType('snack'); setFoodCategory('balanced');
    setPortionSize(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setMoodBefore(''); setMoodAfter(''); setNotes(''); setAiAnalysis(null);
  }

  async function handleDelete(entryId: string) {
    Alert.alert('Delete', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteDietEntry(entryId); loadData(); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  const sum = todayData.summary;

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.loadingContainer}><ActivityIndicator size="large" color="#50C878" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.title}>Diet Tracker</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Nutrition Summary */}
        <View style={s.nutritionCard}>
          <Text style={s.nutritionTitle}>Today's Nutrition</Text>
          <View style={s.macroRow}>
            <View style={s.macroItem}>
              <Text style={s.macroValue}>{sum.total_calories}</Text>
              <Text style={s.macroLabel}>Calories</Text>
            </View>
            <View style={[s.macroDot, { backgroundColor: '#FF6B6B' }]} />
            <View style={s.macroItem}>
              <Text style={[s.macroValue, { color: '#E74C3C' }]}>{sum.total_protein_g}g</Text>
              <Text style={s.macroLabel}>Protein</Text>
            </View>
            <View style={[s.macroDot, { backgroundColor: '#4A90E2' }]} />
            <View style={s.macroItem}>
              <Text style={[s.macroValue, { color: '#4A90E2' }]}>{sum.total_carbs_g}g</Text>
              <Text style={s.macroLabel}>Carbs</Text>
            </View>
            <View style={[s.macroDot, { backgroundColor: '#FFB84D' }]} />
            <View style={s.macroItem}>
              <Text style={[s.macroValue, { color: '#FFB84D' }]}>{sum.total_fat_g}g</Text>
              <Text style={s.macroLabel}>Fat</Text>
            </View>
          </View>
          <View style={s.foodTypeRow}>
            <View style={[s.foodTypeBadge, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="leaf" size={14} color="#50C878" />
              <Text style={[s.foodTypeBadgeText, { color: '#50C878' }]}>{sum.nutritious_count} Nutritious</Text>
            </View>
            <View style={[s.foodTypeBadge, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="heart" size={14} color="#FF6B6B" />
              <Text style={[s.foodTypeBadgeText, { color: '#FF6B6B' }]}>{sum.comfort_count} Comfort</Text>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={s.tabBar}>
          <TouchableOpacity style={[s.tab, activeTab === 'today' && s.tabActive]} onPress={() => setActiveTab('today')}>
            <Ionicons name="today-outline" size={18} color={activeTab === 'today' ? '#FFF' : '#666'} />
            <Text style={[s.tabText, activeTab === 'today' && s.tabTextActive]}>Today's Meals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'insights' && s.tabActive]} onPress={() => setActiveTab('insights')}>
            <Ionicons name="analytics-outline" size={18} color={activeTab === 'insights' ? '#FFF' : '#666'} />
            <Text style={[s.tabText, activeTab === 'insights' && s.tabTextActive]}>Insights</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'today' ? (
          <View style={s.mealsContainer}>
            {todayData.logs.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="nutrition-outline" size={64} color="#CCC" />
                <Text style={s.emptyText}>Nothing logged yet today</Text>
                <Text style={s.emptySubtext}>Tap + to log what you've eaten</Text>
              </View>
            ) : (
              todayData.logs.map((entry: any) => {
                const meal = MEAL_TYPES.find(m => m.id === entry.meal_type);
                const cat = FOOD_CATEGORIES.find(c => c.id === entry.food_category);
                const moodB = MOOD_OPTIONS.find(m => m.id === entry.mood_before);
                const moodA = MOOD_OPTIONS.find(m => m.id === entry.mood_after);
                return (
                  <View key={entry.entry_id} style={s.mealCard}>
                    <View style={s.mealHeader}>
                      <View style={[s.mealIcon, { backgroundColor: (meal?.color || '#999') + '15' }]}>
                        <Ionicons name={(meal?.icon as any) || 'restaurant'} size={22} color={meal?.color || '#999'} />
                      </View>
                      <View style={s.mealInfo}>
                        <Text style={s.mealName}>{entry.food_name}</Text>
                        <View style={s.mealMeta}>
                          <Text style={s.mealTypeLabel}>{meal?.label || entry.meal_type}</Text>
                          <View style={[s.catBadge, { backgroundColor: (cat?.color || '#999') + '15' }]}>
                            <Ionicons name={(cat?.icon as any) || 'leaf'} size={12} color={cat?.color || '#999'} />
                            <Text style={[s.catBadgeText, { color: cat?.color || '#999' }]}>{cat?.label || entry.food_category}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(entry.entry_id)} style={s.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color="#DDD" />
                      </TouchableOpacity>
                    </View>
                    {(entry.calories || entry.protein_g || entry.carbs_g) ? (
                      <View style={s.mealNutrients}>
                        {entry.calories ? <Text style={s.nutrientChip}>{entry.calories} cal</Text> : null}
                        {entry.protein_g ? <Text style={[s.nutrientChip, { color: '#E74C3C' }]}>P: {entry.protein_g}g</Text> : null}
                        {entry.carbs_g ? <Text style={[s.nutrientChip, { color: '#4A90E2' }]}>C: {entry.carbs_g}g</Text> : null}
                        {entry.fat_g ? <Text style={[s.nutrientChip, { color: '#FFB84D' }]}>F: {entry.fat_g}g</Text> : null}
                      </View>
                    ) : null}
                    {(moodB || moodA) ? (
                      <View style={s.moodRow}>
                        {moodB ? <Text style={s.moodChip}>Before: {moodB.emoji} {moodB.label}</Text> : null}
                        {moodA ? <Text style={s.moodChip}>After: {moodA.emoji} {moodA.label}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
            <View style={{ height: 80 }} />
          </View>
        ) : (
          <View style={s.insightsContainer}>
            {insights && insights.total_entries > 0 ? (
              <>
                <View style={s.insightStatsRow}>
                  <View style={s.insightStat}>
                    <Text style={s.insightStatValue}>{insights.total_entries}</Text>
                    <Text style={s.insightStatLabel}>Total Entries</Text>
                  </View>
                  <View style={s.insightStat}>
                    <Text style={s.insightStatValue}>{insights.days_tracked}</Text>
                    <Text style={s.insightStatLabel}>Days Tracked</Text>
                  </View>
                  <View style={s.insightStat}>
                    <Text style={s.insightStatValue}>{insights.avg_daily_calories}</Text>
                    <Text style={s.insightStatLabel}>Avg Cal/Day</Text>
                  </View>
                </View>

                <View style={s.ratioRow}>
                  <View style={[s.ratioCard, { borderLeftColor: '#50C878' }]}>
                    <Ionicons name="leaf" size={20} color="#50C878" />
                    <Text style={[s.ratioValue, { color: '#50C878' }]}>{insights.nutritious_ratio}%</Text>
                    <Text style={s.ratioLabel}>Nutritious</Text>
                  </View>
                  <View style={[s.ratioCard, { borderLeftColor: '#FF6B6B' }]}>
                    <Ionicons name="heart" size={20} color="#FF6B6B" />
                    <Text style={[s.ratioValue, { color: '#FF6B6B' }]}>{insights.comfort_ratio}%</Text>
                    <Text style={s.ratioLabel}>Comfort</Text>
                  </View>
                </View>

                {(insights.insights || []).map((insight: any, idx: number) => (
                  <View key={idx} style={[s.insightCard, {
                    borderLeftColor: insight.type === 'positive' ? '#50C878' : insight.type === 'warning' ? '#FF6B6B' : '#4A90E2'
                  }]}>
                    <Ionicons
                      name={insight.type === 'positive' ? 'checkmark-circle' : insight.type === 'warning' ? 'alert-circle' : 'information-circle'}
                      size={22}
                      color={insight.type === 'positive' ? '#50C878' : insight.type === 'warning' ? '#FF6B6B' : '#4A90E2'}
                    />
                    <View style={s.insightInfo}>
                      <Text style={s.insightTitle}>{insight.title}</Text>
                      <Text style={s.insightText}>{insight.text}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="analytics-outline" size={64} color="#CCC" />
                <Text style={s.emptyText}>No data yet</Text>
                <Text style={s.emptySubtext}>Log a few meals to see insights about your diet, mood patterns, and nutrition!</Text>
              </View>
            )}
            <View style={{ height: 80 }} />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => { resetForm(); setLogModalVisible(true); }}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Log Meal Modal */}
      <Modal visible={logModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setLogModalVisible(false)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Log Food</Text>
            <TouchableOpacity onPress={handleLogFood} disabled={saving}>
              <Text style={[s.modalSave, saving && { opacity: 0.5 }]}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
            {/* Food Name + AI Analyze */}
            <Text style={s.label}>What did you eat? *</Text>
            <View style={s.analyzeRow}>
              <TextInput style={s.analyzeInput} placeholder="e.g., Grilled chicken salad" value={foodName} onChangeText={setFoodName} placeholderTextColor="#999" />
              <TouchableOpacity style={s.analyzeBtn} onPress={handleAnalyzeFood} disabled={analyzing}>
                {analyzing ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="sparkles" size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
            <Text style={s.analyzeHint}>Tap the sparkle to auto-fill nutrition with AI</Text>

            {/* AI Analysis Result */}
            {aiAnalysis && !aiAnalysis.error && (
              <View style={s.aiResultCard}>
                <View style={s.aiResultHeader}>
                  <Ionicons name="sparkles" size={18} color="#7B68EE" />
                  <Text style={s.aiResultTitle}>AI Analysis</Text>
                </View>
                {aiAnalysis.impact_mind ? (
                  <View style={s.impactRow}>
                    <Text style={s.impactIcon}>🧠</Text>
                    <View style={s.impactInfo}>
                      <Text style={s.impactLabel}>Mind Impact</Text>
                      <Text style={s.impactText}>{aiAnalysis.impact_mind}</Text>
                    </View>
                  </View>
                ) : null}
                {aiAnalysis.impact_body ? (
                  <View style={s.impactRow}>
                    <Text style={s.impactIcon}>💪</Text>
                    <View style={s.impactInfo}>
                      <Text style={s.impactLabel}>Body Impact</Text>
                      <Text style={s.impactText}>{aiAnalysis.impact_body}</Text>
                    </View>
                  </View>
                ) : null}
                {aiAnalysis.impact_mood ? (
                  <View style={s.impactRow}>
                    <Text style={s.impactIcon}>😊</Text>
                    <View style={s.impactInfo}>
                      <Text style={s.impactLabel}>Mood Impact</Text>
                      <Text style={s.impactText}>{aiAnalysis.impact_mood}</Text>
                    </View>
                  </View>
                ) : null}
                {aiAnalysis.healthier_alternative ? (
                  <View style={s.alternativeBox}>
                    <Ionicons name="swap-horizontal" size={16} color="#50C878" />
                    <Text style={s.alternativeText}>Try instead: {aiAnalysis.healthier_alternative}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Meal Type */}
            <Text style={s.label}>Meal Type</Text>
            <View style={s.mealTypeRow}>
              {MEAL_TYPES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.mealTypeBtn, mealType === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                  onPress={() => setMealType(m.id)}
                >
                  <Ionicons name={m.icon as any} size={18} color={mealType === m.id ? '#FFF' : m.color} />
                  <Text style={[s.mealTypeBtnText, mealType === m.id && { color: '#FFF' }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Food Category */}
            <Text style={s.label}>Food Type</Text>
            <View style={s.catRow}>
              {FOOD_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catBtn, foodCategory === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => setFoodCategory(c.id)}
                >
                  <Ionicons name={c.icon as any} size={18} color={foodCategory === c.id ? '#FFF' : c.color} />
                  <Text style={[s.catBtnText, foodCategory === c.id && { color: '#FFF' }]}>{c.label}</Text>
                  <Text style={[s.catBtnDesc, foodCategory === c.id && { color: '#FFF' }]}>{c.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nutrition */}
            <Text style={s.label}>Nutrition (optional — AI can fill these)</Text>
            <View style={s.nutritionGrid}>
              <View style={s.nutInput}><Text style={s.nutLabel}>Cal</Text><TextInput style={s.nutField} value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="0" placeholderTextColor="#CCC" /></View>
              <View style={s.nutInput}><Text style={[s.nutLabel, { color: '#E74C3C' }]}>Protein</Text><TextInput style={s.nutField} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="0g" placeholderTextColor="#CCC" /></View>
              <View style={s.nutInput}><Text style={[s.nutLabel, { color: '#4A90E2' }]}>Carbs</Text><TextInput style={s.nutField} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="0g" placeholderTextColor="#CCC" /></View>
              <View style={s.nutInput}><Text style={[s.nutLabel, { color: '#FFB84D' }]}>Fat</Text><TextInput style={s.nutField} value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="0g" placeholderTextColor="#CCC" /></View>
            </View>

            {/* Mood Before */}
            <Text style={s.label}>Mood Before Eating</Text>
            <View style={s.moodSelRow}>
              {MOOD_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.moodSelBtn, moodBefore === m.id && s.moodSelBtnActive]}
                  onPress={() => setMoodBefore(m.id)}
                >
                  <Text style={s.moodSelEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodSelLabel, moodBefore === m.id && s.moodSelLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mood After */}
            <Text style={s.label}>Mood After Eating</Text>
            <View style={s.moodSelRow}>
              {MOOD_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.moodSelBtn, moodAfter === m.id && s.moodSelBtnActive]}
                  onPress={() => setMoodAfter(m.id)}
                >
                  <Text style={s.moodSelEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodSelLabel, moodAfter === m.id && s.moodSelLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Notes</Text>
            <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="How did this food make you feel?" value={notes} onChangeText={setNotes} multiline placeholderTextColor="#999" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },

  // Nutrition Card
  nutritionCard: { margin: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  nutritionTitle: { fontSize: 15, fontWeight: '600', color: '#888', marginBottom: 12 },
  macroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  macroLabel: { fontSize: 11, color: '#AAA', marginTop: 2 },
  macroDot: { width: 4, height: 4, borderRadius: 2 },
  foodTypeRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  foodTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  foodTypeBadgeText: { fontSize: 12, fontWeight: '600' },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#ECEDF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#50C878', shadowColor: '#50C878', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Meals List
  mealsContainer: { paddingHorizontal: 16, paddingTop: 4 },
  mealCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  mealHeader: { flexDirection: 'row', alignItems: 'center' },
  mealIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mealInfo: { flex: 1, marginLeft: 12 },
  mealName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  mealTypeLabel: { fontSize: 12, color: '#888' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  mealNutrients: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  nutrientChip: { fontSize: 13, fontWeight: '600', color: '#555' },
  moodRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  moodChip: { fontSize: 12, color: '#888' },

  // Insights
  insightsContainer: { paddingHorizontal: 16, paddingTop: 4 },
  insightStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  insightStat: { flex: 1, backgroundColor: '#FFF', padding: 14, borderRadius: 12, alignItems: 'center' },
  insightStatValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  insightStatLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  ratioRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  ratioCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', padding: 14, borderRadius: 12, borderLeftWidth: 4 },
  ratioValue: { fontSize: 20, fontWeight: '700' },
  ratioLabel: { fontSize: 12, color: '#888' },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderLeftWidth: 4, marginBottom: 10 },
  insightInfo: { flex: 1 },
  insightTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  insightText: { fontSize: 14, color: '#666', lineHeight: 20 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },

  // FAB
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#50C878', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#50C878' },
  modalContent: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A' },

  // AI Analyze
  analyzeRow: { flexDirection: 'row', gap: 8 },
  analyzeInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A' },
  analyzeBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#7B68EE', justifyContent: 'center', alignItems: 'center' },
  analyzeHint: { fontSize: 12, color: '#AAA', marginTop: 4 },

  // AI Result
  aiResultCard: { backgroundColor: '#F8F5FF', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#E8E0FF' },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  aiResultTitle: { fontSize: 14, fontWeight: '700', color: '#7B68EE' },
  impactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  impactIcon: { fontSize: 18, marginTop: 1 },
  impactInfo: { flex: 1 },
  impactLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 2 },
  impactText: { fontSize: 13, color: '#555', lineHeight: 18 },
  alternativeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', padding: 10, borderRadius: 10, marginTop: 4 },
  alternativeText: { fontSize: 13, color: '#2E7D32', flex: 1 },

  // Meal Type
  mealTypeRow: { flexDirection: 'row', gap: 8 },
  mealTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  mealTypeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Food Category
  catRow: { flexDirection: 'row', gap: 8 },
  catBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  catBtnText: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 4 },
  catBtnDesc: { fontSize: 10, color: '#AAA', marginTop: 2 },

  // Nutrition Grid
  nutritionGrid: { flexDirection: 'row', gap: 8 },
  nutInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  nutLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 4 },
  nutField: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', width: '100%' },

  // Mood Selection
  moodSelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodSelBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8E8E8', minWidth: 70 },
  moodSelBtnActive: { borderColor: '#50C878', backgroundColor: '#F0FFF4' },
  moodSelEmoji: { fontSize: 20 },
  moodSelLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  moodSelLabelActive: { color: '#50C878', fontWeight: '700' },
});
