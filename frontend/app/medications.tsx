import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 8 hours', 'As needed', 'Weekly'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MedicationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meds' | 'profile'>('meds');
  const [meds, setMeds] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    allergies: [], conditions: [], emergency_contacts: [],
    hospital_name: '', hospital_address: '', hospital_phone: '',
    doctor_name: '', doctor_phone: '', doctor_specialty: '',
    blood_type: '', insurance_info: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Med modal
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', instructions: '', times: ['08:00'] });

  // Profile editing
  const [editSection, setEditSection] = useState<string | null>(null);
  const [tempInput, setTempInput] = useState('');
  const [tempContact, setTempContact] = useState({ name: '', phone: '', relationship: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [medsData, profileData] = await Promise.all([
        api.getMedications(),
        api.getMedicalProfile(),
      ]);
      setMeds(medsData);
      setProfile(profileData);
    } catch (error: any) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  // ===== MEDICATIONS =====
  async function handleCreateMed() {
    if (!newMed.name.trim() || !newMed.dosage.trim()) {
      Alert.alert('Error', 'Please fill name and dosage');
      return;
    }
    try {
      await api.createMedication(newMed);
      setNewMed({ name: '', dosage: '', frequency: '', instructions: '', times: ['08:00'] });
      setMedModalVisible(false);
      loadData();
    } catch (error: any) { Alert.alert('Error', error.message); }
  }

  async function handleDeleteMed(medId: string) {
    Alert.alert('Delete Medication', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteMedication(medId); loadData(); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  // ===== PROFILE UPDATES =====
  async function saveProfile(updates: any) {
    setSaving(true);
    try {
      const updated = await api.updateMedicalProfile(updates);
      setProfile(updated);
    } catch (error: any) { Alert.alert('Error', error.message); }
    finally { setSaving(false); }
  }

  function addAllergy() {
    if (!tempInput.trim()) return;
    const updated = [...(profile.allergies || []), tempInput.trim()];
    saveProfile({ allergies: updated });
    setTempInput('');
  }

  function removeAllergy(index: number) {
    const updated = [...profile.allergies];
    updated.splice(index, 1);
    saveProfile({ allergies: updated });
  }

  function addCondition() {
    if (!tempInput.trim()) return;
    const updated = [...(profile.conditions || []), tempInput.trim()];
    saveProfile({ conditions: updated });
    setTempInput('');
  }

  function removeCondition(index: number) {
    const updated = [...profile.conditions];
    updated.splice(index, 1);
    saveProfile({ conditions: updated });
  }

  function addEmergencyContact() {
    if (!tempContact.name.trim() || !tempContact.phone.trim()) {
      Alert.alert('Error', 'Please fill name and phone');
      return;
    }
    const updated = [...(profile.emergency_contacts || []), { ...tempContact }];
    saveProfile({ emergency_contacts: updated });
    setTempContact({ name: '', phone: '', relationship: '' });
  }

  function removeEmergencyContact(index: number) {
    const updated = [...profile.emergency_contacts];
    updated.splice(index, 1);
    saveProfile({ emergency_contacts: updated });
  }

  function callNumber(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  if (loading) {
    return <SafeAreaView style={st.container}><View style={st.loadingContainer}><ActivityIndicator size="large" color="#FF6B6B" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={st.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={st.title}>Medical Center</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Quick Info Bar */}
        <View style={st.quickInfoBar}>
          <View style={st.quickInfoItem}>
            <Ionicons name="medical" size={18} color="#FF6B6B" />
            <Text style={st.quickInfoText}>{meds.length} Meds</Text>
          </View>
          {profile.blood_type ? (
            <View style={st.quickInfoItem}>
              <Ionicons name="water" size={18} color="#E74C3C" />
              <Text style={st.quickInfoText}>{profile.blood_type}</Text>
            </View>
          ) : null}
          <View style={st.quickInfoItem}>
            <Ionicons name="alert-circle" size={18} color="#FFB84D" />
            <Text style={st.quickInfoText}>{(profile.allergies || []).length} Allergies</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={st.tabBar}>
          <TouchableOpacity
            style={[st.tab, activeTab === 'meds' && st.tabActive]}
            onPress={() => setActiveTab('meds')}
          >
            <Ionicons name="medical-outline" size={18} color={activeTab === 'meds' ? '#FFF' : '#666'} />
            <Text style={[st.tabText, activeTab === 'meds' && st.tabTextActive]}>Medications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tab, activeTab === 'profile' && st.tabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons name="person-outline" size={18} color={activeTab === 'profile' ? '#FFF' : '#666'} />
            <Text style={[st.tabText, activeTab === 'profile' && st.tabTextActive]}>Medical Profile</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'meds' ? (
          <View style={st.listContainer}>
            {meds.length === 0 ? (
              <View style={st.emptyState}>
                <Ionicons name="medical-outline" size={64} color="#CCC" />
                <Text style={st.emptyText}>No medications</Text>
                <Text style={st.emptySubtext}>Tap + to add your medications</Text>
              </View>
            ) : (
              meds.map((item: any) => (
                <View key={item.med_id} style={st.medCard}>
                  <View style={st.medCardHeader}>
                    <View style={st.medIconContainer}>
                      <Ionicons name="medical" size={24} color="#FF6B6B" />
                    </View>
                    <View style={st.medInfo}>
                      <Text style={st.medName}>{item.name}</Text>
                      <Text style={st.medDosage}>{item.dosage}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteMed(item.med_id)} style={st.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                  <View style={st.medDetails}>
                    {item.frequency ? (
                      <View style={st.medDetailChip}>
                        <Ionicons name="repeat" size={14} color="#4A90E2" />
                        <Text style={st.medDetailText}>{item.frequency}</Text>
                      </View>
                    ) : null}
                    <View style={st.medDetailChip}>
                      <Ionicons name="time" size={14} color="#9B59B6" />
                      <Text style={st.medDetailText}>{item.times.join(', ')}</Text>
                    </View>
                    {item.instructions ? (
                      <View style={st.medDetailChip}>
                        <Ionicons name="information-circle" size={14} color="#FFB84D" />
                        <Text style={st.medDetailText}>{item.instructions}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 80 }} />
          </View>
        ) : (
          <View style={st.profileContainer}>
            {/* Allergies */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="alert-circle" size={20} color="#FFB84D" />
                <Text style={st.sectionTitle}>Allergies</Text>
              </View>
              {(profile.allergies || []).map((allergy: string, idx: number) => (
                <View key={idx} style={st.tagRow}>
                  <View style={[st.tag, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[st.tagText, { color: '#E65100' }]}>{allergy}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeAllergy(idx)} style={st.removeTagBtn}>
                    <Ionicons name="close-circle" size={20} color="#CCC" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={st.addRow}>
                <TextInput
                  style={st.addInput}
                  placeholder="Add allergy (e.g., Penicillin)"
                  value={editSection === 'allergy' ? tempInput : ''}
                  onFocus={() => setEditSection('allergy')}
                  onChangeText={setTempInput}
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  onSubmitEditing={addAllergy}
                />
                <TouchableOpacity
                  style={st.addSmallBtn}
                  onPress={() => { setEditSection('allergy'); addAllergy(); }}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Medical Conditions */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="heart" size={20} color="#E74C3C" />
                <Text style={st.sectionTitle}>Medical Conditions</Text>
              </View>
              {(profile.conditions || []).map((cond: string, idx: number) => (
                <View key={idx} style={st.tagRow}>
                  <View style={[st.tag, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[st.tagText, { color: '#C62828' }]}>{cond}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeCondition(idx)} style={st.removeTagBtn}>
                    <Ionicons name="close-circle" size={20} color="#CCC" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={st.addRow}>
                <TextInput
                  style={st.addInput}
                  placeholder="Add condition (e.g., ADHD, Asthma)"
                  value={editSection === 'condition' ? tempInput : ''}
                  onFocus={() => setEditSection('condition')}
                  onChangeText={setTempInput}
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  onSubmitEditing={addCondition}
                />
                <TouchableOpacity
                  style={st.addSmallBtn}
                  onPress={() => { setEditSection('condition'); addCondition(); }}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Emergency Contacts */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="call" size={20} color="#E74C3C" />
                <Text style={st.sectionTitle}>Emergency Contacts</Text>
              </View>
              {(profile.emergency_contacts || []).map((contact: any, idx: number) => (
                <View key={idx} style={st.contactCard}>
                  <View style={st.contactInfo}>
                    <Text style={st.contactName}>{contact.name}</Text>
                    {contact.relationship ? <Text style={st.contactRelation}>{contact.relationship}</Text> : null}
                    <TouchableOpacity onPress={() => callNumber(contact.phone)} style={st.phoneRow}>
                      <Ionicons name="call" size={14} color="#4A90E2" />
                      <Text style={st.contactPhone}>{contact.phone}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeEmergencyContact(idx)} style={st.removeTagBtn}>
                    <Ionicons name="close-circle" size={22} color="#DDD" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={st.addContactForm}>
                <TextInput style={st.contactInput} placeholder="Name" value={tempContact.name} onChangeText={(t) => setTempContact({ ...tempContact, name: t })} placeholderTextColor="#999" />
                <TextInput style={st.contactInput} placeholder="Phone number" value={tempContact.phone} onChangeText={(t) => setTempContact({ ...tempContact, phone: t })} placeholderTextColor="#999" keyboardType="phone-pad" />
                <TextInput style={st.contactInput} placeholder="Relationship (optional)" value={tempContact.relationship} onChangeText={(t) => setTempContact({ ...tempContact, relationship: t })} placeholderTextColor="#999" />
                <TouchableOpacity style={st.addContactBtn} onPress={addEmergencyContact}>
                  <Ionicons name="person-add" size={18} color="#FFF" />
                  <Text style={st.addContactBtnText}>Add Contact</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Doctor Info */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="person" size={20} color="#4A90E2" />
                <Text style={st.sectionTitle}>Doctor Information</Text>
              </View>
              <View style={st.infoCard}>
                <View style={st.infoRow}>
                  <Ionicons name="person-outline" size={18} color="#888" />
                  <TextInput
                    style={st.infoInput}
                    placeholder="Doctor's name"
                    value={profile.doctor_name || ''}
                    onChangeText={(t) => setProfile({ ...profile, doctor_name: t })}
                    onBlur={() => saveProfile({ doctor_name: profile.doctor_name })}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={st.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#888" />
                  <TextInput
                    style={st.infoInput}
                    placeholder="Doctor's phone"
                    value={profile.doctor_phone || ''}
                    onChangeText={(t) => setProfile({ ...profile, doctor_phone: t })}
                    onBlur={() => saveProfile({ doctor_phone: profile.doctor_phone })}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                  {profile.doctor_phone ? (
                    <TouchableOpacity onPress={() => callNumber(profile.doctor_phone)} style={st.callBtn}>
                      <Ionicons name="call" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={st.infoRow}>
                  <Ionicons name="medkit-outline" size={18} color="#888" />
                  <TextInput
                    style={st.infoInput}
                    placeholder="Specialty (e.g., Psychiatrist)"
                    value={profile.doctor_specialty || ''}
                    onChangeText={(t) => setProfile({ ...profile, doctor_specialty: t })}
                    onBlur={() => saveProfile({ doctor_specialty: profile.doctor_specialty })}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>

            {/* Hospital Info */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="business" size={20} color="#E74C3C" />
                <Text style={st.sectionTitle}>Emergency Hospital</Text>
              </View>
              <View style={st.infoCard}>
                <View style={st.infoRow}>
                  <Ionicons name="business-outline" size={18} color="#888" />
                  <TextInput
                    style={st.infoInput}
                    placeholder="Hospital name"
                    value={profile.hospital_name || ''}
                    onChangeText={(t) => setProfile({ ...profile, hospital_name: t })}
                    onBlur={() => saveProfile({ hospital_name: profile.hospital_name })}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={st.infoRow}>
                  <Ionicons name="location-outline" size={18} color="#888" />
                  <TextInput
                    style={st.infoInput}
                    placeholder="Hospital address"
                    value={profile.hospital_address || ''}
                    onChangeText={(t) => setProfile({ ...profile, hospital_address: t })}
                    onBlur={() => saveProfile({ hospital_address: profile.hospital_address })}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={st.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#888" />
                  <TextInput
                    style={st.infoInput}
                    placeholder="Hospital phone"
                    value={profile.hospital_phone || ''}
                    onChangeText={(t) => setProfile({ ...profile, hospital_phone: t })}
                    onBlur={() => saveProfile({ hospital_phone: profile.hospital_phone })}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                  {profile.hospital_phone ? (
                    <TouchableOpacity onPress={() => callNumber(profile.hospital_phone)} style={st.callBtn}>
                      <Ionicons name="call" size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Blood Type & Insurance */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="water" size={20} color="#E74C3C" />
                <Text style={st.sectionTitle}>Blood Type & Insurance</Text>
              </View>
              <Text style={st.fieldLabel}>Blood Type</Text>
              <View style={st.bloodTypeGrid}>
                {BLOOD_TYPES.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[st.bloodTypeBtn, profile.blood_type === bt && st.bloodTypeBtnActive]}
                    onPress={() => { setProfile({ ...profile, blood_type: bt }); saveProfile({ blood_type: bt }); }}
                  >
                    <Text style={[st.bloodTypeBtnText, profile.blood_type === bt && st.bloodTypeBtnTextActive]}>{bt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={st.fieldLabel}>Insurance Info</Text>
              <TextInput
                style={st.insuranceInput}
                placeholder="Insurance provider / policy number"
                value={profile.insurance_info || ''}
                onChangeText={(t) => setProfile({ ...profile, insurance_info: t })}
                onBlur={() => saveProfile({ insurance_info: profile.insurance_info })}
                placeholderTextColor="#999"
                multiline
              />
            </View>

            <View style={{ height: 80 }} />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {activeTab === 'meds' && (
        <TouchableOpacity style={st.fab} onPress={() => setMedModalVisible(true)}>
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* New Medication Modal */}
      <Modal visible={medModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalContainer}>
          <View style={st.modalHeader}>
            <TouchableOpacity onPress={() => setMedModalVisible(false)}><Text style={st.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={st.modalTitle}>New Medication</Text>
            <TouchableOpacity onPress={handleCreateMed}><Text style={st.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={st.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={st.label}>Medication Name *</Text>
            <TextInput style={st.input} placeholder="e.g., Adderall, Ritalin" value={newMed.name} onChangeText={(t) => setNewMed({ ...newMed, name: t })} placeholderTextColor="#999" />

            <Text style={st.label}>Dosage *</Text>
            <TextInput style={st.input} placeholder="e.g., 20mg, 1 tablet" value={newMed.dosage} onChangeText={(t) => setNewMed({ ...newMed, dosage: t })} placeholderTextColor="#999" />

            <Text style={st.label}>Frequency</Text>
            <View style={st.freqGrid}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[st.freqChip, newMed.frequency === f && st.freqChipActive]}
                  onPress={() => setNewMed({ ...newMed, frequency: f })}
                >
                  <Text style={[st.freqChipText, newMed.frequency === f && st.freqChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.label}>Times</Text>
            <TextInput style={st.input} placeholder="e.g., 08:00, 14:00, 20:00" value={newMed.times.join(', ')} onChangeText={(t) => setNewMed({ ...newMed, times: t.split(',').map(s => s.trim()) })} placeholderTextColor="#999" />

            <Text style={st.label}>Special Instructions</Text>
            <TextInput style={[st.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="e.g., Take with food, avoid grapefruit" value={newMed.instructions} onChangeText={(t) => setNewMed({ ...newMed, instructions: t })} placeholderTextColor="#999" multiline />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },

  // Quick Info
  quickInfoBar: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 10, paddingHorizontal: 16 },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  quickInfoText: { fontSize: 13, fontWeight: '600', color: '#555' },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, marginBottom: 8, backgroundColor: '#ECEDF0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#FF6B6B', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },

  // Medication List
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  medCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  medCardHeader: { flexDirection: 'row', alignItems: 'center' },
  medIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  medInfo: { flex: 1, marginLeft: 12 },
  medName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  medDosage: { fontSize: 14, color: '#FF6B6B', fontWeight: '600', marginTop: 2 },
  deleteBtn: { padding: 8 },
  medDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  medDetailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8F9FA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  medDetailText: { fontSize: 12, color: '#666' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8 },

  // Profile
  profileContainer: { paddingHorizontal: 16, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  // Tags (Allergies & Conditions)
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  tagText: { fontSize: 14, fontWeight: '600' },
  removeTagBtn: { padding: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  addInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A' },
  addSmallBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center' },

  // Emergency Contacts
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  contactRelation: { fontSize: 12, color: '#888', marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  contactPhone: { fontSize: 14, color: '#4A90E2', fontWeight: '500' },
  addContactForm: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginTop: 8, gap: 8 },
  contactInput: { backgroundColor: '#F8F9FA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E8E8E8', color: '#1A1A1A' },
  addContactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6B6B', paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  addContactBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Doctor & Hospital Info Cards
  infoCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 10 },
  infoInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  callBtn: { padding: 8, backgroundColor: '#F0F7FF', borderRadius: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginTop: 8 },

  // Blood Type
  bloodTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodTypeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  bloodTypeBtnActive: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  bloodTypeBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  bloodTypeBtnTextActive: { color: '#FFF' },

  // Insurance
  insuranceInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A', minHeight: 60, textAlignVertical: 'top' },

  // FAB
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#FF6B6B' },
  modalContent: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#1A1A1A' },

  // Frequency Chips
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0' },
  freqChipActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  freqChipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  freqChipTextActive: { color: '#FFF' },
});
