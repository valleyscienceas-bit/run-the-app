export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'founder';
export type AccessPath = 'district' | 'individual';

export type AppTab =
  | 'curriculum'
  | 'dashboard'
  | 'chat'
  | 'founder'
  | 'settings'
  | 'student-account'
  | 'billing'
  | 'demo-guide'
  | 'assignments'
  | 'class-tests'
  | 'my-class'
  | 'my-assignments'
  | 'sandbox';

export type ThemeMode = 'light' | 'dark';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  parentEmail?: string; // For students
  linkedStudentUid?: string; // For parents (legacy single)
  linkedStudentUids?: string[]; // For parents (multi-student)
  activeStudentUid?: string; // Which child parent is viewing
  parentUid?: string; // For students — primary managing parent
  role: UserRole;
  path: AccessPath;
  grade?: GradeLevel;
  xp: number;
  isFirstTime: boolean;
  isPaid: boolean;
  createdAt: string;
  totalLearningSeconds?: number;
  theme?: ThemeMode;
  isDemo?: boolean;
  demoExpiresAt?: string;
  demoParentUid?: string;
  demoStudentUid?: string;
  hasCompletedParentTour?: boolean;
  hasCompletedStudentTour?: boolean;
  hasCompletedTeacherTour?: boolean;
  hasLoggedInBefore?: boolean;
  offerTourAfterPlacement?: boolean;
  hasSeenDemoStudentGuide?: boolean;
  hasSeenDemoParentGuide?: boolean;
  districtId?: string;
  classroomIds?: string[];
  teacherUid?: string;
  demoPassword?: string; // Sandbox/demo accounts — visible to teachers
  progressByGrade?: Record<string, GradeProgressArchive>;
  gradeOverrides?: { grade: string; at: string; by: string }[];
  mfaEnabled?: boolean;
  mfaMethod?: 'email' | 'totp' | null;
  /** Resume learning — last module the student opened */
  lastModuleId?: string;
  lastModuleTitle?: string;
  lastLessonId?: string;
  lastTopicId?: string;
  lastChatTopic?: string;
  /** Sequential lesson/topic progress across modules */
  learningProgress?: StudentLearningProgress;
  activeAssignmentId?: string;
  /** Last time a positive weekly progress email was sent to this parent */
  lastParentDigestAt?: string;
  /** Last time a weekly class snapshot email was sent to this teacher */
  lastTeacherDigestAt?: string;
  /** Assignment IDs for which a due-date reminder email was already sent (student-only) */
  dueReminderSentFor?: Record<string, string>;
  /** Last time an inactivity re-engagement email was sent to this student */
  lastInactivityNudgeAt?: string;
  /** Rare achievement points — server-awarded only */
  totalPoints?: number;
  /** Achievements already earned (idempotent awards) */
  earnedAchievements?: EarnedAchievement[];
}

/** A single server-verified achievement award */
export interface EarnedAchievement {
  id: string;
  label: string;
  points: number;
  earnedAt: string;
  /** module | unit | grade — where the award came from */
  source?: AchievementSource;
  sourceId?: string;
}

export type AchievementSource = 'module' | 'unit' | 'grade';

/** Data-driven achievement config — attach to modules/units when points are enabled */
export interface AchievementConfig {
  achievementId?: string;
  pointsAwarded?: number;
  /** Minimum test score (0–100) required to earn points. Default applied in points.ts */
  minScoreForPoints?: number;
  achievementLabel?: string;
}

