import { NGSSModule, Unit, Question } from './types';

export const FULL_CURRICULUM: NGSSModule[] = [
  // Grade 8 - Unit 1: Physical Science
  {
    id: '8-1-1',
    gradeLevel: '8',
    unitId: '8-U1',
    code: 'MS-PS2-1',
    title: 'Newton\'s Third Law',
    gap: 'Action-reaction pairs in collisions.',
    description: 'Apply Newton\'s Third Law to design a solution to a problem involving the motion of two colliding objects.',
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'If a bug hits a windshield, which force is greater?', options: ['The bug on the windshield', 'The windshield on the bug', 'They are equal'], correctAnswer: 2 },
      { id: 'q2', type: 'free-response', text: 'Explain why a skateboard moves backward when you jump forward off of it.', sampleAnswer: 'Newton\'s Third Law: For every action, there is an equal and opposite reaction.' }
    ]
  },
  {
    id: '8-1-2',
    gradeLevel: '8',
    unitId: '8-U1',
    code: 'MS-PS2-2',
    title: 'Forces and Motion',
    gap: 'Balanced vs Net force impact on acceleration.',
    description: 'Plan an investigation to provide evidence that the change in an object\'s motion depends on the sum of the forces.',
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'If an object is moving at a constant speed, are the forces balanced?', options: ['Yes', 'No', 'Only if it is stopped'], correctAnswer: 0 }
    ]
  },
  // Grade 5 - Unit 1: Matter
  {
    id: '5-1-1',
    gradeLevel: '5',
    unitId: '5-U1',
    code: '5-PS1-1',
    title: 'Particle Nature of Matter',
    gap: 'Visualizing air as matter with mass.',
    description: 'Develop a model to describe that matter is made of particles too small to be seen.',
    placementTest: [
      { id: 'q1', type: 'multiple-choice', text: 'How do we know air is matter?', options: ['It is invisible', 'It has mass and takes up space', 'It is cold'], correctAnswer: 1 },
      { id: 'q2', type: 'free-response', text: 'Describe what happens to the particles in a balloon when you squeeze it.', sampleAnswer: 'The particles are pushed closer together, increasing pressure.' }
    ]
  }
];

export const UNITS: Unit[] = [
  {
    id: '8-U1',
    gradeLevel: '8',
    title: 'Forces and Interactions',
    description: 'Master the laws of motion and the invisible forces that shape our world.',
    modules: FULL_CURRICULUM.filter(m => m.unitId === '8-U1'),
    unitTest: [
      { id: 'u1-1', type: 'multiple-choice', text: 'What is inertia?', options: ['A force', 'Resistance to change in motion', 'Speed'], correctAnswer: 1 },
      { id: 'u1-2', type: 'free-response', text: 'How does mass affect acceleration when force is constant?', sampleAnswer: 'Greater mass leads to lower acceleration (F=ma).' }
    ]
  },
  {
    id: '5-U1',
    gradeLevel: '5',
    title: 'Structure and Properties of Matter',
    description: 'Explore the building blocks of the universe.',
    modules: FULL_CURRICULUM.filter(m => m.unitId === '5-U1'),
    unitTest: [
      { id: 'u5-1', type: 'multiple-choice', text: 'Which state of matter has particles that slide past each other?', options: ['Solid', 'Liquid', 'Gas'], correctAnswer: 1 }
    ]
  }
];
