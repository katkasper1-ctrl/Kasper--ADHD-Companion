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

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
  const [aiSuggestion, setAiSuggestion] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreateTask() {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      await api.createTask(newTask);
      setNewTask({ title: '', description: '', priority: 'medium' });
      setModalVisible(false);
      loadTasks();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleToggleTask(task: any) {
    try {
      await api.updateTask(task.task_id, { completed: !task.completed });
      loadTasks();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDeleteTask(taskId: string) {
    Alert.alert(
      'Delete Task',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTask(taskId);
              loadTasks();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  async function handlePrioritize() {
    try {
      const result = await api.prioritizeTasks();
      setAiSuggestion(result.suggestion);
      Alert.alert('AI Suggestion', result.suggestion);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  const priorityColors = {
    high: '#FF6B6B',
    medium: '#FFB84D',
    low: '#4A90E2',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity onPress={handlePrioritize}>
          <Ionicons name="sparkles" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.task_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggleTask(item)}
            >
              <Ionicons
                name={item.completed ? 'checkbox' : 'square-outline'}
                size={28}
                color={item.completed ? '#50C878' : '#CCC'}
              />
            </TouchableOpacity>
            <View style={styles.taskContent}>
              <Text style={[styles.taskTitle, item.completed && styles.taskCompleted]}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.taskDescription}>{item.description}</Text>
              ) : null}
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: (priorityColors as any)[item.priority] },
                ]}
              >
                <Text style={styles.priorityText}>{item.priority}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDeleteTask(item.task_id)}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first task</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Task</Text>
            <TouchableOpacity onPress={handleCreateTask}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Task title"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityButtons}>
              {['low', 'medium', 'high'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityButton,
                    newTask.priority === priority && styles.priorityButtonActive,
                    { borderColor: (priorityColors as any)[priority] },
                  ]}
                  onPress={() => setNewTask({ ...newTask, priority })}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      newTask.priority === priority && styles.priorityButtonTextActive,
                      { color: (priorityColors as any)[priority] },
                    ]}
                  >
                    {priority}
                  </Text>
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
  taskCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    textTransform: 'capitalize',
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
    backgroundColor: '#4A90E2',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  priorityButtonActive: {
    backgroundColor: '#F0F0F0',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityButtonTextActive: {
    fontWeight: 'bold',
  },
});
