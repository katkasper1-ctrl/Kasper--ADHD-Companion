import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function FocusScreen() {
  const router = useRouter();
  const [duration, setDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total_sessions: 0, total_hours: 0 });
  const [focusTip, setFocusTip] = useState('');
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    loadFocusTip();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  async function loadStats() {
    try {
      const data = await api.getFocusStats();
      setStats(data);
    } catch (error: any) {
      console.error('Stats load error:', error);
    }
  }

  async function loadFocusTip() {
    try {
      const result = await api.getFocusTip();
      setFocusTip(result.tip);
    } catch (error: any) {
      console.error('Tip load error:', error);
    }
  }

  async function handleStart() {
    try {
      const session = await api.startFocusSession({ duration_minutes: duration });
      setSessionId(session.session_id);
      setTimeLeft(duration * 60);
      setIsActive(true);
      
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  function handlePause() {
    setIsActive(false);
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
  }

  async function handleComplete() {
    setIsActive(false);
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    
    if (sessionId) {
      try {
        await api.completeFocusSession(sessionId);
        Alert.alert(
          '🎉 Amazing!',
          `You completed a ${duration}-minute focus session!`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
        setSessionId(null);
        setTimeLeft(duration * 60);
      } catch (error: any) {
        console.error('Complete error:', error);
      }
    }
  }

  function handleReset() {
    setIsActive(false);
    setTimeLeft(duration * 60);
    setSessionId(null);
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (duration * 60));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Focus Timer</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total_sessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total_hours}h</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>

      {/* Timer Circle */}
      <View style={styles.timerContainer}>
        <Animated.View style={[styles.timerCircle, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.progressRing, { opacity: progress }]} />
          <View style={styles.timerContent}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>
              {isActive ? 'Stay focused!' : 'Ready to focus?'}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Duration Selector */}
      {!isActive && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>Duration</Text>
          <View style={styles.durationButtons}>
            {[15, 25, 45, 60].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.durationButton,
                  duration === mins && styles.durationButtonActive,
                ]}
                onPress={() => {
                  setDuration(mins);
                  setTimeLeft(mins * 60);
                }}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    duration === mins && styles.durationButtonTextActive,
                  ]}
                >
                  {mins}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Focus Tip */}
      {focusTip && !isActive ? (
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#FFB84D" />
          <Text style={styles.tipText}>{focusTip}</Text>
        </View>
      ) : null}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isActive ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play" size={32} color="#FFF" />
            <Text style={styles.startButtonText}>Start Focus</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
              <Ionicons name="pause" size={28} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={handleReset}>
              <Ionicons name="stop" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B68EE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#E0D8FF',
    marginTop: 4,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 32,
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#9B8CF0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  progressRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 8,
    borderColor: '#50C878',
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFF',
  },
  timerLabel: {
    fontSize: 16,
    color: '#E0D8FF',
    marginTop: 8,
  },
  durationContainer: {
    padding: 24,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#9B8CF0',
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#FFF',
  },
  durationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  durationButtonTextActive: {
    color: '#7B68EE',
  },
  tipCard: {
    backgroundColor: '#9B8CF0',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
  },
  controlsContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  startButton: {
    backgroundColor: '#50C878',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  activeControls: {
    flexDirection: 'row',
    gap: 16,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#FFB84D',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
