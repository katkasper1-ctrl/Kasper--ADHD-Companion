import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = [
  { name: 'Produce', icon: 'leaf', color: '#50C878' },
  { name: 'Dairy', icon: 'water', color: '#87CEEB' },
  { name: 'Meat', icon: 'restaurant', color: '#E74C3C' },
  { name: 'Bakery', icon: 'cafe', color: '#D2691E' },
  { name: 'Frozen', icon: 'snow', color: '#6CB4EE' },
  { name: 'Snacks', icon: 'pizza', color: '#FFB84D' },
  { name: 'Drinks', icon: 'beer', color: '#9B59B6' },
  { name: 'Household', icon: 'home', color: '#3498DB' },
  { name: 'Other', icon: 'basket', color: '#999' },
];

export default function GroceryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'list' | 'receipts'>('list');
  const [items, setItems] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [spending, setSpending] = useState<any>({ total_this_week: 0, total_this_month: 0, total_all_time: 0, receipt_count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick add
  const [quickAddText, setQuickAddText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Receipt modal
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptTotal, setReceiptTotal] = useState('');
  const [receiptStore, setReceiptStore] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Receipt detail modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptDetailVisible, setReceiptDetailVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [itemsData, receiptsData, spendingData] = await Promise.all([
        api.getGroceryItems(),
        api.getGroceryReceipts(),
        api.getGrocerySpending(),
      ]);
      setItems(itemsData);
      setReceipts(receiptsData);
      setSpending(spendingData);
    } catch (error: any) {
      console.error('Grocery load error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // ===== GROCERY LIST =====

  async function handleQuickAdd() {
    const name = quickAddText.trim();
    if (!name) return;

    try {
      const newItem = await api.createGroceryItem({
        name,
        category: selectedCategory,
        quantity: '1',
      });
      setItems([newItem, ...items]);
      setQuickAddText('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleToggleItem(item: any) {
    try {
      const updated = await api.updateGroceryItem(item.item_id, { checked: !item.checked });
      setItems(items.map(i => i.item_id === item.item_id ? updated : i));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await api.deleteGroceryItem(itemId);
      setItems(items.filter(i => i.item_id !== itemId));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleClearChecked() {
    const checkedCount = items.filter(i => i.checked).length;
    if (checkedCount === 0) {
      Alert.alert('Nothing to clear', 'No checked items to remove.');
      return;
    }
    Alert.alert(
      'Clear Checked Items',
      `Remove ${checkedCount} checked item${checkedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clearCheckedGroceries();
              setItems(items.filter(i => !i.checked));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  // ===== RECEIPT HANDLING =====

  async function pickImage(useCamera: boolean) {
    try {
      const permResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permResult.granted) {
        Alert.alert('Permission Needed', `Please allow ${useCamera ? 'camera' : 'gallery'} access to take receipt photos.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.5,
            base64: true,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.5,
            base64: true,
            allowsEditing: true,
          });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          setReceiptImage(`data:${mimeType};base64,${asset.base64}`);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  }

  async function handleUploadReceipt() {
    const total = parseFloat(receiptTotal);
    if (!total || total <= 0) {
      Alert.alert('Error', 'Please enter a valid total amount');
      return;
    }

    setUploading(true);
    try {
      const newReceipt = await api.uploadGroceryReceipt({
        total_amount: total,
        store_name: receiptStore.trim(),
        receipt_image: receiptImage,
        notes: receiptNotes.trim(),
      });
      setReceipts([newReceipt, ...receipts]);
      // Refresh spending
      const spendingData = await api.getGrocerySpending();
      setSpending(spendingData);
      // Reset form
      setReceiptImage(null);
      setReceiptTotal('');
      setReceiptStore('');
      setReceiptNotes('');
      setReceiptModalVisible(false);
      Alert.alert('Receipt Saved!', `$${total.toFixed(2)} grocery trip recorded.`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteReceipt(receiptId: string) {
    Alert.alert('Delete Receipt', 'Remove this receipt?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGroceryReceipt(receiptId);
            setReceipts(receipts.filter(r => r.receipt_id !== receiptId));
            const spendingData = await api.getGrocerySpending();
            setSpending(spendingData);
            setReceiptDetailVisible(false);
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  // ===== GROUP ITEMS BY CATEGORY =====

  const uncheckedItems = items.filter(i => !i.checked);
  const checkedItems = items.filter(i => i.checked);

  const groupedItems = CATEGORIES.reduce((acc: any, cat) => {
    const catItems = uncheckedItems.filter(i => i.category === cat.name);
    if (catItems.length > 0) {
      acc.push({ category: cat, items: catItems });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#50C878" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Groceries</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Spending Summary */}
        <View style={styles.spendingRow}>
          <View style={styles.spendingCard}>
            <Text style={styles.spendingLabel}>This Week</Text>
            <Text style={styles.spendingValue}>${spending.total_this_week.toFixed(2)}</Text>
          </View>
          <View style={styles.spendingCard}>
            <Text style={styles.spendingLabel}>This Month</Text>
            <Text style={styles.spendingValue}>${spending.total_this_month.toFixed(2)}</Text>
          </View>
          <View style={styles.spendingCard}>
            <Text style={styles.spendingLabel}>All Time</Text>
            <Text style={styles.spendingValue}>${spending.total_all_time.toFixed(2)}</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'list' && styles.tabActive]}
            onPress={() => setActiveTab('list')}
          >
            <Ionicons name="list-outline" size={18} color={activeTab === 'list' ? '#FFF' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>Shopping List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'receipts' && styles.tabActive]}
            onPress={() => setActiveTab('receipts')}
          >
            <Ionicons name="receipt-outline" size={18} color={activeTab === 'receipts' ? '#FFF' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'receipts' && styles.tabTextActive]}>Receipts</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'list' ? (
          <View style={styles.listContainer}>
            {/* Quick Add */}
            <View style={styles.quickAddRow}>
              <TouchableOpacity
                style={[styles.categoryBtn, { backgroundColor: CATEGORIES.find(c => c.name === selectedCategory)?.color + '20' }]}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Ionicons
                  name={(CATEGORIES.find(c => c.name === selectedCategory)?.icon as any) || 'basket'}
                  size={20}
                  color={CATEGORIES.find(c => c.name === selectedCategory)?.color || '#999'}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.quickAddInput}
                placeholder="Add item..."
                placeholderTextColor="#999"
                value={quickAddText}
                onChangeText={setQuickAddText}
                onSubmitEditing={handleQuickAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, !quickAddText.trim() && styles.addBtnDisabled]}
                onPress={handleQuickAdd}
                disabled={!quickAddText.trim()}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Category Picker */}
            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryOption,
                      selectedCategory === cat.name && { backgroundColor: cat.color + '20', borderColor: cat.color },
                    ]}
                    onPress={() => { setSelectedCategory(cat.name); setShowCategoryPicker(false); }}
                  >
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                    <Text style={[styles.categoryOptionText, { color: cat.color }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Items by Category */}
            {groupedItems.length === 0 && checkedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>Your grocery list is empty</Text>
                <Text style={styles.emptySubtext}>Add items above to get started!</Text>
              </View>
            ) : (
              <>
                {groupedItems.map((group: any) => (
                  <View key={group.category.name} style={styles.categoryGroup}>
                    <View style={styles.categoryHeader}>
                      <Ionicons name={group.category.icon as any} size={16} color={group.category.color} />
                      <Text style={[styles.categoryTitle, { color: group.category.color }]}>{group.category.name}</Text>
                      <Text style={styles.categoryCount}>{group.items.length}</Text>
                    </View>
                    {group.items.map((item: any) => (
                      <View key={item.item_id} style={styles.itemRow}>
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => handleToggleItem(item)}
                        >
                          <Ionicons name="ellipse-outline" size={24} color="#CCC" />
                        </TouchableOpacity>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.quantity !== '1' && (
                            <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(item.item_id)}
                          style={styles.deleteItemBtn}
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#DDD" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}

                {/* Checked Items */}
                {checkedItems.length > 0 && (
                  <View style={styles.checkedSection}>
                    <View style={styles.checkedHeader}>
                      <Text style={styles.checkedTitle}>Checked ({checkedItems.length})</Text>
                      <TouchableOpacity onPress={handleClearChecked}>
                        <Text style={styles.clearBtn}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                    {checkedItems.map((item: any) => (
                      <View key={item.item_id} style={styles.itemRow}>
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => handleToggleItem(item)}
                        >
                          <Ionicons name="checkmark-circle" size={24} color="#50C878" />
                        </TouchableOpacity>
                        <View style={styles.itemInfo}>
                          <Text style={[styles.itemName, styles.checkedItemName]}>{item.name}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(item.item_id)}
                          style={styles.deleteItemBtn}
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#DDD" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            <View style={{ height: 80 }} />
          </View>
        ) : (
          <View style={styles.receiptsContainer}>
            {/* Add Receipt Button */}
            <TouchableOpacity
              style={styles.addReceiptBtn}
              onPress={() => setReceiptModalVisible(true)}
            >
              <Ionicons name="camera-outline" size={22} color="#FFF" />
              <Text style={styles.addReceiptText}>Add Receipt</Text>
            </TouchableOpacity>

            {receipts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No receipts yet</Text>
                <Text style={styles.emptySubtext}>Take a photo of your grocery receipt to track spending!</Text>
              </View>
            ) : (
              receipts.map((receipt: any) => (
                <TouchableOpacity
                  key={receipt.receipt_id}
                  style={styles.receiptCard}
                  onPress={() => { setSelectedReceipt(receipt); setReceiptDetailVisible(true); }}
                  activeOpacity={0.85}
                >
                  <View style={styles.receiptCardLeft}>
                    {receipt.receipt_image ? (
                      <Image
                        source={{ uri: receipt.receipt_image }}
                        style={styles.receiptThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.receiptThumbPlaceholder}>
                        <Ionicons name="receipt-outline" size={24} color="#CCC" />
                      </View>
                    )}
                  </View>
                  <View style={styles.receiptCardInfo}>
                    <Text style={styles.receiptAmount}>${receipt.total_amount.toFixed(2)}</Text>
                    {receipt.store_name ? (
                      <Text style={styles.receiptStore}>{receipt.store_name}</Text>
                    ) : null}
                    <Text style={styles.receiptDate}>{receipt.date}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 80 }} />
          </View>
        )}
      </ScrollView>

      {/* Receipt Upload Modal */}
      <Modal visible={receiptModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Receipt</Text>
            <TouchableOpacity onPress={handleUploadReceipt} disabled={uploading}>
              <Text style={[styles.modalSave, uploading && { opacity: 0.5 }]}>
                {uploading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Receipt Photo */}
            <Text style={styles.label}>Receipt Photo</Text>
            {receiptImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: receiptImage }} style={styles.imagePreview} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setReceiptImage(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera" size={32} color="#4A90E2" />
                  <Text style={styles.imagePickerText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(false)}>
                  <Ionicons name="images" size={32} color="#9B59B6" />
                  <Text style={styles.imagePickerText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Total Amount *</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#999"
                value={receiptTotal}
                onChangeText={setReceiptTotal}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.label}>Store Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Walmart, Trader Joe's"
              placeholderTextColor="#999"
              value={receiptStore}
              onChangeText={setReceiptStore}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any notes about this trip..."
              placeholderTextColor="#999"
              value={receiptNotes}
              onChangeText={setReceiptNotes}
              multiline
              numberOfLines={3}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Detail Modal */}
      <Modal visible={receiptDetailVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setReceiptDetailVisible(false)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Receipt Details</Text>
            <TouchableOpacity onPress={() => selectedReceipt && handleDeleteReceipt(selectedReceipt.receipt_id)}>
              <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          {selectedReceipt && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.receiptDetailHeader}>
                <Text style={styles.receiptDetailAmount}>${selectedReceipt.total_amount.toFixed(2)}</Text>
                {selectedReceipt.store_name ? (
                  <Text style={styles.receiptDetailStore}>{selectedReceipt.store_name}</Text>
                ) : null}
                <Text style={styles.receiptDetailDate}>{selectedReceipt.date}</Text>
              </View>
              {selectedReceipt.receipt_image && (
                <Image
                  source={{ uri: selectedReceipt.receipt_image }}
                  style={styles.receiptDetailImage}
                  resizeMode="contain"
                />
              )}
              {selectedReceipt.notes ? (
                <View style={styles.receiptDetailNotes}>
                  <Text style={styles.receiptDetailNotesLabel}>Notes</Text>
                  <Text style={styles.receiptDetailNotesText}>{selectedReceipt.notes}</Text>
                </View>
              ) : null}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },

  // Spending Summary
  spendingRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  spendingCard: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  spendingLabel: { fontSize: 11, color: '#888', fontWeight: '500', marginBottom: 4 },
  spendingValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  // Tab Bar
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 8, backgroundColor: '#ECEDF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#50C878', shadowColor: '#50C878', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Quick Add
  quickAddRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  categoryBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  quickAddInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A' },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#50C878', justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },

  // Category Picker
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  categoryOptionText: { fontSize: 12, fontWeight: '600' },

  // List
  listContainer: { paddingTop: 8 },
  categoryGroup: { marginBottom: 8 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 8, gap: 6 },
  categoryTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryCount: { fontSize: 12, color: '#AAA', marginLeft: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, marginBottom: 4, backgroundColor: '#FFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  checkbox: { padding: 4, marginRight: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  itemQuantity: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteItemBtn: { padding: 4 },
  checkedItemName: { textDecorationLine: 'line-through', color: '#AAA' },

  // Checked Section
  checkedSection: { marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E8E8E8' },
  checkedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  checkedTitle: { fontSize: 14, fontWeight: '600', color: '#AAA' },
  clearBtn: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },

  // Receipts Tab
  receiptsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  addReceiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4A90E2', paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  addReceiptText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  receiptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  receiptCardLeft: { marginRight: 12 },
  receiptThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F0F0F0' },
  receiptThumbPlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  receiptCardInfo: { flex: 1 },
  receiptAmount: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  receiptStore: { fontSize: 14, color: '#666', marginTop: 2 },
  receiptDate: { fontSize: 12, color: '#999', marginTop: 2 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#50C878' },
  modalContent: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10, marginTop: 16 },

  // Image Picker
  imagePickerRow: { flexDirection: 'row', gap: 16 },
  imagePickerBtn: { flex: 1, backgroundColor: '#FFF', paddingVertical: 24, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#E8E8E8', borderStyle: 'dashed' },
  imagePickerText: { fontSize: 14, color: '#666', marginTop: 8, fontWeight: '500' },
  imagePreviewContainer: { position: 'relative', borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 250, borderRadius: 16, backgroundColor: '#F0F0F0' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8 },

  // Amount Input
  amountInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 16 },
  dollarSign: { fontSize: 20, fontWeight: '600', color: '#50C878', marginRight: 4 },
  amountInput: { flex: 1, paddingVertical: 14, fontSize: 20, fontWeight: '600', color: '#1A1A1A' },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },

  // Receipt Detail
  receiptDetailHeader: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16 },
  receiptDetailAmount: { fontSize: 36, fontWeight: '800', color: '#1A1A1A' },
  receiptDetailStore: { fontSize: 18, color: '#666', marginTop: 4 },
  receiptDetailDate: { fontSize: 14, color: '#999', marginTop: 4 },
  receiptDetailImage: { width: '100%', height: 400, borderRadius: 16, backgroundColor: '#F0F0F0', marginBottom: 16 },
  receiptDetailNotes: { backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  receiptDetailNotesLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 4 },
  receiptDetailNotesText: { fontSize: 15, color: '#333', lineHeight: 22 },
});
