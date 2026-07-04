import { describe, expect, it } from 'vitest';
import { FREE_RESPONSE_MIN_LENGTH, isAnswerCorrect, scoreTest } from './scoreTest';
import { Question } from '../types';

const mcq: Question = {
  id: 'q1',
  type: 'multiple-choice',
  text: 'What is inertia?',
  options: ['A force', 'Resistance to change in motion', 'Speed'],
  correctAnswer: 1,
  concept: 'Inertia',
};

const frq: Question = {
  id: 'q2',
  type: 'free-response',
  text: 'Explain Newton\'s Third Law.',
  sampleAnswer: 'Equal and opposite forces.',
  concept: 'Action-reaction pairs',
};

describe('isAnswerCorrect', () => {
  it('marks matching MCQ index as correct', () => {
    expect(isAnswerCorrect(mcq, 1)).toBe(true);
    expect(isAnswerCorrect(mcq, 0)).toBe(false);
  });

  it('requires free-response length above the minimum', () => {
    expect(isAnswerCorrect(frq, 'short')).toBe(false);
    expect(isAnswerCorrect(frq, 'x'.repeat(FREE_RESPONSE_MIN_LENGTH))).toBe(false);
    expect(isAnswerCorrect(frq, 'x'.repeat(FREE_RESPONSE_MIN_LENGTH + 1))).toBe(true);
  });
});

describe('scoreTest', () => {
  it('returns 100% and no gaps when all answers are correct', () => {
    const result = scoreTest(
      [mcq, frq],
      [1, 'This is a long enough free response answer.']
    );
    expect(result.scorePercent).toBe(100);
    expect(result.gaps).toEqual([]);
    expect(result.answers.every(a => a.correct)).toBe(true);
  });

  it('adds concept gaps for wrong MCQ answers', () => {
    const result = scoreTest([mcq], [0]);
    expect(result.scorePercent).toBe(0);
    expect(result.gaps).toEqual(['Inertia']);
    expect(result.answers[0]).toMatchObject({
      questionId: 'q1',
      selectedAnswer: 'A force',
      correct: false,
      concept: 'Inertia',
    });
  });

  it('adds concept gaps for short free responses', () => {
    const result = scoreTest([frq], ['too short']);
    expect(result.scorePercent).toBe(0);
    expect(result.gaps).toEqual(['Action-reaction pairs']);
  });

  it('uses question text when concept is missing', () => {
    const bare: Question = {
      id: 'q3',
      type: 'multiple-choice',
      text: 'What is mass?',
      options: ['A', 'B'],
      correctAnswer: 0,
    };
    const result = scoreTest([bare], [1]);
    expect(result.gaps[0]).toContain('What is mass?');
  });

  it('scores mixed answers as a percentage', () => {
    const result = scoreTest(
      [mcq, frq],
      [1, 'no']
    );
    expect(result.scorePercent).toBe(50);
    expect(result.gaps).toEqual(['Action-reaction pairs']);
  });

  it('handles empty question lists', () => {
    expect(scoreTest([], [])).toEqual({ scorePercent: 0, gaps: [], answers: [] });
  });
});
