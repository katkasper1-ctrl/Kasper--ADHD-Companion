import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BILL_TYPES = [
  { name: 'bill', label: 'Bill', icon: 'document-text', color: '#FF6B6B' },
  { name: 'bank_statement', label: 'Bank Statement', icon: 'card', color: '#4A90E2' },
  { name: 'invoice', label: 'Invoice', icon: 'receipt', color: '#9B59B6' },
];

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Insurance', 'Subscriptions', 'Other'];

export default function ExpensesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'transactions' | 'statements'>('transactions');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_spent: 0, unpaid_bills: 0, expense_count: 0, bill_count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New transaction modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({ type: 'expense', amount: '', category: '', description: '', photo: null as string | null });

  // New statement modal
  const [statementModalVisible, setStatementModalVisible] = useState(false);
  const [newStatement, setNewStatement] = useState({
    title: '', statement_type: 'bill', amount: '', due_date: '', photo: null as string | null, notes: '',
  });

  // Statement detail
  const [selectedStatement, setSelectedStatement] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [expData, sumData, stmtData] = await Promise.all([
        api.getExpenses(),
        api.getExpenseSummary(),
        api.getStatements(),
      ]);
      setExpenses(expData);
      setSummary(sumData);
      setStatements(stmtData);
    } catch (error: any) {
      console.error('Money tracker load error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // ===== TRANSACTIONS =====

  async function handleCreateExpense() {
    if (!newExpense.amount || !newExpense.category) {
      Alert.alert('Error', 'Please fill amount and category');
      return;
    }
    try {
      await api.createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
      });
      setNewExpense({ type: 'expense', amount: '', category: '', description: '', photo: null });
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

  async function handleDeleteExpense(id: string) {
    Alert.alert('Delete', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteExpense(id); loadData(); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  // ===== STATEMENTS =====

  async function pickStatementImage(useCamera: boolean, target: 'expense' | 'statement') {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', `Allow ${useCamera ? 'camera' : 'gallery'} access to capture bills.`);
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: true });

      if (!result.canceled && result.assets[0]?.base64) {
        const asset = result.assets[0];
        const uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        if (target === 'expense') {
          setNewExpense({ ...newExpense, photo: uri });
        } else {
          setNewStatement({ ...newStatement, photo: uri });
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  }

  async function handleCreateStatement() {
    if (!newStatement.title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    try {
      await api.createStatement({
        ...newStatement,
        amount: newStatement.amount ? parseFloat(newStatement.amount) : null,
      });
      setNewStatement({ title: '', statement_type: 'bill', amount: '', due_date: '', photo: null, notes: '' });
      setStatementModalVisible(false);
      loadData();
      Alert.alert('Saved!', 'Bill/statement photo saved successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleToggleStatementStatus(stmt: any) {
    const newStatus = stmt.status === 'paid' ? 'pending' : 'paid';
    try {
      await api.updateStatement(stmt.statement_id, { status: newStatus });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDeleteStatement(id: string) {
    Alert.alert('Delete', 'Remove this statement?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteStatement(id); setDetailModalVisible(false); loadData(); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  // ===== HELPERS =====
  const unpaidStatements = statements.filter(s => s.status !== 'paid');
  const paidStatements = statements.filter(s => s.status === 'paid');

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}><ActivityIndicator size="large" color="#FFB84D" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.title}>Money Tracker</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Ionicons name="trending-down" size={24} color="#4A90E2" />
            <Text style={s.summaryValue}>${summary.total_spent.toFixed(2)}</Text>
            <Text style={s.summaryLabel}>Spent</Text>
          </View>
          <View style={[s.summaryCard, summary.unpaid_bills > 0 && s.summaryCardAlert]}>
            <Ionicons name="alert-circle" size={24} color={summary.unpaid_bills > 0 ? '#FF6B6B' : '#50C878'} />
            <Text style={[s.summaryValue, summary.unpaid_bills > 0 && { color: '#FF6B6B' }]}>${summary.unpaid_bills.toFixed(2)}</Text>
            <Text style={s.summaryLabel}>Unpaid Bills</Text>
          </View>
        </View>

        {/* Upcoming Bills Alert */}
        {unpaidStatements.length > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="warning-outline" size={18} color="#FF6B6B" />
            <Text style={s.alertText}>{unpaidStatements.length} unpaid bill{unpaidStatements.length > 1 ? 's' : ''} need attention</Text>
          </View>
        )}

        {/* Tab Bar */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'transactions' && s.tabActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Ionicons name="cash-outline" size={18} color={activeTab === 'transactions' ? '#FFF' : '#666'} />
            <Text style={[s.tabText, activeTab === 'transactions' && s.tabTextActive]}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'statements' && s.tabActive]}
            onPress={() => setActiveTab('statements')}
          >
            <Ionicons name="camera-outline" size={18} color={activeTab === 'statements' ? '#FFF' : '#666'} />
            <Text style={[s.tabText, activeTab === 'statements' && s.tabTextActive]}>Bills & Statements</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'transactions' ? (
          <View style={s.listContainer}>
            {expenses.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="cash-outline" size={64} color="#CCC" />
                <Text style={s.emptyText}>No transactions yet</Text>
                <Text style={s.emptySubtext}>Tap + to add expenses or bills</Text>
              </View>
            ) : (
              expenses.map((item: any) => (
                <TouchableOpacity
                  key={item.expense_id}
                  style={s.txCard}
                  onLongPress={() => handleDeleteExpense(item.expense_id)}
                  activeOpacity={0.85}
                >
                  <View style={[s.txIndicator, { backgroundColor: item.type === 'bill' ? '#FF6B6B' : '#4A90E2' }]} />
                  <View style={s.txContent}>
                    <View style={s.txTopRow}>
                      <View style={s.txInfo}>
                        <Text style={s.txDesc}>{item.description || item.category}</Text>
                        <View style={s.txMeta}>
                          <Text style={s.txCategory}>{item.category}</Text>
                          {item.type === 'bill' && (
                            <View style={[s.txBadge, { backgroundColor: item.paid ? '#E8F5E9' : '#FFEBEE' }]}>
                              <Text style={[s.txBadgeText, { color: item.paid ? '#50C878' : '#FF6B6B' }]}>
                                {item.paid ? 'Paid' : 'Unpaid'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={s.txAmount}>${item.amount.toFixed(2)}</Text>
                    </View>
                    {item.photo && (
                      <Image source={{ uri: item.photo }} style={s.txPhoto} resizeMode="cover" />
                    )}
                    {item.type === 'bill' && (
                      <TouchableOpacity style={s.paidToggle} onPress={() => handleTogglePaid(item)}>
                        <Ionicons name={item.paid ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.paid ? '#50C878' : '#CCC'} />
                        <Text style={s.paidToggleText}>{item.paid ? 'Marked as paid' : 'Tap to mark paid'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 80 }} />
          </View>
        ) : (
          <View style={s.statementsContainer}>
            {/* Upload Button */}
            <TouchableOpacity style={s.uploadBtn} onPress={() => setStatementModalVisible(true)}>
              <Ionicons name="camera-outline" size={22} color="#FFF" />
              <Text style={s.uploadBtnText}>Capture Bill or Statement</Text>
            </TouchableOpacity>

            {statements.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#CCC" />
                <Text style={s.emptyText}>No bills or statements</Text>
                <Text style={s.emptySubtext}>Take photos of your bills and bank statements to stay on top of payments</Text>
              </View>
            ) : (
              <>
                {/* Unpaid / Pending */}
                {unpaidStatements.length > 0 && (
                  <View style={s.stmtSection}>
                    <Text style={s.stmtSectionTitle}>Needs Attention ({unpaidStatements.length})</Text>
                    {unpaidStatements.map((stmt: any) => (
                      <TouchableOpacity
                        key={stmt.statement_id}
                        style={s.stmtCard}
                        onPress={() => { setSelectedStatement(stmt); setDetailModalVisible(true); }}
                        activeOpacity={0.85}
                      >
                        <View style={s.stmtCardLeft}>
                          {stmt.photo ? (
                            <Image source={{ uri: stmt.photo }} style={s.stmtThumb} resizeMode="cover" />
                          ) : (
                            <View style={[s.stmtThumbPlaceholder, { backgroundColor: (BILL_TYPES.find(b => b.name === stmt.statement_type)?.color || '#999') + '15' }]}>
                              <Ionicons name={(BILL_TYPES.find(b => b.name === stmt.statement_type)?.icon as any) || 'document-text'} size={24} color={BILL_TYPES.find(b => b.name === stmt.statement_type)?.color || '#999'} />
                            </View>
                          )}
                        </View>
                        <View style={s.stmtCardInfo}>
                          <Text style={s.stmtTitle}>{stmt.title}</Text>
                          {stmt.amount ? <Text style={s.stmtAmount}>${stmt.amount.toFixed(2)}</Text> : null}
                          {stmt.due_date ? (
                            <View style={s.dueDateRow}>
                              <Ionicons name="calendar-outline" size={13} color="#FF6B6B" />
                              <Text style={s.dueDateText}>Due: {stmt.due_date}</Text>
                            </View>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={s.stmtCheckBtn}
                          onPress={() => handleToggleStatementStatus(stmt)}
                        >
                          <Ionicons name="ellipse-outline" size={26} color="#CCC" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Paid */}
                {paidStatements.length > 0 && (
                  <View style={s.stmtSection}>
                    <Text style={[s.stmtSectionTitle, { color: '#50C878' }]}>Paid ({paidStatements.length})</Text>
                    {paidStatements.map((stmt: any) => (
                      <TouchableOpacity
                        key={stmt.statement_id}
                        style={[s.stmtCard, { opacity: 0.7 }]}
                        onPress={() => { setSelectedStatement(stmt); setDetailModalVisible(true); }}
                        activeOpacity={0.85}
                      >
                        <View style={s.stmtCardLeft}>
                          {stmt.photo ? (
                            <Image source={{ uri: stmt.photo }} style={s.stmtThumb} resizeMode="cover" />
                          ) : (
                            <View style={s.stmtThumbPlaceholder}>
                              <Ionicons name="checkmark-circle" size={24} color="#50C878" />
                            </View>
                          )}
                        </View>
                        <View style={s.stmtCardInfo}>
                          <Text style={[s.stmtTitle, { textDecorationLine: 'line-through', color: '#AAA' }]}>{stmt.title}</Text>
                          {stmt.amount ? <Text style={[s.stmtAmount, { color: '#AAA' }]}>${stmt.amount.toFixed(2)}</Text> : null}
                        </View>
                        <Ionicons name="checkmark-circle" size={26} color="#50C878" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            <View style={{ height: 80 }} />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => activeTab === 'transactions' ? setModalVisible(true) : setStatementModalVisible(true)}
      >
        <Ionicons name={activeTab === 'transactions' ? 'add' : 'camera'} size={28} color="#FFF" />
      </TouchableOpacity>

      {/* New Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>New Transaction</Text>
            <TouchableOpacity onPress={handleCreateExpense}><Text style={s.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
            {/* Type Selector */}
            <View style={s.typeRow}>
              <TouchableOpacity
                style={[s.typeBtn, newExpense.type === 'expense' && s.typeBtnActive]}
                onPress={() => setNewExpense({ ...newExpense, type: 'expense' })}
              >
                <Ionicons name="trending-down" size={20} color={newExpense.type === 'expense' ? '#FFF' : '#666'} />
                <Text style={[s.typeBtnText, newExpense.type === 'expense' && s.typeBtnTextActive]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, newExpense.type === 'bill' && { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' }]}
                onPress={() => setNewExpense({ ...newExpense, type: 'bill' })}
              >
                <Ionicons name="document-text" size={20} color={newExpense.type === 'bill' ? '#FFF' : '#666'} />
                <Text style={[s.typeBtnText, newExpense.type === 'bill' && s.typeBtnTextActive]}>Bill</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Amount *</Text>
            <View style={s.amountRow}>
              <Text style={s.dollarSign}>$</Text>
              <TextInput style={s.amountInput} placeholder="0.00" value={newExpense.amount} onChangeText={(t) => setNewExpense({ ...newExpense, amount: t })} keyboardType="decimal-pad" placeholderTextColor="#999" />
            </View>

            <Text style={s.label}>Category *</Text>
            <View style={s.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.categoryChip, newExpense.category === cat && s.categoryChipActive]}
                  onPress={() => setNewExpense({ ...newExpense, category: cat })}
                >
                  <Text style={[s.categoryChipText, newExpense.category === cat && s.categoryChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Description</Text>
            <TextInput style={s.input} placeholder="What was this for?" value={newExpense.description} onChangeText={(t) => setNewExpense({ ...newExpense, description: t })} placeholderTextColor="#999" />

            {/* Photo attachment */}
            <Text style={s.label}>Attach Photo (optional)</Text>
            {newExpense.photo ? (
              <View style={s.photoPreviewContainer}>
                <Image source={{ uri: newExpense.photo }} style={s.photoPreview} resizeMode="contain" />
                <TouchableOpacity style={s.removePhotoBtn} onPress={() => setNewExpense({ ...newExpense, photo: null })}>
                  <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoPickerRow}>
                <TouchableOpacity style={s.photoPickerBtn} onPress={() => pickStatementImage(true, 'expense')}>
                  <Ionicons name="camera" size={28} color="#4A90E2" />
                  <Text style={s.photoPickerText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.photoPickerBtn} onPress={() => pickStatementImage(false, 'expense')}>
                  <Ionicons name="images" size={28} color="#9B59B6" />
                  <Text style={s.photoPickerText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Statement Modal */}
      <Modal visible={statementModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setStatementModalVisible(false)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Add Bill / Statement</Text>
            <TouchableOpacity onPress={handleCreateStatement}><Text style={s.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
            {/* Type Selector */}
            <Text style={s.label}>Type</Text>
            <View style={s.stmtTypeRow}>
              {BILL_TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt.name}
                  style={[s.stmtTypeBtn, newStatement.statement_type === bt.name && { backgroundColor: bt.color, borderColor: bt.color }]}
                  onPress={() => setNewStatement({ ...newStatement, statement_type: bt.name })}
                >
                  <Ionicons name={bt.icon as any} size={18} color={newStatement.statement_type === bt.name ? '#FFF' : bt.color} />
                  <Text style={[s.stmtTypeBtnText, newStatement.statement_type === bt.name && { color: '#FFF' }]}>{bt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Photo */}
            <Text style={s.label}>Take a Photo</Text>
            {newStatement.photo ? (
              <View style={s.photoPreviewContainer}>
                <Image source={{ uri: newStatement.photo }} style={s.photoPreview} resizeMode="contain" />
                <TouchableOpacity style={s.removePhotoBtn} onPress={() => setNewStatement({ ...newStatement, photo: null })}>
                  <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoPickerRow}>
                <TouchableOpacity style={s.photoPickerBtn} onPress={() => pickStatementImage(true, 'statement')}>
                  <Ionicons name="camera" size={28} color="#4A90E2" />
                  <Text style={s.photoPickerText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.photoPickerBtn} onPress={() => pickStatementImage(false, 'statement')}>
                  <Ionicons name="images" size={28} color="#9B59B6" />
                  <Text style={s.photoPickerText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={s.label}>Title *</Text>
            <TextInput style={s.input} placeholder="e.g., Electric Bill - June" value={newStatement.title} onChangeText={(t) => setNewStatement({ ...newStatement, title: t })} placeholderTextColor="#999" />

            <Text style={s.label}>Amount</Text>
            <View style={s.amountRow}>
              <Text style={s.dollarSign}>$</Text>
              <TextInput style={s.amountInput} placeholder="0.00" value={newStatement.amount} onChangeText={(t) => setNewStatement({ ...newStatement, amount: t })} keyboardType="decimal-pad" placeholderTextColor="#999" />
            </View>

            <Text style={s.label}>Due Date</Text>
            <TextInput style={s.input} placeholder="YYYY-MM-DD" value={newStatement.due_date} onChangeText={(t) => setNewStatement({ ...newStatement, due_date: t })} placeholderTextColor="#999" />

            <Text style={s.label}>Notes</Text>
            <TextInput style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Any notes..." value={newStatement.notes} onChangeText={(t) => setNewStatement({ ...newStatement, notes: t })} multiline placeholderTextColor="#999" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Statement Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Details</Text>
            <TouchableOpacity onPress={() => selectedStatement && handleDeleteStatement(selectedStatement.statement_id)}>
              <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          {selectedStatement && (
            <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
              <View style={s.detailHeader}>
                <View style={[s.detailStatusBadge, { backgroundColor: selectedStatement.status === 'paid' ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={[s.detailStatusText, { color: selectedStatement.status === 'paid' ? '#50C878' : '#FF6B6B' }]}>
                    {selectedStatement.status === 'paid' ? 'PAID' : 'UNPAID'}
                  </Text>
                </View>
                <Text style={s.detailTitle}>{selectedStatement.title}</Text>
                {selectedStatement.amount ? <Text style={s.detailAmount}>${selectedStatement.amount.toFixed(2)}</Text> : null}
                {selectedStatement.due_date ? (
                  <View style={s.detailDueRow}>
                    <Ionicons name="calendar" size={16} color="#FF6B6B" />
                    <Text style={s.detailDueText}>Due: {selectedStatement.due_date}</Text>
                  </View>
                ) : null}
              </View>

              {selectedStatement.photo && (
                <Image source={{ uri: selectedStatement.photo }} style={s.detailImage} resizeMode="contain" />
              )}

              {selectedStatement.notes ? (
                <View style={s.detailNotes}>
                  <Text style={s.detailNotesLabel}>Notes</Text>
                  <Text style={s.detailNotesText}>{selectedStatement.notes}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.detailActionBtn, { backgroundColor: selectedStatement.status === 'paid' ? '#FFEBEE' : '#E8F5E9' }]}
                onPress={() => { handleToggleStatementStatus(selectedStatement); setDetailModalVisible(false); }}
              >
                <Ionicons name={selectedStatement.status === 'paid' ? 'close-circle' : 'checkmark-circle'} size={22} color={selectedStatement.status === 'paid' ? '#FF6B6B' : '#50C878'} />
                <Text style={[s.detailActionText, { color: selectedStatement.status === 'paid' ? '#FF6B6B' : '#50C878' }]}>
                  {selectedStatement.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
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

  // Summary
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  summaryCardAlert: { borderWidth: 1, borderColor: '#FFD0D0' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  summaryLabel: { fontSize: 12, color: '#888', marginTop: 4 },

  // Alert Banner
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, padding: 12, backgroundColor: '#FFF5F5', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#FF6B6B' },
  alertText: { fontSize: 13, color: '#FF6B6B', fontWeight: '600', flex: 1 },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: '#ECEDF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#FFB84D', shadowColor: '#FFB84D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Transactions
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  txCard: { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  txIndicator: { width: 4 },
  txContent: { flex: 1, padding: 14 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txInfo: { flex: 1, marginRight: 12 },
  txDesc: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  txMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  txCategory: { fontSize: 13, color: '#888' },
  txBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  txBadgeText: { fontSize: 11, fontWeight: '700' },
  txAmount: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  txPhoto: { width: '100%', height: 120, borderRadius: 10, marginTop: 10, backgroundColor: '#F0F0F0' },
  paidToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  paidToggleText: { fontSize: 13, color: '#888' },

  // Statements
  statementsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4A90E2', paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  uploadBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  stmtSection: { marginBottom: 16 },
  stmtSectionTitle: { fontSize: 15, fontWeight: '700', color: '#FF6B6B', marginBottom: 10 },
  stmtCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  stmtCardLeft: { marginRight: 12 },
  stmtThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#F0F0F0' },
  stmtThumbPlaceholder: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  stmtCardInfo: { flex: 1 },
  stmtTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  stmtAmount: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dueDateText: { fontSize: 12, color: '#FF6B6B', fontWeight: '500' },
  stmtCheckBtn: { padding: 4 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },

  // FAB
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFB84D', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#FFB84D' },
  modalContent: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A', marginBottom: 4 },

  // Type Selector
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  typeBtnActive: { backgroundColor: '#FFB84D', borderColor: '#FFB84D' },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },
  typeBtnTextActive: { color: '#FFF' },

  // Amount
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 16 },
  dollarSign: { fontSize: 20, fontWeight: '600', color: '#50C878', marginRight: 4 },
  amountInput: { flex: 1, paddingVertical: 14, fontSize: 20, fontWeight: '600', color: '#1A1A1A' },

  // Categories
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  categoryChipActive: { backgroundColor: '#FFB84D', borderColor: '#FFB84D' },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  categoryChipTextActive: { color: '#FFF' },

  // Photo Picker
  photoPickerRow: { flexDirection: 'row', gap: 16 },
  photoPickerBtn: { flex: 1, backgroundColor: '#FFF', paddingVertical: 20, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: '#E8E8E8', borderStyle: 'dashed' },
  photoPickerText: { fontSize: 13, color: '#666', marginTop: 6, fontWeight: '500' },
  photoPreviewContainer: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 200, borderRadius: 14, backgroundColor: '#F0F0F0' },
  removePhotoBtn: { position: 'absolute', top: 8, right: 8 },

  // Statement Type
  stmtTypeRow: { flexDirection: 'row', gap: 8 },
  stmtTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  stmtTypeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Detail Modal
  detailHeader: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16 },
  detailStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  detailStatusText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  detailAmount: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', marginTop: 8 },
  detailDueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  detailDueText: { fontSize: 14, color: '#FF6B6B', fontWeight: '500' },
  detailImage: { width: '100%', height: 350, borderRadius: 16, backgroundColor: '#F0F0F0', marginBottom: 16 },
  detailNotes: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  detailNotesLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 4 },
  detailNotesText: { fontSize: 15, color: '#333', lineHeight: 22 },
  detailActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  detailActionText: { fontSize: 16, fontWeight: '600' },
});
