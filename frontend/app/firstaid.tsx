import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';

type GuideStep = {
  step_number: number;
  title: string;
  description: string;
  tip: string;
};

type GuideSummary = {
  guide_id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  severity: string;
  image_url: string;
  call_911: boolean;
  overview: string;
  step_count: number;
};

type GuideDetail = GuideSummary & {
  when_to_call_911: string;
  steps: GuideStep[];
  do_nots: string[];
  important_notes: string[];
};

type Category = {
  category_id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

export default function FirstAidScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideDetail | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuideSummary[] | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesData, guidesData] = await Promise.all([
        api.getFirstAidCategories(),
        api.getFirstAidGuides(),
      ]);
      setCategories(categoriesData);
      setGuides(guidesData);
    } catch (error) {
      console.error('Failed to load first aid data:', error);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await api.searchFirstAid(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  async function openGuide(guideId: string) {
    setGuideLoading(true);
    setExpandedStep(null);
    try {
      const detail = await api.getFirstAidGuide(guideId);
      setSelectedGuide(detail);
    } catch (error) {
      console.error('Failed to load guide:', error);
    } finally {
      setGuideLoading(false);
    }
  }

  function callEmergency() {
    const phoneNumber = Platform.OS === 'ios' ? 'telprompt:911' : 'tel:911';
    Linking.openURL(phoneNumber).catch(() => {
      Linking.openURL('tel:911');
    });
  }

  function getSeverityBadge(severity: string) {
    const badges: Record<string, { label: string; bg: string; text: string }> = {
      critical: { label: 'CRITICAL', bg: '#FFE0E0', text: '#D32F2F' },
      severe: { label: 'SEVERE', bg: '#FFF3E0', text: '#E65100' },
      moderate: { label: 'MODERATE', bg: '#FFF8E1', text: '#F57F17' },
      mild: { label: 'MILD', bg: '#E8F5E9', text: '#2E7D32' },
      info: { label: 'INFO', bg: '#E3F2FD', text: '#1565C0' },
    };
    return badges[severity] || badges.info;
  }

  const filteredGuides = searchResults !== null
    ? searchResults
    : selectedCategory
    ? guides.filter((g) => g.category === selectedCategory)
    : guides;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E74C3C" />
          <Text style={styles.loadingText}>Loading First Aid Guides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Detail view
  if (selectedGuide) {
    const badge = getSeverityBadge(selectedGuide.severity);
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedGuide(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.detailTitle} numberOfLines={2}>
              {selectedGuide.title}
            </Text>
          </View>

          {/* Emergency Banner */}
          {selectedGuide.call_911 && (
            <TouchableOpacity style={styles.emergencyBanner} onPress={callEmergency}>
              <Ionicons name="call" size={24} color="#FFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.emergencyTitle}>Call 911</Text>
                <Text style={styles.emergencyText} numberOfLines={2}>
                  {selectedGuide.when_to_call_911}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Guide Image */}
          {selectedGuide.image_url && !imageErrors.has(selectedGuide.guide_id) && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: selectedGuide.image_url }}
                style={styles.guideImage}
                resizeMode="cover"
                onError={() => {
                  setImageErrors((prev) => new Set(prev).add(selectedGuide.guide_id));
                }}
              />
              <View style={[styles.severityOverlay, { backgroundColor: badge.bg }]}>
                <Text style={[styles.severityText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>
          )}

          {/* Overview */}
          <View style={styles.overviewCard}>
            <Ionicons name="information-circle" size={22} color="#4A90E2" />
            <Text style={styles.overviewText}>{selectedGuide.overview}</Text>
          </View>

          {/* Steps */}
          <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
          {selectedGuide.steps.map((step) => (
            <TouchableOpacity
              key={step.step_number}
              style={[
                styles.stepCard,
                expandedStep === step.step_number && styles.stepCardExpanded,
              ]}
              onPress={() =>
                setExpandedStep(expandedStep === step.step_number ? null : step.step_number)
              }
              activeOpacity={0.7}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: selectedGuide.color }]}>
                  <Text style={styles.stepNumberText}>{step.step_number}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Ionicons
                  name={expandedStep === step.step_number ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#999"
                />
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
              {expandedStep === step.step_number && step.tip && (
                <View style={styles.tipBox}>
                  <Ionicons name="bulb" size={18} color="#F9A825" />
                  <Text style={styles.tipText}>{step.tip}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Do NOT Section */}
          {selectedGuide.do_nots && selectedGuide.do_nots.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>What NOT to Do</Text>
              <View style={styles.doNotCard}>
                {selectedGuide.do_nots.map((item, idx) => (
                  <View key={idx} style={styles.doNotItem}>
                    <Ionicons name="close-circle" size={20} color="#D32F2F" />
                    <Text style={styles.doNotText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Important Notes */}
          {selectedGuide.important_notes && selectedGuide.important_notes.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Important Notes</Text>
              <View style={styles.notesCard}>
                {selectedGuide.important_notes.map((note, idx) => (
                  <View key={idx} style={styles.noteItem}>
                    <Ionicons name="alert-circle" size={20} color="#FF9800" />
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main listing view
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>First Aid Guide</Text>
            <Text style={styles.subtitle}>Quick help when you need it most</Text>
          </View>
          <TouchableOpacity style={styles.emergencyButton} onPress={callEmergency}>
            <Ionicons name="call" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search first aid guides..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Emergency Quick Access */}
        <TouchableOpacity style={styles.emergencyCard} onPress={callEmergency}>
          <View style={styles.emergencyCardContent}>
            <Ionicons name="call" size={32} color="#FFF" />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={styles.emergencyCardTitle}>Emergency? Call 911</Text>
              <Text style={styles.emergencyCardSubtitle}>
                Tap here to call emergency services
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Categories */}
        {searchResults === null && (
          <>
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Ionicons
                  name="grid"
                  size={16}
                  color={!selectedCategory ? '#FFF' : '#666'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    !selectedCategory && styles.categoryChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.category_id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.category_id && {
                      backgroundColor: cat.color,
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === cat.category_id ? null : cat.category_id
                    )
                  }
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={selectedCategory === cat.category_id ? '#FFF' : cat.color}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.category_id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Search Results Label */}
        {searchResults !== null && (
          <View style={styles.searchResultsHeader}>
            <Ionicons name="search" size={18} color="#666" />
            <Text style={styles.searchResultsText}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          </View>
        )}

        {/* Guide Cards */}
        <Text style={styles.sectionTitle}>
          {selectedCategory
            ? categories.find((c) => c.category_id === selectedCategory)?.name || 'Guides'
            : searchResults !== null
            ? 'Search Results'
            : 'All Guides'}
        </Text>

        {filteredGuides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No guides found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : (
          filteredGuides.map((guide) => {
            const badge = getSeverityBadge(guide.severity);
            return (
              <TouchableOpacity
                key={guide.guide_id}
                style={styles.guideCard}
                onPress={() => openGuide(guide.guide_id)}
                activeOpacity={0.7}
              >
                {/* Guide Image */}
                {guide.image_url && !imageErrors.has(guide.guide_id) && (
                  <Image
                    source={{ uri: guide.image_url }}
                    style={styles.guideCardImage}
                    resizeMode="cover"
                    onError={() => {
                      setImageErrors((prev) => new Set(prev).add(guide.guide_id));
                    }}
                  />
                )}
                <View style={styles.guideCardContent}>
                  <View style={styles.guideCardHeader}>
                    <View style={[styles.guideCardIcon, { backgroundColor: guide.color + '20' }]}>
                      <Ionicons name={guide.icon as any} size={24} color={guide.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.guideCardTitleRow}>
                        <Text style={styles.guideCardTitle} numberOfLines={1}>
                          {guide.title}
                        </Text>
                        {guide.call_911 && (
                          <View style={styles.urgentBadge}>
                            <Ionicons name="call" size={12} color="#FFF" />
                            <Text style={styles.urgentBadgeText}>911</Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.severityBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.severityBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.guideCardOverview} numberOfLines={2}>
                    {guide.overview}
                  </Text>
                  <View style={styles.guideCardFooter}>
                    <Ionicons name="list" size={14} color="#999" />
                    <Text style={styles.guideCardSteps}>{guide.step_count} steps</Text>
                    <Ionicons name="chevron-forward" size={16} color="#CCC" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Loading overlay */}
      {guideLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E74C3C" />
          <Text style={styles.loadingText}>Loading guide...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emergencyButton: {
    backgroundColor: '#E74C3C',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1A1A1A',
  },
  emergencyCard: {
    backgroundColor: '#E74C3C',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emergencyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  emergencyCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emergencyCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  categoriesScroll: {
    marginBottom: 4,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  categoryChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 6,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#666',
  },
  guideCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  guideCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F0',
  },
  guideCardContent: {
    padding: 16,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  guideCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  guideCardOverview: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginTop: 10,
  },
  guideCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  guideCardSteps: {
    flex: 1,
    fontSize: 13,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#CCC',
    marginTop: 4,
  },
  // Detail View Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 4,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  emergencyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  imageContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  guideImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  severityOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overviewCard: {
    flexDirection: 'row',
    backgroundColor: '#EDF4FE',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 4,
  },
  overviewText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 21,
  },
  stepCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  stepCardExpanded: {
    borderColor: '#4A90E2',
    borderWidth: 1.5,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  stepDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    marginTop: 10,
    marginLeft: 42,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFDE7',
    marginTop: 10,
    marginLeft: 42,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 19,
  },
  doNotCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    gap: 10,
  },
  doNotItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  doNotText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  notesCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 10,
  },
  noteItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
