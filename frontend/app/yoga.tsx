import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import YOGA_POSES, { getYogaImage, YogaPose } from '../constants/yogaPoses';

function PoseDetailModal({ pose, visible, onClose }: { pose: YogaPose | null; visible: boolean; onClose: () => void }) {
  if (!pose) return null;
  const imageUri = getYogaImage(pose.imageKey);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={dm.container}>
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={dm.headerTitle}>{pose.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={dm.content} showsVerticalScrollIndicator={false}>
          {imageUri && (
            <View style={dm.imageWrapper}>
              <Image source={{ uri: imageUri }} style={dm.image} resizeMode="cover" />
              <View style={[dm.diffBadge, { backgroundColor: pose.color }]}>
                <Text style={dm.diffText}>{pose.difficulty}</Text>
              </View>
            </View>
          )}

          {/* Sanskrit name & Duration */}
          <View style={dm.metaRow}>
            <View style={dm.metaItem}>
              <Text style={dm.sanskritText}>{pose.sanskrit}</Text>
            </View>
            <View style={dm.metaItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={dm.metaText}>{pose.duration}</Text>
            </View>
          </View>

          {/* Body Parts Helped */}
          <View style={dm.section}>
            <View style={dm.sectionHeader}>
              <Ionicons name="body-outline" size={20} color={pose.color} />
              <Text style={dm.sectionTitle}>Body Parts This Pose Helps</Text>
            </View>
            <View style={dm.bodyPartsGrid}>
              {pose.bodyParts.map((bp, i) => (
                <View key={i} style={[dm.bodyPartChip, { backgroundColor: bp.color + '15', borderColor: bp.color + '30' }]}>
                  <Ionicons name={bp.icon as any} size={18} color={bp.color} />
                  <Text style={[dm.bodyPartText, { color: bp.color }]}>{bp.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View style={dm.section}>
            <View style={dm.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={pose.color} />
              <Text style={dm.sectionTitle}>How To Do It</Text>
            </View>
            {pose.steps.map((step, i) => (
              <View key={i} style={dm.stepRow}>
                <View style={[dm.stepNum, { backgroundColor: pose.color }]}>
                  <Text style={dm.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={dm.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Benefits */}
          <View style={dm.section}>
            <View style={dm.sectionHeader}>
              <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
              <Text style={dm.sectionTitle}>Benefits</Text>
            </View>
            {pose.benefits.map((b, i) => (
              <View key={i} style={dm.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#50C878" />
                <Text style={dm.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Breathing Tip */}
          <View style={[dm.tipBox, { borderLeftColor: '#4A90E2' }]}>
            <View style={dm.tipHeader}>
              <Ionicons name="cloud-outline" size={20} color="#4A90E2" />
              <Text style={[dm.tipTitle, { color: '#4A90E2' }]}>Breathing Tip</Text>
            </View>
            <Text style={dm.tipText}>{pose.breathingTip}</Text>
          </View>

          {/* ADHD Tip */}
          <View style={[dm.tipBox, { borderLeftColor: pose.color }]}>
            <View style={dm.tipHeader}>
              <Ionicons name="bulb-outline" size={20} color={pose.color} />
              <Text style={[dm.tipTitle, { color: pose.color }]}>ADHD Tip</Text>
            </View>
            <Text style={dm.tipText}>{pose.adhdTip}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function YogaScreen() {
  const router = useRouter();
  const [selectedPose, setSelectedPose] = useState<YogaPose | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.title}>Yoga Poses</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={s.intro}>
          Discover calming yoga poses designed for ADHD minds. Each pose shows which body parts it helps and includes step-by-step instructions.
        </Text>

        {/* Pose Cards */}
        {YOGA_POSES.map((pose) => {
          const imageUri = getYogaImage(pose.imageKey);
          return (
            <TouchableOpacity
              key={pose.id}
              style={s.poseCard}
              onPress={() => { setSelectedPose(pose); setDetailVisible(true); }}
              activeOpacity={0.85}
            >
              {imageUri && (
                <Image source={{ uri: imageUri }} style={s.poseImage} resizeMode="cover" />
              )}
              <View style={s.poseContent}>
                <View style={s.poseHeaderRow}>
                  <View style={[s.poseIcon, { backgroundColor: pose.color + '20' }]}>
                    <Ionicons name={pose.icon as any} size={22} color={pose.color} />
                  </View>
                  <View style={s.poseInfo}>
                    <Text style={s.poseName}>{pose.name}</Text>
                    <Text style={s.poseSanskrit}>{pose.sanskrit}</Text>
                  </View>
                  <View style={s.poseMeta}>
                    <View style={[s.poseBadge, { backgroundColor: pose.color + '15' }]}>
                      <Text style={[s.poseBadgeText, { color: pose.color }]}>{pose.difficulty}</Text>
                    </View>
                    <Text style={s.poseDuration}>{pose.duration}</Text>
                  </View>
                </View>

                {/* Body Parts Preview */}
                <View style={s.bodyPartsRow}>
                  <Ionicons name="body-outline" size={14} color="#888" />
                  <Text style={s.bodyPartsLabel}>Helps: </Text>
                  {pose.bodyParts.map((bp, i) => (
                    <View key={i} style={[s.miniBodyPart, { backgroundColor: bp.color + '15' }]}>
                      <Text style={[s.miniBodyPartText, { color: bp.color }]}>{bp.name}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.tapHint}>
                  <Text style={s.tapHintText}>Tap for full instructions</Text>
                  <Ionicons name="chevron-forward" size={16} color="#CCC" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PoseDetailModal
        pose={selectedPose}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  intro: { fontSize: 14, color: '#666', paddingHorizontal: 24, marginBottom: 16, lineHeight: 20 },

  // Pose Card
  poseCard: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  poseImage: { width: '100%', height: 160, backgroundColor: '#E8E8E8' },
  poseContent: { padding: 16 },
  poseHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  poseIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  poseInfo: { flex: 1, marginLeft: 12 },
  poseName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  poseSanskrit: { fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 2 },
  poseMeta: { alignItems: 'flex-end' },
  poseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  poseBadgeText: { fontSize: 11, fontWeight: '700' },
  poseDuration: { fontSize: 11, color: '#AAA', marginTop: 4 },

  // Body Parts Row
  bodyPartsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 12, gap: 4 },
  bodyPartsLabel: { fontSize: 12, color: '#888', marginLeft: 4 },
  miniBodyPart: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  miniBodyPartText: { fontSize: 10, fontWeight: '600' },

  // Tap hint
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 },
  tapHintText: { fontSize: 12, color: '#CCC' },
});

const dm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { flex: 1 },
  imageWrapper: { position: 'relative' },
  image: { width: '100%', height: 220, backgroundColor: '#E0E0E0' },
  diffBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  diffText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sanskritText: { fontSize: 15, color: '#888', fontStyle: 'italic', fontWeight: '500' },
  metaText: { fontSize: 14, color: '#555', fontWeight: '500' },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  bodyPartsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bodyPartChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  bodyPartText: { fontSize: 14, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1 },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 15, color: '#444', flex: 1 },
  tipBox: { marginHorizontal: 20, marginTop: 4, marginBottom: 12, padding: 16, backgroundColor: '#FFFBF0', borderLeftWidth: 4, borderRadius: 12 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipText: { fontSize: 14, color: '#555', lineHeight: 22 },
});
