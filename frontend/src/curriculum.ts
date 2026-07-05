import { NGSSModule, Unit, Question, Lesson } from './types';

function lesson(id: string, title: string, order: number, topics: { id: string; title: string; description?: string }[]): Lesson {
  return {
    id,
    title,
    order,
    topics: topics.map((t, i) => ({ ...t, order: i + 1 })),
  };
}

export const FULL_CURRICULUM: NGSSModule[] = [
  // Grade 8 - Unit 1: Physical Science
  {
    id: '8-1-1',
    gradeLevel: '8',
    unitId: '8-U1',
    order: 1,
    code: 'MS-PS2-1',
    title: 'Newton\'s Third Law',
    gap: 'Action-reaction pairs in collisions.',
    achievementId: '8-1-1-master',
    pointsAwarded: 25,
    minScoreForPoints: 70,
    achievementLabel: 'Mastered Newton\'s Third Law',
    description: 'Apply Newton\'s Third Law to design a solution to a problem involving the motion of two colliding objects.',
    lessons: [
      lesson('8-1-1-L1', 'Forces Everywhere', 1, [
        { id: '8-1-1-L1-T1', title: 'What is a force?', description: 'Identify pushes and pulls as interactions between objects.' },
        { id: '8-1-1-L1-T2', title: 'Action and reaction basics', description: 'Every force has a partner force in the opposite direction.' },
      ]),
      lesson('8-1-1-L2', 'Newton\'s Third Law', 2, [
        { id: '8-1-1-L2-T1', title: 'Equal and opposite', description: 'Forces always occur in equal-magnitude, opposite-direction pairs.' },
        { id: '8-1-1-L2-T2', title: 'Identifying force pairs', description: 'Distinguish action-reaction pairs from other forces on a diagram.' },
      ]),
      lesson('8-1-1-L3', 'Collisions & Design', 3, [
        { id: '8-1-1-L3-T1', title: 'Collisions in real life', description: 'Apply third-law reasoning to bugs, skateboards, and crashes.' },
        { id: '8-1-1-L3-T2', title: 'Design a collision solution', description: 'Use force pairs to explain how to reduce damage in a collision.' },
      ]),
    ],
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'If a bug hits a windshield, which force is greater?', options: ['The bug on the windshield', 'The windshield on the bug', 'They are equal'], correctAnswer: 2, concept: 'Action-reaction pairs in collisions.' },
      { id: 'q2', type: 'free-response', text: 'Explain why a skateboard moves backward when you jump forward off of it.', sampleAnswer: 'Newton\'s Third Law: For every action, there is an equal and opposite reaction.', concept: 'Action-reaction pairs in collisions.' }
    ]
  },
  {
    id: '8-1-2',
    gradeLevel: '8',
    unitId: '8-U1',
    order: 2,
    code: 'MS-PS2-2',
    title: 'Forces and Motion',
    gap: 'Balanced vs Net force impact on acceleration.',
    achievementId: '8-1-2-master',
    pointsAwarded: 25,
    minScoreForPoints: 70,
    achievementLabel: 'Mastered Forces and Motion',
    description: 'Plan an investigation to provide evidence that the change in an object\'s motion depends on the sum of the forces.',
    lessons: [
      lesson('8-1-2-L1', 'Balanced Forces', 1, [
        { id: '8-1-2-L1-T1', title: 'Net force', description: 'Combine forces to find whether motion will change.' },
        { id: '8-1-2-L1-T2', title: 'Constant velocity', description: 'Explain why balanced forces mean no change in motion.' },
      ]),
      lesson('8-1-2-L2', 'Unbalanced Forces', 2, [
        { id: '8-1-2-L2-T1', title: 'Acceleration', description: 'Connect unbalanced net force to changes in speed or direction.' },
        { id: '8-1-2-L2-T2', title: 'F = ma intuition', description: 'Predict how mass affects acceleration for a fixed force.' },
      ]),
      lesson('8-1-2-L3', 'Planning Investigations', 3, [
        { id: '8-1-2-L3-T1', title: 'Variables & evidence', description: 'Choose what to measure when testing force and motion.' },
        { id: '8-1-2-L3-T2', title: 'Drawing conclusions', description: 'Use investigation data to support claims about net force.' },
      ]),
    ],
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'If an object is moving at a constant speed, are the forces balanced?', options: ['Yes', 'No', 'Only if it is stopped'], correctAnswer: 0, concept: 'Balanced vs Net force impact on acceleration.' }
    ]
  },
  // Grade 5 - Unit 1: Matter
  {
    id: '5-1-1',
    gradeLevel: '5',
    unitId: '5-U1',
    order: 1,
    code: '5-PS1-1',
    title: 'Particle Nature of Matter',
    gap: 'Visualizing air as matter with mass.',
    achievementId: '5-1-1-master',
    pointsAwarded: 25,
    minScoreForPoints: 70,
    achievementLabel: 'Mastered Particle Nature of Matter',
    description: 'Develop a model to describe that matter is made of particles too small to be seen.',
    lessons: [
      lesson('5-1-1-L1', 'What Is Matter?', 1, [
        { id: '5-1-1-L1-T1', title: 'Matter has mass and volume', description: 'Use evidence that air takes up space and has mass.' },
        { id: '5-1-1-L1-T2', title: 'Invisible does not mean absent', description: 'Argue that invisible substances can still be matter.' },
      ]),
      lesson('5-1-1-L2', 'The Particle Model', 2, [
        { id: '5-1-1-L2-T1', title: 'Particles in solids, liquids, and gases', description: 'Compare spacing and motion of particles in each state.' },
        { id: '5-1-1-L2-T2', title: 'Squeezing a balloon', description: 'Explain compression using particle spacing.' },
      ]),
      lesson('5-1-1-L3', 'Building Models', 3, [
        { id: '5-1-1-L3-T1', title: 'Evidence for particles', description: 'Connect observations to the particle model of matter.' },
        { id: '5-1-1-L3-T2', title: 'Scale and limits of models', description: 'Describe why models help even when particles are too small to see.' },
      ]),
    ],
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'How do we know air is matter?', options: ['It is invisible', 'It has mass and takes up space', 'It is cold'], correctAnswer: 1, concept: 'Visualizing air as matter with mass.' },
      { id: 'q2', type: 'free-response', text: 'Describe what happens to the particles in a balloon when you squeeze it.', sampleAnswer: 'The particles are pushed closer together, increasing pressure.', concept: 'Visualizing air as matter with mass.' }
    ]
  }
];

