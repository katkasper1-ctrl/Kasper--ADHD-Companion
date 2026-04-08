import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function HydrationScreen() {
  const router = useRouter();
  const [todayData, setTodayData] = useState<any>({ total_ml: 0, daily_goal_ml: 2000, percentage: 0, logs: [] });
  const [modalVisible, setModalVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [newGoal, setNewGoal] = useState('2000');
  const waveAnimation = new Animated.Value(0);

  useEffect(() => {
    loadTodayData();
    startWaveAnimation();
  }, []);

  function startWaveAnimation() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }

  async function loadTodayData() {
    try {
      const data = await api.getTodayHydration();
      setTodayData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleQuickAdd(amount: number) {
    try {
      await api.logHydration(amount);
      loadTodayData();
      Alert.alert('💧 Great!', `Added ${amount}ml`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCustomAdd() {
    const amount = parseInt(customAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await api.logHydration(amount);
      setCustomAmount('');
      setModalVisible(false);
      loadTodayData();
      Alert.alert('💧 Logged!', `Added ${amount}ml`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleSetGoal() {
    const goal = parseInt(newGoal);
    if (!goal || goal <= 0) {
      Alert.alert('Error', 'Please enter a valid goal');
      return;
    }

    try {
      await api.setHydrationGoal(goal);
      setGoalModalVisible(false);
      loadTodayData();
      Alert.alert('✅ Goal Updated', `New daily goal: ${goal}ml`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDeleteLog(logId: string) {
    Alert.alert('Delete Log', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteHydrationLog(logId);
            loadTodayData();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  const waterLevel = Math.min(100, todayData.percentage);
  const waterColor = waterLevel >= 100 ? '#50C878' : waterLevel >= 50 ? '#4A90E2' : '#87CEEB';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Hydration</Text>
          <TouchableOpacity onPress={() => setGoalModalVisible(true)}>
            <Ionicons name="settings-outline" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Water Glass Visualization */}
        <View style={styles.glassContainer}>
          <View style={styles.glass}>
            <View style={[styles.water, { height: `${waterLevel}%`, backgroundColor: waterColor }]}>
              <Animated.View
                style={[
                  styles.wave,
                  {
                    transform: [
                      {
                        translateY: waveAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -10],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <View style={styles.glassOverlay}>
              <Text style={styles.percentageText}>{waterLevel}%</Text>
              <Text style={styles.amountText}>
                {todayData.total_ml} / {todayData.daily_goal_ml} ml
              </Text>
            </View>
          </View>
          {waterLevel >= 100 && (
            <Text style={styles.congratsText}>🎉 Goal reached! Stay hydrated!</Text>
          )}
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddContainer}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAddButtons}>
            {[250, 500, 750].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAddButton}
                onPress={() => handleQuickAdd(amount)}
              >
                <Ionicons name="water" size={24} color="#4A90E2" />
                <Text style={styles.quickAddText}>{amount}ml</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.quickAddButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle" size={24} color="#4A90E2" />
              <Text style={styles.quickAddText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Log */}
        <View style={styles.logContainer}>
          <Text style={styles.sectionTitle}>Today's Log</Text>
          {todayData.logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No water logged yet today</Text>
            </View>
          ) : (
            todayData.logs.map((log: any) => (
              <View key={log.hydration_id} style={styles.logCard}>
                <View style={styles.logContent}>
                  <Ionicons name="water" size={24} color="#4A90E2" />
                  <View style={styles.logDetails}>
                    <Text style={styles.logAmount}>{log.amount_ml}ml</Text>
                    <Text style={styles.logTime}>
                      {format(new Date(log.timestamp), 'h:mm a')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDeleteLog(log.hydration_id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Custom Amount Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Custom Amount</Text>
            <TouchableOpacity onPress={handleCustomAdd}>
              <Text style={styles.modalSave}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Amount in ml"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="number-pad"
              placeholderTextColor="#999"
              autoFocus
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Goal Setting Modal */}
      <Modal visible={goalModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Daily Goal</Text>
            <TouchableOpacity onPress={handleSetGoal}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Daily Goal (ml)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2000"
              value={newGoal}
              onChangeText={setNewGoal}
              keyboardType="number-pad"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Recommended: 2000ml (2 liters) per day</Text>
          </View>
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  glassContainer: {
    alignItems: 'center',
    padding: 32,
  },
  glass: {
    width: 200,
    height: 300,
    borderWidth: 4,
    borderColor: '#4A90E2',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFF',
  },
  water: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
  },
  wave: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  amountText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  congratsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#50C878',
    marginTop: 16,
    textAlign: 'center',
  },
  quickAddContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  quickAddButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginTop: 8,
  },
  logContainer: {
    padding: 24,
    paddingTop: 0,
  },
  logCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDetails: {
    marginLeft: 12,
  },
  logAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  logTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#FF6B6B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalContent: {
    padding: 24,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
