import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function MedicationsScreen() {
  const router = useRouter();
  const [meds, setMeds] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', times: ['08:00'] });

  useEffect(() => { loadMeds(); }, []);

  async function loadMeds() {
    try {
      const data = await api.getMedications();
      setMeds(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreate() {
    if (!newMed.name.trim() || !newMed.dosage.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      await api.createMedication(newMed);
      setNewMed({ name: '', dosage: '', times: ['08:00'] });
      setModalVisible(false);
      loadMeds();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(medId: string) {
    Alert.alert('Delete Medication', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteMedication(medId);
          loadMeds();
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Medications</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={meds}
        keyExtractor={(item) => item.med_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Ionicons name="medical" size={32} color="#FF6B6B" />
            <View style={styles.cardContent}>
              <Text style={styles.medName}>{item.name}</Text>
              <Text style={styles.medDosage}>{item.dosage}</Text>
              <Text style={styles.medTimes}>{item.times.join(', ')}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.med_id)}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="medical-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>No medications</Text></View>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Medication</Text>
            <TouchableOpacity onPress={handleCreate}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Medication name" value={newMed.name} onChangeText={(text) => setNewMed({ ...newMed, name: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Dosage (e.g., 10mg)" value={newMed.dosage} onChangeText={(text) => setNewMed({ ...newMed, dosage: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Times (e.g., 08:00, 20:00)" value={newMed.times.join(', ')} onChangeText={(text) => setNewMed({ ...newMed, times: text.split(',').map(t => t.trim()) })} placeholderTextColor="#999" />
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
  medName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  medDosage: { fontSize: 14, color: '#666', marginTop: 4 },
  medTimes: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#FF6B6B' },
  modalContent: { padding: 24 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
});
