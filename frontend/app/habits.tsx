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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = [
  '#4A90E2', '#50C878', '#7B68EE', '#FF6B6B',
  '#FFB84D', '#9B59B6', '#3498DB', '#E74C3C',
];

export default function HabitsScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', color: COLORS[0], frequency: 'daily' });

  useEffect(() => {
    loadHabits();
  }, []);

  async function loadHabits() {
    try {
      const data = await api.getHabits();
      setHabits(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreateHabit() {
    if (!newHabit.name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      await api.createHabit(newHabit);
      setNewHabit({ name: '', color: COLORS[0], frequency: 'daily' });
      setModalVisible(false);
      loadHabits();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCheckIn(habitId: string) {
    try {
      const result = await api.checkInHabit(habitId);
      Alert.alert('🎉 Great job!', result.message);
      loadHabits();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(habitId: string) {
    Alert.alert(
      'Delete Habit',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteHabit(habitId);
              loadHabits();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Habits</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.habit_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.habitCard, { borderLeftColor: item.color }]}>
            <View style={styles.habitContent}>
              <Text style={styles.habitName}>{item.name}</Text>
              <View style={styles.streakContainer}>
                <Ionicons name="flame" size={20} color="#FF6B6B" />
                <Text style={styles.streakText}>
                  {item.current_streak} day streak
                </Text>
                <Text style={styles.bestStreak}>
                  (Best: {item.best_streak})
                </Text>
              </View>
            </View>
            <View style={styles.habitActions}>
              <TouchableOpacity
                style={[styles.checkInButton, { backgroundColor: item.color }]}
                onPress={() => handleCheckIn(item.habit_id)}
              >
                <Ionicons name="checkmark" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.habit_id)}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flame-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No habits yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create your first habit</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Habit</Text>
            <TouchableOpacity onPress={handleCreateHabit}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Habit name"
              value={newHabit.name}
              onChangeText={(text) => setNewHabit({ ...newHabit, name: text })}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newHabit.color === color && styles.colorOptionActive,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, color })}
                >
                  {newHabit.color === color && (
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
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
  list: {
    padding: 16,
  },
  habitCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitContent: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 4,
  },
  bestStreak: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#50C878',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    paddingTop: 60,
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
    color: '#50C878',
  },
  modalContent: {
    padding: 24,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
});
