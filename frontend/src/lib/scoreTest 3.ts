import { Question, TestAnswer } from '../types';

/** Free-response answers must be longer than this to count as correct. */
export const FREE_RESPONSE_MIN_LENGTH = 15;

export function isAnswerCorrect(question: Question, answer: unknown): boolean {
  if (question.type === 'multiple-choice') {
    return answer === question.correctAnswer;
  }
  return typeof answer === 'string' && answer.length > FREE_RESPONSE_MIN_LENGTH;
}

export function selectedAnswerLabel(question: Question, answer: unknown): string | undefined {
  if (question.type === 'multiple-choice') {
    return typeof answer === 'number' ? question.options?.[answer] : undefined;
  }
  return typeof answer === 'string' ? answer : undefined;
}

export interface ScoredTest {
  scorePercent: number;
  gaps: string[];
  answers: TestAnswer[];
}

/**
 * Score a placement / unit / grade test and collect conceptual gaps.
 */
export function scoreTest(questions: Question[], answers: unknown[]): ScoredTest {
  if (questions.length === 0) {
    return { scorePercent: 0, gaps: [], answers: [] };
  }

  let correctCount = 0;
  const gaps: string[] = [];
  const testAnswers: TestAnswer[] = [];

  questions.forEach((q, index) => {
    const answer = answers[index];
    const correct = isAnswerCorrect(q, answer);
    if (correct) correctCount++;
    else gaps.push(q.concept || `Concept related to: ${q.text}`);

    testAnswers.push({
      questionId: q.id,
      questionText: q.text,
      selectedAnswer: selectedAnswerLabel(q, answer),
      correct,
      concept: q.concept,
    });
  });

  return {
    scorePercent: (correctCount / questions.length) * 100,
    gaps,
    answers: testAnswers,
  };
}
