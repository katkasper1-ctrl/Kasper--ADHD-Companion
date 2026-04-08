import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ name: '', time: '07:00', steps: [''], days: [] });

  useEffect(() => { loadRoutines(); }, []);

  async function loadRoutines() {
    try {
      const data = await api.getRoutines();
      setRoutines(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreate() {
    if (!newRoutine.name.trim() || newRoutine.steps.filter(s => s.trim()).length === 0) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      await api.createRoutine({ ...newRoutine, steps: newRoutine.steps.filter(s => s.trim()) });
      setNewRoutine({ name: '', time: '07:00', steps: [''], days: [] });
      setModalVisible(false);
      loadRoutines();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(routineId: string) {
    Alert.alert('Delete Routine', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteRoutine(routineId);
          loadRoutines();
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.title}>Routines</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.routine_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Ionicons name="list" size={32} color="#3498DB" />
            <View style={styles.cardContent}>
              <Text style={styles.routineName}>{item.name}</Text>
              <Text style={styles.routineTime}>{item.time}</Text>
              <Text style={styles.routineSteps}>{item.steps.length} steps</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.routine_id)}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="list-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>No routines</Text></View>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Routine</Text>
            <TouchableOpacity onPress={handleCreate}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Routine name" value={newRoutine.name} onChangeText={(text) => setNewRoutine({ ...newRoutine, name: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Time (HH:MM)" value={newRoutine.time} onChangeText={(text) => setNewRoutine({ ...newRoutine, time: text })} placeholderTextColor="#999" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Steps (one per line)" value={newRoutine.steps.join('\n')} onChangeText={(text) => setNewRoutine({ ...newRoutine, steps: text.split('\n') })} multiline numberOfLines={5} placeholderTextColor="#999" />
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
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardContent: { flex: 1, marginLeft: 12 },
  routineName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  routineTime: { fontSize: 14, color: '#666', marginTop: 4 },
  routineSteps: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#3498DB', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#3498DB' },
  modalContent: { padding: 24 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 120, textAlignVertical: 'top' },
});
