import React, { useState } from 'react';
import { NGSSModule, Question, TestAnswer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ArrowRight, Sparkles, X } from 'lucide-react';
import { ICON_GHOST_BUTTON_CLASS } from '../lib/buttonStyles';
import { scoreTest } from '../lib/scoreTest';

interface PlacementTestProps {
  module: NGSSModule | null;
  onComplete: (score: number, identifiedGaps: string[], answers: TestAnswer[]) => void;
  onCancel: () => void;
}

export function PlacementTest({ module, onComplete, onCancel }: PlacementTestProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [freeResponseText, setFreeResponseText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  // Default questions for initial placement if no specific module is provided
  const defaultQuestions: Record<string, Record<string, Question[]>> = {
    '3': {
      'benchmark': [
        { id: '3-b1', type: 'multiple-choice', text: 'What do plants need to make their own food?', options: ['Soil and Water', 'Sunlight, Water, and Air', 'Insects', 'Darkness'], correctAnswer: 1, concept: 'Photosynthesis & Plant Needs' },
        { id: '3-b2', type: 'multiple-choice', text: 'Which of these is a producer?', options: ['Lion', 'Grass', 'Mushroom', 'Human'], correctAnswer: 1, concept: 'Food Chains' },
        { id: '3-b3', type: 'free-response', text: 'How does a parent animal help its offspring survive?', sampleAnswer: 'By providing food, shelter, and protection.', concept: 'Animal Survival Strategies' }
      ],
      'grade': [
        { id: '3-g1', type: 'multiple-choice', text: 'Which of these is a non-living thing?', options: ['Tree', 'Rock', 'Bird', 'Fish'], correctAnswer: 1, concept: 'Living vs Non-living' },
        { id: '3-g2', type: 'multiple-choice', text: 'What happens to water when it freezes?', options: ['It turns to gas', 'It turns to solid ice', 'It disappears', 'It gets hot'], correctAnswer: 1, concept: 'States of Matter' }
      ]
    },
    '4': {
      'benchmark': [
        { id: '4-b1', type: 'multiple-choice', text: 'Which energy source is renewable?', options: ['Coal', 'Oil', 'Solar', 'Natural Gas'], correctAnswer: 2, concept: 'Energy Resources' },
        { id: '4-b2', type: 'multiple-choice', text: 'What part of the eye focuses light?', options: ['Iris', 'Lens', 'Retina', 'Cornea'], correctAnswer: 1, concept: 'Light & Vision' },
        { id: '4-b3', type: 'free-response', text: 'Explain how a simple circuit works.', sampleAnswer: 'A battery provides energy that flows through wires to a load like a bulb.', concept: 'Electricity' }
      ],
      'grade': [
        { id: '4-g1', type: 'multiple-choice', text: 'Which rock is formed from cooled lava?', options: ['Sedimentary', 'Metamorphic', 'Igneous', 'Sandstone'], correctAnswer: 2, concept: 'Rock Cycle' }
      ]
    },
    '5': {
      'benchmark': [
        { id: '5-b1', type: 'multiple-choice', text: 'What is the main source of energy for the water cycle?', options: ['The Moon', 'The Sun', 'Wind', 'Gravity'], correctAnswer: 1, concept: 'Water Cycle' },
        { id: '5-b2', type: 'multiple-choice', text: 'Which layer of Earth is the thinnest?', options: ['Crust', 'Mantle', 'Outer Core', 'Inner Core'], correctAnswer: 0, concept: 'Earth Layers' },
        { id: '5-b3', type: 'free-response', text: 'Describe the difference between a physical and chemical change.', sampleAnswer: 'Physical changes do not create new substances; chemical changes do.', concept: 'Changes in Matter' }
      ]
    },
    '6': {
      'benchmark': [
        { id: '6-b1', type: 'multiple-choice', text: 'What is the smallest unit of life?', options: ['Atom', 'Cell', 'Molecule', 'Organ'], correctAnswer: 1, concept: 'Cell Theory' },
        { id: '6-b2', type: 'multiple-choice', text: 'Which force pulls objects toward Earth?', options: ['Magnetism', 'Friction', 'Gravity', 'Inertia'], correctAnswer: 2, concept: 'Gravitational Forces' },
        { id: '6-b3', type: 'free-response', text: 'Describe what happens to water molecules when they freeze into ice.', sampleAnswer: 'They slow down and form a rigid structure.', concept: 'States of Matter & Molecular Motion' }
      ]
    },
    '7': {
      'benchmark': [
        { id: '7-b1', type: 'multiple-choice', text: 'Which organelle is the "powerhouse" of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Vacuole'], correctAnswer: 2, concept: 'Cell Organelles' },
        { id: '7-b2', type: 'multiple-choice', text: 'What is the primary function of DNA?', options: ['Store energy', 'Store genetic information', 'Build cell walls', 'Transport oxygen'], correctAnswer: 1, concept: 'Genetics' },
        { id: '7-b3', type: 'free-response', text: 'Explain the process of natural selection.', sampleAnswer: 'Organisms with favorable traits are more likely to survive and reproduce.', concept: 'Evolution' }
      ]
    },
    '8': {
      'benchmark': [
        { id: '8-b1', type: 'multiple-choice', text: 'Which state of matter has a definite shape and volume?', options: ['Gas', 'Liquid', 'Solid', 'Plasma'], correctAnswer: 2, concept: 'Properties of Matter' },
        { id: '8-b2', type: 'multiple-choice', text: 'What happens to the wavelength of a sound if its frequency increases?', options: ['Increases', 'Decreases', 'Stays the same', 'Disappears'], correctAnswer: 1, concept: 'Wave Properties' },
        { id: '8-b3', type: 'free-response', text: 'Why does a metal spoon feel colder than a wooden spoon at the same temperature?', sampleAnswer: 'Metal is a better conductor of heat.', concept: 'Thermal Conductivity' }
      ]
    }
  };

  const grade = (window as any).userGrade || '6';
  const testTarget = (window as any).currentTestTarget;
  const testType = testTarget?.type || 'benchmark';
  
  // Logic to select questions based on test type
  let questions: Question[] = [];
  
  if (module) {
    questions = module.placementTest || defaultQuestions[grade]?.benchmark || defaultQuestions['6'].benchmark;
  } else if (testTarget) {
    if (testTarget.unitTest) {
      questions = testTarget.unitTest;
    } else if (testType === 'grade') {
      questions = defaultQuestions[grade]?.grade || defaultQuestions[grade]?.benchmark || defaultQuestions['6'].benchmark;
    } else {
      questions = defaultQuestions[grade]?.benchmark || defaultQuestions['6'].benchmark;
    }
  } else {
    questions = defaultQuestions[grade]?.benchmark || defaultQuestions['6'].benchmark;
  }

  const handleNext = (answer?: any) => {
    const finalAnswer = answer !== undefined ? answer : freeResponseText;
    const newAnswers = [...answers, finalAnswer];
    setAnswers(newAnswers);
    setFreeResponseText('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const calculateResults = () => {
    const { scorePercent, gaps, answers: testAnswers } = scoreTest(questions, answers);
    onComplete(scorePercent, gaps, testAnswers);
  };

  if (isFinished) {
    const score = Math.round(scoreTest(questions, answers).scorePercent);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-[40px] border-4 border-sage-green text-center max-w-2xl mx-auto shadow-2xl"
      >
        <div className="w-20 h-20 bg-sage-green/10 rounded-full flex items-center justify-center mx-auto mb-8 text-sage-green">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Test Complete!</h2>
        <div className="text-6xl font-black text-slate-900 mb-6">{score}%</div>
        <p className="text-slate-600 font-medium mb-10 leading-relaxed">
          Valerie has analyzed your responses. You've identified some key conceptual gaps to work on.
        </p>
        <button 
          onClick={calculateResults}
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-slate-800 transition-colors"
        >
          View My Stats & Path <ArrowRight size={20} />
        </button>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">
            {module ? 'Module Placement' : 'Assessment'}
          </h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
            {module ? module.title : 'Benchmark Test'}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">Question</p>
            <p className="text-xl font-black text-slate-900">{currentQuestionIndex + 1} / {questions.length}</p>
          </div>
          <button 
            onClick={onCancel}
            className={ICON_GHOST_BUTTON_CLASS}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100">
        <h3 className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">
          {currentQuestion.text}
        </h3>
        
        {currentQuestion.type === 'multiple-choice' ? (
          <div className="space-y-4">
            {currentQuestion.options?.map((option, i) => (
              <button
                key={i}
                onClick={() => handleNext(i)}
                className="w-full p-6 text-left rounded-2xl border-2 border-slate-100 hover:border-soft-pink hover:bg-soft-pink/5 transition-all font-bold text-slate-700 flex items-center justify-between group"
              >
                {option}
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-soft-pink transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <textarea 
              value={freeResponseText}
              onChange={(e) => setFreeResponseText(e.target.value)}
              placeholder="Type your scientific explanation here..."
              className="w-full h-40 p-6 bg-slate-50 border-2 border-transparent focus:border-soft-pink rounded-2xl font-bold text-slate-900 outline-none transition-all resize-none"
            />
            <button
              onClick={() => handleNext()}
              disabled={!freeResponseText.trim()}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              Submit Answer
            </button>
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center gap-3 justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">
        <Sparkles size={16} />
        Valerie is analyzing your mental model
      </div>
    </div>
  );
}