export interface GradeProgressArchive {
  results: TestResult[];
  stats: LearningStats;
  archivedAt: string;
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed';

export interface AssignmentSubmission {
  status: AssignmentStatus;
  progress: number;
  submittedAt?: string;
  score?: number;
  completedModuleIds?: string[];
}

export interface ClassroomAssignment {
  id: string;
  classroomId: string;
  teacherUid: string;
  title: string;
  dueAt: string;
  grade: string;
  minScore?: number | null;
  moduleIds: string[];
  moduleCount?: number;
  submissions?: Record<string, AssignmentSubmission>;
  createdAt: string;
}

export interface AssignmentStudentRow {
  uid: string;
  name: string;
  username?: string;
  grade?: string;
  status: AssignmentStatus;
  progress: number;
  submittedAt?: string;
  score?: number;
  isLate?: boolean;
}

export interface UserState {
  role: UserRole;
  path: AccessPath;
  grade?: GradeLevel;
  district?: string;
  isLoggedIn: boolean;
  profile?: UserProfile;
}

export type GradeLevel = '3' | '4' | '5' | '6' | '7' | '8';

export interface Topic {
  id: string;
  title: string;
  order: number;
  description?: string;
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  topics: Topic[];
}

export interface ModuleLearningProgress {
  completedLessonIds: string[];
  completedTopicIds: string[];
  currentLessonId?: string;
  currentTopicId?: string;
}

export interface StudentLearningProgress {
  byModule: Record<string, ModuleLearningProgress>;
  completedModuleIds: string[];
}

export interface NGSSModule extends AchievementConfig {
  id: string;
  gradeLevel: GradeLevel;
  unitId: string;
  /** Order within the parent unit (1-based) */
  order: number;
  code: string;
  title: string;
  gap: string;
  description: string;
  placementTest?: Question[];
  lessons: Lesson[];
}

export type QuestionType = 'multiple-choice' | 'free-response';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // Only for multiple-choice
  correctAnswer?: number; // Only for multiple-choice
  sampleAnswer?: string; // For free-response guidance
  concept?: string; // The underlying scientific concept
}

export interface Unit extends AchievementConfig {
  id: string;
  gradeLevel: GradeLevel;
  /** Order within the grade (1-based) */
  order: number;
  title: string;
  description: string;
  modules: NGSSModule[];
  unitTest: Question[];
  /** Optional grade-level test achievement (separate from unit test) */
  gradeTestAchievement?: AchievementConfig;
}

export interface UserProgress {
  userId: string;
  moduleId: string;
  status: 'active' | 'completed';
  score: number;
  gapsIdentified: string[];
  gapsClosed: string[];
  lastInteraction: string;
}

export interface TestResult {
  id: string;
  userId: string;
  type: 'placement' | 'unit' | 'grade';
  targetId?: string; // unitId or gradeLevel
  /** Module id when type is placement (for gap closure + points) */
  moduleId?: string;
  score: number;
  gaps: string[];
  timestamp: string;
  answers?: TestAnswer[];
}

export interface TestAnswer {
  questionId: string;
  questionText: string;
  selectedAnswer?: string;
  correct: boolean;
  concept?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

export interface LearningStats {
  totalSeconds?: number;
  lastUpdated?: string;
}

export interface LinkedParentSummary {
  uid: string;
  name: string;
  email: string;
}

export interface StudentOverview {
  studentProfile: UserProfile | null;
  results: TestResult[];
  stats: LearningStats;
  linkedStudents?: Pick<UserProfile, 'uid' | 'name' | 'grade' | 'username' | 'isPaid'>[];
  activeStudentUid?: string;
  linkedParent?: LinkedParentSummary | null;
}

export interface DemoProfileRefs {
  demoStudentUid?: string;
  demoParentUid?: string;
}

export type ClassQuestionStatus = 'open' | 'answered';

export interface ClassQuestionMessage {
  role: 'student' | 'teacher';
  text: string;
  timestamp: string;
}

export interface ClassQuestionThread {
  id: string;
  classroomId: string;
  studentUid: string;
  teacherUid: string;
  studentName: string;
  status: ClassQuestionStatus;
  teacherUnreadCount: number;
  studentUnreadCount: number;
  messages: ClassQuestionMessage[];
  createdAt: string;
  updatedAt: string;
}
