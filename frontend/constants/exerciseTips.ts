import exerciseImagesData from './exerciseImages.json';

export interface ExerciseTip {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Easy' | 'Moderate';
  duration: string;
  muscles: string;
  color: string;
  icon: string;
  imageKey: keyof typeof exerciseImagesData;
  steps: string[];
  benefits: string[];
  adhdTip: string;
}

const EXERCISE_TIPS: ExerciseTip[] = [
  {
    id: 'squats',
    title: 'Bodyweight Squats',
    difficulty: 'Beginner',
    duration: '5 min',
    muscles: 'Legs & Glutes',
    color: '#4A90E2',
    icon: 'body',
    imageKey: 'squats',
    steps: [
      'Stand with feet shoulder-width apart',
      'Keep your chest up and core tight',
      'Lower down like sitting in a chair',
      'Go down until thighs are parallel to floor',
      'Push through heels to stand back up',
      'Repeat 10-15 times for one set',
    ],
    benefits: [
      'Builds leg strength',
      'Improves balance',
      'Boosts energy levels',
    ],
    adhdTip: 'Count each rep out loud to stay focused! Try doing squats during TV commercial breaks.',
  },
  {
    id: 'stretching',
    title: 'Full Body Stretch',
    difficulty: 'Beginner',
    duration: '10 min',
    muscles: 'Full Body',
    color: '#9B59B6',
    icon: 'fitness',
    imageKey: 'stretching',
    steps: [
      'Start with neck rolls — 5 each direction',
      'Reach arms overhead, stretch side to side',
      'Touch your toes (or reach as far as you can)',
      'Do a seated butterfly stretch for hips',
      'Twist your torso gently left and right',
      'Hold each stretch for 15-20 seconds',
    ],
    benefits: [
      'Reduces stress and tension',
      'Improves flexibility',
      'Helps with restlessness',
    ],
    adhdTip: 'Great for when you feel restless! Put on a favorite song and stretch through the whole track.',
  },
  {
    id: 'plank',
    title: 'Plank Hold',
    difficulty: 'Easy',
    duration: '3 min',
    muscles: 'Core & Arms',
    color: '#E74C3C',
    icon: 'barbell',
    imageKey: 'plank',
    steps: [
      'Start face down on the floor',
      'Place forearms on the ground, elbows under shoulders',
      'Push up onto your toes and forearms',
      'Keep your body in a straight line',
      'Squeeze your core — don\'t let hips sag',
      'Hold for 20-30 seconds, rest, repeat 3 times',
    ],
    benefits: [
      'Strengthens your core',
      'Improves posture',
      'Quick and effective',
    ],
    adhdTip: 'Challenge yourself! Use a timer and try to beat your record each time. Short bursts work great for ADHD brains.',
  },
  {
    id: 'jumping',
    title: 'Jumping Jacks',
    difficulty: 'Beginner',
    duration: '5 min',
    muscles: 'Full Body Cardio',
    color: '#FFB84D',
    icon: 'flash',
    imageKey: 'jumping',
    steps: [
      'Stand with feet together, arms at sides',
      'Jump feet out wide while raising arms overhead',
      'Jump feet back together, lower arms',
      'Keep a steady rhythm — not too fast',
      'Do 20 reps, rest 30 seconds',
      'Repeat for 3-4 sets',
    ],
    benefits: [
      'Gets heart pumping quickly',
      'Burns calories fast',
      'Releases excess energy',
    ],
    adhdTip: 'Perfect for burning off extra energy! Do these when you need a quick brain reset between tasks.',
  },
  {
    id: 'walking',
    title: 'Power Walking',
    difficulty: 'Beginner',
    duration: '15-20 min',
    muscles: 'Legs & Cardio',
    color: '#50C878',
    icon: 'walk',
    imageKey: 'group_fitness',
    steps: [
      'Put on comfortable shoes',
      'Start with a normal-pace warm-up walk (2 min)',
      'Pick up the pace — walk briskly',
      'Swing your arms naturally',
      'Keep your posture upright, eyes forward',
      'Cool down with a slow walk for the last 2 min',
    ],
    benefits: [
      'Low impact and easy to start',
      'Improves mood and focus',
      'Great for clearing your mind',
    ],
    adhdTip: 'Listen to a podcast or music to make it fun! Walking helps ADHD brains process thoughts better.',
  },
  {
    id: 'home_workout',
    title: 'Quick Home Workout',
    difficulty: 'Moderate',
    duration: '10 min',
    muscles: 'Full Body',
    color: '#1ABC9C',
    icon: 'home',
    imageKey: 'home_exercise',
    steps: [
      '10 squats to warm up',
      '10 push-ups (or knee push-ups)',
      '20-second plank hold',
      '10 lunges (each leg)',
      '20 jumping jacks',
      'Rest 1 min, repeat circuit 2-3 times',
    ],
    benefits: [
      'No equipment needed',
      'Complete workout in 10 minutes',
      'Builds overall fitness',
    ],
    adhdTip: 'Set a 10-minute timer and just go! Short workouts are easier for ADHD brains to commit to.',
  },
];

export function getExerciseImage(key: string): string | null {
  const images = exerciseImagesData as Record<string, string | null>;
  return images[key] || null;
}

export default EXERCISE_TIPS;
