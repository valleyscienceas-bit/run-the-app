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
  },
  // Grade 3 — Utah SEEd sandbox labs (progress + Valerie ready)
  {
    id: '3-3001',
    gradeLevel: '3',
    unitId: '3-U3',
    order: 1,
    code: '3.3.1',
    title: 'Balanced Forces & Equilibrium',
    gap: 'Equal opposite forces mean zero net force (ΣF = 0).',
    achievementId: '3-3001-master',
    pointsAwarded: 25,
    minScoreForPoints: 70,
    achievementLabel: 'Mastered Balanced Forces',
    description: 'Calibrate opposing thrusters to reach equilibrium and verify that balanced forces keep motion steady.',
    sandboxHtml: '/sandbox/module3001fulltesting.html',
    ahHaGoal: 'Equal opposite forces cancel — the cart does not accelerate when net force is zero.',
    lessons: [
      lesson('3-3001-L1', 'Forces as Vectors', 1, [
        { id: '3-3001-L1-T1', title: 'Pushes and pulls have direction', description: 'Describe force as a push or pull with magnitude and direction.' },
        { id: '3-3001-L1-T2', title: 'Opposing thrusters', description: 'Compare left and right force magnitudes on the lab cart.' },
      ]),
      lesson('3-3001-L2', 'Net Force & Equilibrium', 2, [
        { id: '3-3001-L2-T1', title: 'What is net force?', description: 'Combine opposite forces to find ΣF.' },
        { id: '3-3001-L2-T2', title: 'Reach ΣF = 0', description: 'Tune thrusters until the cart is in equilibrium.' },
      ]),
      lesson('3-3001-L3', 'Inertia Check', 3, [
        { id: '3-3001-L3-T1', title: 'Steady motion', description: 'Explain why balanced forces can mean still or constant velocity.' },
        { id: '3-3001-L3-T2', title: 'Open the Space Lab', description: 'Run the Module 3001 interactive lab and explain your ah-ha to Valerie.' },
      ]),
    ],
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'Two thrusters push 30 N left and 30 N right. Net force is…', options: ['60 N', '0 N', '30 N'], correctAnswer: 1, concept: 'Equal opposite forces mean zero net force (ΣF = 0).' },
    ],
  },
  {
    id: '3-3002',
    gradeLevel: '3',
    unitId: '3-U1',
    order: 1,
    code: '3.1.1',
    title: 'Atmospheric Thermodynamics & Weather Patterns',
    gap: 'Weather is short-term; instruments measure air conditions.',
    achievementId: '3-3002-master',
    pointsAwarded: 25,
    minScoreForPoints: 70,
    achievementLabel: 'Mastered Weather Patterns',
    description: 'Explore how temperature and pressure relate to weather patterns using lab instrumentation.',
    sandboxHtml: '/sandbox/module3002fulltesting.html',
    ahHaGoal: 'Temperature and pressure measurements help describe weather patterns, not climate alone.',
    lessons: [
      lesson('3-3002-L1', 'Weather vs Climate', 1, [
        { id: '3-3002-L1-T1', title: 'What is weather?', description: 'Describe today’s air conditions.' },
        { id: '3-3002-L1-T2', title: 'What is climate?', description: 'Contrast weather with long-term patterns.' },
      ]),
      lesson('3-3002-L2', 'Lab Measurements', 2, [
        { id: '3-3002-L2-T1', title: 'Temperature & pressure', description: 'Use lab controls to change ambient conditions.' },
        { id: '3-3002-L2-T2', title: 'Read the telemetry', description: 'Connect instrument readings to a weather story.' },
      ]),
    ],
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'Climate is best described as…', options: ['Today’s rain', 'Usual weather over many years', 'One windy afternoon'], correctAnswer: 1, concept: 'Weather is short-term; climate is a long-term pattern.' },
    ],
  },
  {
    id: '3-3007',
    gradeLevel: '3',
    unitId: '3-U1',
    order: 2,
    code: '3.1.3',
    title: 'Severe Meteorological Hazards & Vortex Dynamics',
    gap: 'Severe weather forms from strong updrafts and wind patterns.',
    achievementId: '3-3007-master',
    pointsAwarded: 25,
    minScoreForPoints: 70,
    achievementLabel: 'Mastered Severe Weather Basics',
    description: 'Investigate how updrafts and shear contribute to severe weather hazards.',
    sandboxHtml: '/sandbox/module3007fulltesting.html',
    ahHaGoal: 'Strong rising air and wind shear can organize dangerous storms.',
    lessons: [
      lesson('3-3007-L1', 'Storm Ingredients', 1, [
        { id: '3-3007-L1-T1', title: 'Updraft power', description: 'Describe rising air in a storm.' },
        { id: '3-3007-L1-T2', title: 'Wind shear', description: 'Explain how changing winds with height matter.' },
      ]),
      lesson('3-3007-L2', 'Hazard Lab', 2, [
        { id: '3-3007-L2-T1', title: 'Tune the vortex lab', description: 'Explore Module 3007 controls safely.' },
        { id: '3-3007-L2-T2', title: 'Safety takeaway', description: 'State one way families stay safe in severe weather.' },
      ]),
    ],
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'An updraft is…', options: ['Air sinking fast', 'Air rising in a storm', 'Ocean current'], correctAnswer: 1, concept: 'Severe weather forms from strong updrafts and wind patterns.' },
    ],
  },
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
  },
  {
    id: '3-U1',
    gradeLevel: '3',
    order: 1,
    title: 'Weather and Climate',
    description: 'Measure weather, spot patterns, and explore severe storms (Utah SEEd Strand 1).',
    achievementId: '3-U1-master',
    pointsAwarded: 50,
    minScoreForPoints: 70,
    achievementLabel: 'Unit mastery: Weather and Climate',
    modules: modulesForUnit('3-U1'),
    unitTest: [
      { id: 'u3-1', type: 'multiple-choice', text: 'Weather is…', options: ['Long-term average only', 'Short-term air conditions', 'Only temperature'], correctAnswer: 1 },
    ],
  },
  {
    id: '3-U3',
    gradeLevel: '3',
    order: 2,
    title: 'Force Affects Motion',
    description: 'Balanced and unbalanced forces, equilibrium, and inertia (Utah SEEd Strand 3).',
    achievementId: '3-U3-master',
    pointsAwarded: 50,
    minScoreForPoints: 70,
    achievementLabel: 'Unit mastery: Force Affects Motion',
    modules: modulesForUnit('3-U3'),
    unitTest: [
      { id: 'u3-3', type: 'multiple-choice', text: 'Equal opposite forces mean…', options: ['Huge acceleration', 'Zero net force', 'No inertia'], correctAnswer: 1 },
    ],
  },
];
