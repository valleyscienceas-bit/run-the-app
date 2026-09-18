import { Award } from 'lucide-react';
import { EarnedAchievement } from '../types';
import { formatPointsDisplay, reconcileTotalPoints } from '../lib/points';

interface AchievementPointsDisplayProps {
  totalPoints?: number;
  earnedAchievements?: EarnedAchievement[];
  /** compact = inline badge; full = stat-style block */
  variant?: 'compact' | 'full';
  className?: string;
}

/** Subtle achievement-style points display — hidden when zero */
export function AchievementPointsDisplay({
  totalPoints,
  earnedAchievements,
  variant = 'compact',
  className = '',
}: AchievementPointsDisplayProps) {
  const total = reconcileTotalPoints(totalPoints, earnedAchievements);
  if (total <= 0) return null;

  const label = formatPointsDisplay(total);
  const count = earnedAchievements?.length ?? 0;

  if (variant === 'full') {
    return (
      <div className={`flex items-start gap-3 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Award size={20} className="text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] font-black text-amber-700/70 dark:text-amber-400/80 uppercase tracking-[0.2em] mb-0.5">
            Achievement Points
          </p>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-100">{total}</p>
          <p className="text-xs font-bold text-amber-800/70 dark:text-amber-300/70 mt-1">
            {count} rare achievement{count !== 1 ? 's' : ''} earned
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 ${className}`}
      title={`${count} achievement${count !== 1 ? 's' : ''} earned`}
    >
      <Award size={14} className="text-amber-700 dark:text-amber-400" />
      <span className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function sumClassPoints(
  students: { studentProfile?: { totalPoints?: number; earnedAchievements?: EarnedAchievement[] } | null }[]
): number {
  return students.reduce((sum, s) => {
    if (!s.studentProfile) return sum;
    return sum + reconcileTotalPoints(s.studentProfile.totalPoints, s.studentProfile.earnedAchievements);
  }, 0);
}
