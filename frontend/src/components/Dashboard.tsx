import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Clock, Brain, Flame, Star, Target, BookOpen, Layers, X, ChevronDown, ChevronUp } from 'lucide-react';
import { NGSSModule, TestResult, UserState } from '../types';
import { chartTooltipStyle, chartAxisColors, chartGridColor, chartBarFill, useIsDarkMode } from '../lib/chartTheme';
import { ContinueLearningCard } from './ContinueLearningCard';
import { getModuleById, recommendNextModule } from '../lib/learningContext';
import {
  computeActivityStreak,
  computeAverageScore,
  computeBestScore,
  computeGapClosureRate,
  formatLearningTime,
  isScoreTrendUp,
  mostTestedType,
} from '../lib/learningStats';

interface DashboardProps {
  results: TestResult[];
  userState: UserState;
  totalLearningSeconds?: number;
  onContinueModule?: (module: NGSSModule) => void;
  onResumeChat?: () => void;
}

type StatDetail = 'tests' | 'time' | 'average' | 'streak' | 'best' | 'gaps' | 'closure' | 'active' | null;

export function Dashboard({ results, userState, totalLearningSeconds = 0, onContinueModule, onResumeChat }: DashboardProps) {
  const [statDetail, setStatDetail] = useState<StatDetail>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const isDark = useIsDarkMode();
  const tooltipProps = chartTooltipStyle(isDark);

  const profile = userState.profile;
  const lastModule = profile?.lastModuleId ? getModuleById(profile.lastModuleId) || null : null;
  const recommendation = recommendNextModule(results, profile?.grade || userState.grade, profile?.lastModuleId);
  const showContinue = !!(onContinueModule && onResumeChat);

  const chartData = results.map((r, i) => ({
    name: r.type === 'unit' ? `Unit ${r.targetId}` : r.type,
    score: Math.round(r.score),
    index: i
  }));

  const avgScore = computeAverageScore(results);
  const bestScore = computeBestScore(results);
  const trendUp = isScoreTrendUp(results);
  const topType = mostTestedType(results);
  const { allGaps, openGaps, closedGaps, gapClosureRate } = computeGapClosureRate(results);
  const streak = computeActivityStreak(results);
  const typeCounts: Record<string, number> = {};
  results.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">My Stats</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
          Tap any card for details — test history, gaps, and what you got wrong.
        </p>
      </header>

      {showContinue && (
        <ContinueLearningCard
          lastModule={lastModule}
          lastChatTopic={profile?.lastChatTopic}
          recommendedGap={recommendation.gap}
          recommendedModule={recommendation.module}
          onContinueModule={onContinueModule!}
          onResumeChat={onResumeChat!}
          onRepairGap={onContinueModule!}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="student-stat-cards">
        <StatCard onClick={() => setStatDetail('tests')} icon={<CheckCircle2 className="text-sage-green" />} label="Tests Taken" value={results.length.toString()} subtext="Placement, Unit, & Grade" accent="green" />
        <StatCard onClick={() => setStatDetail('time')} icon={<Clock className="text-blue-500" />} label="Time Learning" value={formatLearningTime(totalLearningSeconds)} subtext="Total with Valerie" accent="blue" />
        <StatCard onClick={() => setStatDetail('average')} icon={<TrendingUp className={trendUp ? "text-sage-green" : "text-orange-500"} />} label="Avg Score" value={results.length > 0 ? `${avgScore}%` : 'N/A'} subtext={results.length >= 2 ? (trendUp ? "Trending up" : "Needs focus") : "Keep testing"} accent={trendUp ? "green" : "orange"} />
        <StatCard onClick={() => setStatDetail('streak')} icon={<Flame className="text-soft-pink" />} label="Day Streak" value={streak > 0 ? `${streak}d` : '0d'} subtext="Consecutive days active" accent="pink" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard onClick={() => setStatDetail('best')} icon={<Star className="text-yellow-500" />} label="Best Score" value={results.length > 0 ? `${bestScore}%` : 'N/A'} subtext="Personal record" accent="yellow" />
        <StatCard onClick={() => setStatDetail('gaps')} icon={<Brain className="text-purple-500" />} label="Gaps Identified" value={allGaps.length.toString()} subtext="Conceptual areas to repair" accent="purple" />
        <StatCard onClick={() => setStatDetail('closure')} icon={<Target className="text-sage-green" />} label="Gap Closure" value={allGaps.length > 0 ? `${gapClosureRate}%` : 'N/A'} subtext={`${closedGaps.length} of ${allGaps.length} gaps closed`} accent="green" />
        <StatCard onClick={() => setStatDetail('active')} icon={<BookOpen className="text-blue-500" />} label="Most Active" value={topType !== 'N/A' ? topType.charAt(0).toUpperCase() + topType.slice(1) : 'N/A'} subtext={`${typeCounts[topType] || 0} test${typeCounts[topType] !== 1 ? 's' : ''} taken`} accent="blue" />
      </div>

      {statDetail && (
        <StudentStatModal
          type={statDetail}
          results={results}
          totalSeconds={totalLearningSeconds}
          avgScore={avgScore}
          bestScore={bestScore}
          streak={streak}
          allGaps={allGaps}
          closedGaps={closedGaps}
          gapClosureRate={gapClosureRate}
          typeCounts={typeCounts}
          mostTestedType={topType}
          expandedTestId={expandedTestId}
          onToggleTest={(id) => setExpandedTestId(expandedTestId === id ? null : id)}
          onClose={() => setStatDetail(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20" data-tour="student-performance-chart">
          <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-slate-100">Test Performance Over Time</h3>
          <p className="text-sm font-bold text-slate-400 mb-8">Each bar is one test. Higher is better (green = strong).</p>
          <div className="h-72">
            {results.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor(isDark)} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartAxisColors(isDark), fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartAxisColors(isDark), fontWeight: 700 }} />
                  <Tooltip
                    cursor={tooltipProps.cursor}
                    contentStyle={tooltipProps.contentStyle}
                    labelStyle={tooltipProps.labelStyle}
                    itemStyle={tooltipProps.itemStyle}
                    formatter={(v) => [`${Number(v ?? 0)}%`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartBarFill(entry.score, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <TrendingUp size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">No Test Data Yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20" data-tour="student-gaps-panel">
          <h3 className="text-xl font-black mb-4 text-slate-900 dark:text-slate-100">Conceptual Gaps</h3>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Open</p>
              <p className="text-2xl font-black text-red-500">{openGaps.length}</p>
            </div>
            <div className="flex-1 text-center p-3 bg-sage-green/10 rounded-2xl">
              <p className="text-xs font-black text-sage-green uppercase tracking-widest mb-1">Closed</p>
              <p className="text-2xl font-black text-sage-green">{closedGaps.length}</p>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {allGaps.length > 0 ? (
              allGaps.map((gap, i) => {
                const isClosed = closedGaps.includes(gap);
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border ${isClosed ? 'bg-sage-green/5 border-sage-green/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isClosed ? 'bg-sage-green' : 'bg-soft-pink'}`} />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{gap}</p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Brain size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Gaps Identified</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20" data-tour="student-module-progress">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center">
            <BookOpen size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Module Progress</h3>
            <p className="text-sm font-bold text-slate-400">Per-module completion and time spent</p>
          </div>
        </div>
        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <Layers size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="font-black text-slate-500 dark:text-slate-400 mb-1">Detailed module stats arrive as modules roll out</p>
          <p className="text-sm font-bold text-slate-400 max-w-md mx-auto">
            Once you begin curriculum modules and simulations, you'll see completion status, time spent per module, and unit-test results here.
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentStatModal({ type, results, totalSeconds, avgScore, bestScore, streak, allGaps, closedGaps, gapClosureRate, typeCounts, mostTestedType, expandedTestId, onToggleTest, onClose }: {
  type: StatDetail; results: TestResult[]; totalSeconds: number; avgScore: number; bestScore: number;
  streak: number; allGaps: string[]; closedGaps: string[]; gapClosureRate: number;
  typeCounts: Record<string, number>; mostTestedType: string;
  expandedTestId: string | null; onToggleTest: (id: string) => void; onClose: () => void;
}) {
  const titles: Record<string, string> = {
    tests: 'Tests Taken', time: 'Time Learning', average: 'Score Breakdown', streak: 'Day Streak',
    best: 'Best Score', gaps: 'Conceptual Gaps', closure: 'Gap Closure', active: 'Most Active Test Type'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-[32px] p-8 shadow-2xl relative max-h-[80vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"><X size={22} /></button>
        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-6">{titles[type!]}</h3>

        {type === 'tests' && (
          <div className="space-y-3">
            {results.length === 0 ? <p className="text-slate-500">No tests yet.</p> : [...results].reverse().map(r => (
              <TestRow key={r.id} result={r} expanded={expandedTestId === r.id} onToggle={() => onToggleTest(r.id)} />
            ))}
          </div>
        )}
        {type === 'time' && (
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">{formatLearningTime(totalSeconds)}</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Time in the Socratic Lab and modules counts here.</p>
          </div>
        )}
        {type === 'average' && (
          <ul className="space-y-2">
            {['placement', 'unit', 'grade'].map(t => {
              const typed = results.filter(r => r.type === t);
              const avg = typed.length ? Math.round(typed.reduce((s, r) => s + r.score, 0) / typed.length) : null;
              return (
                <li key={t} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{t}</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">{avg !== null ? `${avg}% (${typed.length})` : 'N/A'}</span>
                </li>
              );
            })}
            <li className="p-3 bg-soft-pink/10 rounded-xl flex justify-between mt-4">
              <span className="font-black text-slate-900 dark:text-slate-100">Overall</span>
              <span className="font-black text-slate-900 dark:text-slate-100">{results.length ? `${avgScore}%` : 'N/A'}</span>
            </li>
          </ul>
        )}
        {type === 'streak' && (
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">{streak} day{streak !== 1 ? 's' : ''}</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Consecutive days with test activity. Keep showing up!</p>
          </div>
        )}
        {type === 'best' && (
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">{bestScore}%</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Your highest score across all tests.</p>
          </div>
        )}
        {type === 'gaps' && (
          <ul className="space-y-2">
            {allGaps.length === 0 ? <p className="text-slate-500">No gaps yet.</p> : allGaps.map((g, i) => (
              <li key={i} className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300">{g}</li>
            ))}
          </ul>
        )}
        {type === 'closure' && (
          <div>
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">{gapClosureRate}%</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{closedGaps.length} of {allGaps.length} identified gaps are now closed.</p>
          </div>
        )}
        {type === 'active' && (
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 capitalize mb-2">{mostTestedType}</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{typeCounts[mostTestedType] || 0} tests of this type.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TestRow({ result, expanded, onToggle }: { result: TestResult; expanded: boolean; onToggle: () => void }) {
  const wrong = (result.answers || []).filter(a => !a.correct);
  const label = result.type === 'unit' ? `Unit Test — ${result.targetId}` : `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} Test`;
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
        <div>
          <p className="font-black text-slate-900 dark:text-slate-100">{label}</p>
          <p className="text-xs font-bold text-slate-400">{new Date(result.timestamp).toLocaleDateString()} · {Math.round(result.score)}%</p>
        </div>
        <div className="flex items-center gap-2">
          {wrong.length > 0 && <span className="text-xs font-black text-orange-500">{wrong.length} wrong</span>}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && wrong.length > 0 && (
        <div className="p-4 space-y-2 border-t border-slate-100 dark:border-slate-700">
          {wrong.map((a, i) => (
            <div key={i} className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.questionText}</p>
              {a.selectedAnswer && <p className="text-xs text-red-600 dark:text-red-400 mt-1">You answered: {a.selectedAnswer}</p>}
              {a.concept && <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase mt-1">{a.concept}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext, accent, onClick }: {
  icon: React.ReactNode; label: string; value: string; subtext: string; accent?: string; onClick?: () => void;
}) {
  const accentMap: Record<string, string> = {
    green: 'bg-sage-green/10', blue: 'bg-blue-50', pink: 'bg-soft-pink/10', orange: 'bg-orange-50', purple: 'bg-purple-50', yellow: 'bg-yellow-50',
  };
  const bg = accent ? accentMap[accent] || 'bg-slate-50' : 'bg-slate-50';
  return (
    <button type="button" onClick={onClick} className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-black/20 hover:scale-105 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/40 hover:border-soft-pink/30 transition-all duration-200 flex flex-col text-left w-full cursor-pointer">
      <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-5`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1">{value}</h4>
      <p className="text-xs text-slate-400 font-bold">{subtext}</p>
    </button>
  );
}
