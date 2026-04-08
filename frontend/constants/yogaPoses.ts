import yogaImagesData from './yogaImages.json';

export interface BodyPart {
  name: string;
  icon: string;
  color: string;
}

export interface YogaPose {
  id: string;
  name: string;
  sanskrit: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  color: string;
  icon: string;
  imageKey: keyof typeof yogaImagesData;
  bodyParts: BodyPart[];
  steps: string[];
  benefits: string[];
  breathingTip: string;
  adhdTip: string;
}

const YOGA_POSES: YogaPose[] = [
  {
    id: 'childs_pose',
    name: "Child's Pose",
    sanskrit: 'Balasana',
    difficulty: 'Beginner',
    duration: '1-3 min',
    color: '#7B68EE',
    icon: 'body',
    imageKey: 'childs_pose',
    bodyParts: [
      { name: 'Lower Back', icon: 'fitness', color: '#E74C3C' },
      { name: 'Hips', icon: 'body', color: '#9B59B6' },
      { name: 'Thighs', icon: 'walk', color: '#3498DB' },
      { name: 'Ankles', icon: 'footsteps', color: '#E67E22' },
    ],
    steps: [
      'Kneel on the floor with toes together',
      'Sit back on your heels',
      'Separate your knees hip-width apart',
      'Lay your torso down between your thighs',
      'Extend your arms forward on the floor',
      'Rest your forehead on the mat',
      'Breathe deeply and relax into the pose',
    ],
    benefits: [
      'Gently stretches lower back and hips',
      'Relieves stress and fatigue',
      'Calms the mind and reduces anxiety',
    ],
    breathingTip: 'Inhale deeply through your nose, expanding your back. Exhale slowly, sinking deeper into the pose.',
    adhdTip: 'This is a great reset pose! Use it when your mind feels overwhelmed. Focus only on your breathing for 10 breaths.',
  },
  {
    id: 'seated_meditation',
    name: 'Seated Meditation',
    sanskrit: 'Sukhasana',
    difficulty: 'Beginner',
    duration: '5-10 min',
    color: '#50C878',
    icon: 'happy',
    imageKey: 'seated_meditation',
    bodyParts: [
      { name: 'Spine', icon: 'body', color: '#4A90E2' },
      { name: 'Hips', icon: 'body', color: '#9B59B6' },
      { name: 'Mind', icon: 'bulb', color: '#FFB84D' },
      { name: 'Nervous System', icon: 'pulse', color: '#E74C3C' },
    ],
    steps: [
      'Sit cross-legged on a cushion or mat',
      'Lengthen your spine tall',
      'Rest your hands on your knees',
      'Close your eyes or soften your gaze',
      'Focus on your natural breathing',
      'When your mind wanders, gently return to your breath',
      'Start with 2 minutes, build up gradually',
    ],
    benefits: [
      'Improves focus and attention span',
      'Reduces stress hormones',
      'Strengthens mind-body connection',
    ],
    breathingTip: 'Try 4-7-8 breathing: Inhale for 4 counts, hold for 7, exhale for 8. This activates your calming nervous system.',
    adhdTip: 'ADHD brains love novelty — try different meditation styles each time! Body scan, counting breaths, or listening meditation.',
  },
  {
    id: 'cobra_pose',
    name: 'Cobra Pose',
    sanskrit: 'Bhujangasana',
    difficulty: 'Beginner',
    duration: '30 sec - 1 min',
    color: '#FF6B6B',
    icon: 'trending-up',
    imageKey: 'cobra_pose',
    bodyParts: [
      { name: 'Chest', icon: 'heart', color: '#E74C3C' },
      { name: 'Shoulders', icon: 'body', color: '#4A90E2' },
      { name: 'Spine', icon: 'body', color: '#9B59B6' },
      { name: 'Abs', icon: 'fitness', color: '#FFB84D' },
    ],
    steps: [
      'Lie face down on the mat',
      'Place palms flat beside your chest',
      'Keep elbows close to your body',
      'Press into your hands, lifting your chest',
      'Keep your hips and legs on the floor',
      'Open your chest and roll shoulders back',
      'Hold for 15-30 seconds, breathing steadily',
    ],
    benefits: [
      'Opens chest and strengthens spine',
      'Improves posture from sitting',
      'Energizes and reduces fatigue',
    ],
    breathingTip: 'Inhale as you lift up, creating space in your chest. Exhale to deepen the stretch gently.',
    adhdTip: 'Great energy booster! Do this pose in the morning or when you feel sluggish during the day.',
  },
  {
    id: 'warrior_pose',
    name: 'Warrior II',
    sanskrit: 'Virabhadrasana II',
    difficulty: 'Intermediate',
    duration: '30 sec each side',
    color: '#4A90E2',
    icon: 'shield',
    imageKey: 'warrior_pose',
    bodyParts: [
      { name: 'Legs', icon: 'walk', color: '#3498DB' },
      { name: 'Hips', icon: 'body', color: '#9B59B6' },
      { name: 'Core', icon: 'fitness', color: '#E74C3C' },
      { name: 'Arms & Shoulders', icon: 'hand-left', color: '#FFB84D' },
    ],
    steps: [
      'Stand tall, step feet 3-4 feet apart',
      'Turn right foot out 90 degrees',
      'Bend right knee over right ankle',
      'Extend arms out to the sides, parallel to floor',
      'Gaze over your right fingertips',
      'Keep torso centered between your legs',
      'Hold for 5-8 breaths, then switch sides',
    ],
    benefits: [
      'Builds leg and core strength',
      'Improves balance and stability',
      'Builds confidence and focus',
    ],
    breathingTip: 'Breathe powerfully through your nose. Each exhale helps you sink deeper and feel stronger.',
    adhdTip: 'Feel like a warrior! This pose builds confidence and grounding. Pick a focus point for your gaze to train concentration.',
  },
  {
    id: 'forward_bend',
    name: 'Standing Forward Bend',
    sanskrit: 'Uttanasana',
    difficulty: 'Beginner',
    duration: '30 sec - 1 min',
    color: '#1ABC9C',
    icon: 'arrow-down',
    imageKey: 'forward_bend',
    bodyParts: [
      { name: 'Hamstrings', icon: 'walk', color: '#E74C3C' },
      { name: 'Calves', icon: 'footsteps', color: '#3498DB' },
      { name: 'Lower Back', icon: 'fitness', color: '#9B59B6' },
      { name: 'Neck', icon: 'body', color: '#FFB84D' },
    ],
    steps: [
      'Stand tall with feet hip-width apart',
      'Inhale and raise your arms overhead',
      'Exhale and fold forward from your hips',
      'Let your head and arms hang heavy',
      'Bend knees slightly if hamstrings are tight',
      'Grab opposite elbows and sway gently',
      'Hold for 30 seconds, breathing deeply',
    ],
    benefits: [
      'Stretches entire back body',
      'Calms the nervous system',
      'Relieves headaches and insomnia',
    ],
    breathingTip: 'Let gravity do the work. Each exhale, release a little more tension and fold deeper.',
    adhdTip: 'Inverted poses send blood to your brain — great for when you need a quick mental reset between tasks!',
  },
  {
    id: 'tree_pose',
    name: 'Tree Pose',
    sanskrit: 'Vrksasana',
    difficulty: 'Beginner',
    duration: '30 sec each side',
    color: '#FFB84D',
    icon: 'leaf',
    imageKey: 'tree_pose',
    bodyParts: [
      { name: 'Legs', icon: 'walk', color: '#3498DB' },
      { name: 'Core', icon: 'fitness', color: '#E74C3C' },
      { name: 'Balance Center', icon: 'body', color: '#9B59B6' },
      { name: 'Ankles & Feet', icon: 'footsteps', color: '#E67E22' },
    ],
    steps: [
      'Stand on your left foot',
      'Place right foot on inner left thigh or calf (not knee!)',
      'Press foot and thigh together',
      'Bring hands to prayer at chest',
      'Find a focus point ahead of you',
      'Slowly raise arms overhead if stable',
      'Hold for 5-8 breaths, then switch sides',
    ],
    benefits: [
      'Improves balance and coordination',
      'Strengthens legs and core',
      'Increases focus and concentration',
    ],
    breathingTip: 'Steady, rhythmic breathing helps you balance. If you wobble, deepen your breath instead of tensing up.',
    adhdTip: 'Balance poses are amazing for ADHD because they FORCE your brain to focus on one thing. It is like meditation with a physical challenge!',
  },
];

export function getYogaImage(key: string): string | null {
  const images = yogaImagesData as Record<string, string | null>;
  return images[key] || null;
}

export default YOGA_POSES;
