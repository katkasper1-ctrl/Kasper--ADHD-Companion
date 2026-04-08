import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const COURSE_COLORS = ['#4A90E2', '#50C878', '#FF6B6B', '#FFB84D', '#9B59B6', '#3498DB', '#E74C3C', '#1ABC9C'];

export default function SchoolScreen() {
  const router = useRouter();
  const [view, setView] = useState('assignments'); // 'assignments', 'courses', 'study'
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studyStats, setStudyStats] = useState<any>({ today_minutes: 0, today_sessions: 0, recent_sessions: [] });
  const [assignModal, setAssignModal] = useState(false);
  const [courseModal, setCourseModal] = useState(false);
  const [studyModal, setStudyModal] = useState(false);
  const [newAssign, setNewAssign] = useState({ title: '', course_id: '', due_date: new Date().toISOString(), priority: 'medium' });
  const [newCourse, setNewCourse] = useState({ name: '', color: COURSE_COLORS[0], instructor: '', schedule: '' });
  const [newStudy, setNewStudy] = useState({ course_id: '', duration_minutes: '', topic: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [assignData, courseData, studyData] = await Promise.all([
        api.getAssignments(),
        api.getCourses(),
        api.getStudyStats()
      ]);
      setAssignments(assignData);
      setCourses(courseData);
      setStudyStats(studyData);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreateAssignment() {
    if (!newAssign.title.trim()) {
      Alert.alert('Error', 'Please enter assignment title');
      return;
    }
    try {
      await api.createAssignment({ ...newAssign, course_id: newAssign.course_id || null });
      setNewAssign({ title: '', course_id: '', due_date: new Date().toISOString(), priority: 'medium' });
      setAssignModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleToggleAssignment(assignment: any) {
    try {
      await api.updateAssignment(assignment.assignment_id, { completed: !assignment.completed });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCreateCourse() {
    if (!newCourse.name.trim()) {
      Alert.alert('Error', 'Please enter course name');
      return;
    }
    try {
      await api.createCourse(newCourse);
      setNewCourse({ name: '', color: COURSE_COLORS[0], instructor: '', schedule: '' });
      setCourseModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleLogStudy() {
    const duration = parseInt(newStudy.duration_minutes);
    if (!duration || !newStudy.topic.trim()) {
      Alert.alert('Error', 'Please enter duration and topic');
      return;
    }
    try {
      await api.createStudySession({ ...newStudy, course_id: newStudy.course_id || null, duration_minutes: duration });
      setNewStudy({ course_id: '', duration_minutes: '', topic: '', notes: '' });
      setStudyModal(false);
      loadData();
      Alert.alert('📚 Great work!', `Logged ${duration} minutes of studying`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.title}>School & Study</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, view === 'assignments' && styles.tabActive]} onPress={() => setView('assignments')}>
          <Text style={[styles.tabText, view === 'assignments' && styles.tabTextActive]}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'courses' && styles.tabActive]} onPress={() => setView('courses')}>
          <Text style={[styles.tabText, view === 'courses' && styles.tabTextActive]}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'study' && styles.tabActive]} onPress={() => setView('study')}>
          <Text style={[styles.tabText, view === 'study' && styles.tabTextActive]}>Study Log</Text>
        </TouchableOpacity>
      </View>

      {view === 'assignments' && (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.assignment_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.assignCard}>
              <TouchableOpacity onPress={() => handleToggleAssignment(item)}>
                <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={28} color={item.completed ? '#50C878' : '#CCC'} />
              </TouchableOpacity>
              <View style={styles.assignContent}>
                <Text style={[styles.assignTitle, item.completed && styles.completedText]}>{item.title}</Text>
                {item.course_name && <Text style={styles.courseName}>{item.course_name}</Text>}
                <Text style={styles.dueDate}>Due: {format(new Date(item.due_date), 'MMM dd, h:mm a')}</Text>
              </View>
              <View style={[styles.priorityDot, { backgroundColor: item.priority === 'high' ? '#FF6B6B' : item.priority === 'medium' ? '#FFB84D' : '#4A90E2' }]} />
            </View>
          )}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="school-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>No assignments</Text></View>}
        />
      )}

      {view === 'courses' && (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.course_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.courseCard, { borderLeftColor: item.color }]}>
              <View style={styles.courseContent}>
                <Text style={styles.courseTitle}>{item.name}</Text>
                {item.instructor && <Text style={styles.courseInstructor}>{item.instructor}</Text>}
                {item.schedule && <Text style={styles.courseSchedule}>{item.schedule}</Text>}
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="book-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>No courses</Text></View>}
        />
      )}

      {view === 'study' && (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{studyStats.today_minutes}</Text>
              <Text style={styles.statLabel}>Today (min)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{studyStats.today_sessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Recent Study Sessions</Text>
          {studyStats.recent_sessions.length === 0 ? (
            <View style={styles.emptyState}><Ionicons name="bulb-outline" size={64} color="#CCC" /><Text style={styles.emptyText}>No study sessions</Text></View>
          ) : (
            studyStats.recent_sessions.map((session: any) => (
              <View key={session.study_session_id} style={styles.studyCard}>
                <Ionicons name="book" size={24} color="#4A90E2" />
                <View style={styles.studyContent}>
                  <Text style={styles.studyTopic}>{session.topic}</Text>
                  {session.course_name && <Text style={styles.courseName}>{session.course_name}</Text>}
                  <Text style={styles.studyInfo}>{session.duration_minutes} min • {format(new Date(session.timestamp), 'MMM dd, h:mm a')}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (view === 'assignments') setAssignModal(true);
          else if (view === 'courses') setCourseModal(true);
          else setStudyModal(true);
        }}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Assignment Modal */}
      <Modal visible={assignModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAssignModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Assignment</Text>
            <TouchableOpacity onPress={handleCreateAssignment}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Assignment title" value={newAssign.title} onChangeText={(text) => setNewAssign({ ...newAssign, title: text })} placeholderTextColor="#999" />
            <Text style={styles.label}>Course (optional)</Text>
            <View style={styles.courseSelect}>
              {courses.map((course) => (
                <TouchableOpacity key={course.course_id} style={[styles.courseChip, newAssign.course_id === course.course_id && { backgroundColor: course.color }]} onPress={() => setNewAssign({ ...newAssign, course_id: course.course_id })}>
                  <Text style={[styles.courseChipText, newAssign.course_id === course.course_id && { color: '#FFF' }]}>{course.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Course Modal */}
      <Modal visible={courseModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCourseModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Course</Text>
            <TouchableOpacity onPress={handleCreateCourse}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput style={styles.input} placeholder="Course name" value={newCourse.name} onChangeText={(text) => setNewCourse({ ...newCourse, name: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Instructor (optional)" value={newCourse.instructor} onChangeText={(text) => setNewCourse({ ...newCourse, instructor: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Schedule (e.g., Mon/Wed 10am)" value={newCourse.schedule} onChangeText={(text) => setNewCourse({ ...newCourse, schedule: text })} placeholderTextColor="#999" />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {COURSE_COLORS.map((color) => (
                <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color }, newCourse.color === color && styles.colorSelected]} onPress={() => setNewCourse({ ...newCourse, color })} />
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Study Session Modal */}
      <Modal visible={studyModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setStudyModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Log Study Session</Text>
            <TouchableOpacity onPress={handleLogStudy}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Course (optional)</Text>
            <View style={styles.courseSelect}>
              {courses.map((course) => (
                <TouchableOpacity key={course.course_id} style={[styles.courseChip, newStudy.course_id === course.course_id && { backgroundColor: course.color }]} onPress={() => setNewStudy({ ...newStudy, course_id: course.course_id })}>
                  <Text style={[styles.courseChipText, newStudy.course_id === course.course_id && { color: '#FFF' }]}>{course.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Topic" value={newStudy.topic} onChangeText={(text) => setNewStudy({ ...newStudy, topic: text })} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Duration (minutes)" value={newStudy.duration_minutes} onChangeText={(text) => setNewStudy({ ...newStudy, duration_minutes: text })} keyboardType="number-pad" placeholderTextColor="#999" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Notes (optional)" value={newStudy.notes} onChangeText={(text) => setNewStudy({ ...newStudy, notes: text })} multiline numberOfLines={4} placeholderTextColor="#999" />
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
  tabs: { flexDirection: 'row', padding: 16, gap: 8 },
  tab: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#E0E0E0', alignItems: 'center' },
  tabActive: { backgroundColor: '#4A90E2' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },
  list: { padding: 16 },
  assignCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  assignContent: { flex: 1, marginLeft: 12 },
  assignTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  completedText: { textDecorationLine: 'line-through', color: '#999' },
  courseName: { fontSize: 12, color: '#666', marginTop: 4 },
  dueDate: { fontSize: 12, color: '#999', marginTop: 4 },
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  courseCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  courseContent: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  courseInstructor: { fontSize: 14, color: '#666', marginTop: 4 },
  courseSchedule: { fontSize: 12, color: '#999', marginTop: 4 },
  statsCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, gap: 32, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#4A90E2' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  studyCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  studyContent: { flex: 1, marginLeft: 12 },
  studyTopic: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  studyInfo: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalCancel: { fontSize: 16, color: '#FF6B6B' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalSave: { fontSize: 16, fontWeight: '600', color: '#4A90E2' },
  modalContent: { padding: 24 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { height: 100, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  courseSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  courseChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E0E0E0' },
  courseChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  colorOption: { width: 44, height: 44, borderRadius: 22 },
  colorSelected: { borderWidth: 3, borderColor: '#1A1A1A' },
});