function modulesForUnit(unitId: string): NGSSModule[] {
  return FULL_CURRICULUM
    .filter(m => m.unitId === unitId)
    .sort((a, b) => a.order - b.order);
}

export const UNITS: Unit[] = [
  {
    id: '8-U1',
    gradeLevel: '8',
    order: 1,
    title: 'Forces and Interactions',
    description: 'Master the laws of motion and the invisible forces that shape our world.',
    achievementId: '8-U1-master',
    pointsAwarded: 50,
    minScoreForPoints: 70,
    achievementLabel: 'Unit mastery: Forces and Interactions',
    modules: modulesForUnit('8-U1'),
    unitTest: [
      { id: 'u1-1', type: 'multiple-choice', text: 'What is inertia?', options: ['A force', 'Resistance to change in motion', 'Speed'], correctAnswer: 1 },
      { id: 'u1-2', type: 'free-response', text: 'How does mass affect acceleration when force is constant?', sampleAnswer: 'Greater mass leads to lower acceleration (F=ma).' }
    ]
  },
  {
    id: '5-U1',
    gradeLevel: '5',
    order: 1,
    title: 'Structure and Properties of Matter',
    description: 'Explore the building blocks of the universe.',
    achievementId: '5-U1-master',
    pointsAwarded: 50,
    minScoreForPoints: 70,
    achievementLabel: 'Unit mastery: Structure and Properties of Matter',
    modules: modulesForUnit('5-U1'),
    unitTest: [
      { id: 'u5-1', type: 'multiple-choice', text: 'Which state of matter has particles that slide past each other?', options: ['Solid', 'Liquid', 'Gas'], correctAnswer: 1 }
    ]
  }
];
