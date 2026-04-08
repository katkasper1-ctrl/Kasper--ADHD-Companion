import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function ExpensesScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_spent: 0, unpaid_bills: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({ type: 'expense', amount: '', category: '', description: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [expData, sumData] = await Promise.all([api.getExpenses(), api.getExpenseSummary()]);
      setExpenses(expData);
      setSummary(sumData);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreate() {
    if (!newExpense.amount || !newExpense.category) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      await api.createExpense({ ...newExpense, amount: parseFloat(newExpense.amount) });
      setNewExpense({ type: 'expense', amount: '', category: '', description: '' });
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleTogglePaid(item: any) {
    try {
      await api.updateExpense(item.expense_id, { paid: !item.paid });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.title}>Money Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Spent</Text>
          <Text style={styles.summaryValue}>${summary.total_spent.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unpaid Bills</Text>
          <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>${summary.unpaid_bills.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.expense_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.typeIndicator, { backgroundColor: item.type === 'bill' ? '#FF6B6B' : '#4A90E2' }]} />
            <View style={styles.cardContent}>
              <Text style={styles.expenseDesc}>{item.description}</Text>
              <Text style={styles.expenseCategory}>{item.category}</Text>
              {item.type === 'bill' && (
                <TouchableOpacity style={styles.paidButton} onPress={() => handleTogglePaid(item)}>
                  <Ionicons name={item.paid ? 'checkbox' : 'square-outline'} size={20} color={item.paid ? '#50C878' : '#CCC'} />
                  <Text style={styles.paidText}>{item.paid ? 'Paid' : 'Unpaid'}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="cash-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>No transactions</Text></View>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Transaction</Text>
            <TouchableOpacity onPress={handleCreate}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.typeButtons}>
              <TouchableOpacity style={[styles.typeButton, newExpense.type === 'expense' && styles.typeButtonActive]} onPress={() => setNewExpense({ ...newExpense, type: 'expense' })}>
                <Text style={[styles.typeButtonText, newExpense.type === 'expense' && styles.typeButtonTextActive]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, newExpense.type === 'bill' && styles.typeButtonActive]} onPress={() => setNewExpense({ ...newExpense, type: 'bill' })}>
                <Text style={[styles.typeButtonText, newExpense.type === 'bill' && styles.typeButtonTextActive]}>Bill</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Amount" value={newExpense.amount} onChangeText={(text) => setNewExpense({ ...newExpense, amount: text })} keyboardType="decimal-pad" placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Category" value={newExpense.category} onChangeText={(text) => setNewExpense({ ...newExpense, category: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Description" value={newExpense.description} onChangeText={(text) => setNewExpense({ ...newExpense, description: text })} placeholderTextColor="#999" />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  summaryContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginTop: 8 },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  typeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  cardContent: { flex: 1 },
  expenseDesc: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  expenseCategory: { fontSize: 14, color: '#666', marginTop: 4 },
  expenseAmount: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  paidButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  paidText: { fontSize: 14, color: '#666', marginLeft: 4 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFB84D', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#FFB84D' },
  modalContent: { padding: 24 },
  typeButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  typeButtonActive: { backgroundColor: '#FFB84D', borderColor: '#FFB84D' },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  typeButtonTextActive: { color: '#FFF' },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
});
