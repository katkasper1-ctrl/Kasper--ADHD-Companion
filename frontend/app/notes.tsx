import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const NOTE_COLORS = ['#FFD700', '#FFB84D', '#FF6B6B', '#50C878', '#4A90E2', '#9B59B6', '#E74C3C', '#1ABC9C'];

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: NOTE_COLORS[0], pinned: false });

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleSaveNote() {
    if (!newNote.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    try {
      if (editMode && currentNote) {
        await api.updateNote(currentNote.note_id, newNote);
      } else {
        await api.createNote(newNote);
      }
      setNewNote({ title: '', content: '', color: NOTE_COLORS[0], pinned: false });
      setModalVisible(false);
      setEditMode(false);
      setCurrentNote(null);
      loadNotes();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handlePinToggle(note: any) {
    try {
      await api.updateNote(note.note_id, { pinned: !note.pinned });
      loadNotes();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(noteId: string) {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteNote(noteId);
          loadNotes();
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  }

  function openEditModal(note: any) {
    setCurrentNote(note);
    setNewNote({ title: note.title, content: note.content, color: note.color, pinned: note.pinned });
    setEditMode(true);
    setModalVisible(true);
  }

  function openNewModal() {
    setEditMode(false);
    setCurrentNote(null);
    setNewNote({ title: '', content: '', color: NOTE_COLORS[0], pinned: false });
    setModalVisible(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.title}>Important Notes</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.note_id}
        contentContainerStyle={styles.list}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.noteCard, { backgroundColor: item.color }]} onPress={() => openEditModal(item)}>
            {item.pinned && (
              <View style={styles.pinBadge}>
                <Ionicons name="pin" size={16} color="#FFF" />
              </View>
            )}
            <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
            <Text style={styles.noteDate}>{format(new Date(item.updated_at), 'MMM dd')}</Text>
            <View style={styles.noteActions}>
              <TouchableOpacity onPress={() => handlePinToggle(item)}>
                <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.note_id)}>
                <Ionicons name="trash-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySubtext}>Tap + to capture important thoughts</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openNewModal}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editMode ? 'Edit Note' : 'New Note'}</Text>
            <TouchableOpacity onPress={handleSaveNote}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newNote.title}
              onChangeText={(text) => setNewNote({ ...newNote, title: text })}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Important details..."
              value={newNote.content}
              onChangeText={(text) => setNewNote({ ...newNote, content: text })}
              multiline
              numberOfLines={10}
              placeholderTextColor="#999"
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {NOTE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, newNote.color === color && styles.colorSelected]}
                  onPress={() => setNewNote({ ...newNote, color })}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.pinToggle}
              onPress={() => setNewNote({ ...newNote, pinned: !newNote.pinned })}
            >
              <Ionicons name={newNote.pinned ? 'pin' : 'pin-outline'} size={24} color="#4A90E2" />
              <Text style={styles.pinText}>Pin this note</Text>
            </TouchableOpacity>
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
  noteCard: { flex: 1, margin: 6, padding: 16, borderRadius: 16, minHeight: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  pinBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4 },
  noteTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  noteContent: { fontSize: 14, color: '#FFF', opacity: 0.9, marginBottom: 8, flex: 1 },
  noteDate: { fontSize: 11, color: '#FFF', opacity: 0.7, marginBottom: 8 },
  noteActions: { flexDirection: 'row', justifyContent: 'space-between' },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 8 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#FFD700' },
  modalContent: { padding: 24 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 200, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  colorOption: { width: 44, height: 44, borderRadius: 22 },
  colorSelected: { borderWidth: 3, borderColor: '#1A1A1A' },
  pinToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  pinText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginLeft: 12 },
});
