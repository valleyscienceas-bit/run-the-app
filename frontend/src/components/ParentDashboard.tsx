import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import {
  Clock, CheckCircle2, TrendingUp, Brain, RefreshCw, AlertTriangle,
  BellRing, CalendarClock, BookOpen, Layers, TrendingDown, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { StudentOverview, TestResult } from '../types';
import { ValerieMascot } from './ValerieMascot';
import { chartTooltipStyle, chartAxisColors, chartGridColor, chartBarFill, useIsDarkMode } from '../lib/chartTheme';
import { formatLearningTime } from '../lib/learningStats';
import { GHOST_BUTTON_CLASS } from '../lib/buttonStyles';

interface ParentDashboardProps {
  overview: StudentOverview | null;
  loading: boolean;
  onRefresh: () => void;
  onSwitchStudent?: (studentUid: string) => void;
}

type StatDetail = 'time' | 'tests' | 'average' | 'gaps' | null;


export function ParentDashboard({ overview, loading, onRefresh, onSwitchStudent }: ParentDashboardProps) {
  const [statDetail, setStatDetail] = useState<StatDetail>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const isDark = useIsDarkMode();
  const tooltipProps = chartTooltipStyle(isDark);

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-soft-pink/30 border-t-soft-pink rounded-full animate-spin mb-6" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Loading student progress...</p>
      </div>
    );
  }

  if (!overview || !overview.studentProfile) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Student Progress</h1>
          <p className="text-xl text-slate-700 font-medium">Monitoring your student's conceptual growth.</p>
        </header>
        <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-xl text-center">
          <div className="w-20 h-20 bg-soft-pink/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-soft-pink" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3">No linked student found</h3>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
            We couldn't load a student account linked to your parent profile yet. If your child just created their account, try refreshing in a moment.
          </p>
          <button
            onClick={onRefresh}
            className={GHOST_BUTTON_CLASS}
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const { studentProfile, results, stats } = overview;
  const firstName = (studentProfile.name || 'Your student').split(' ')[0];

  const totalSeconds = stats?.totalSeconds || 0;
  const testsCompleted = results.length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  const recentAvg = results.slice(-3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-3).length, 1);
  const prevAvg = results.slice(-6, -3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-6, -3).length, 1);
  const trendUp = recentAvg >= prevAvg;

  const latestResult = results.length > 0 ? results[results.length - 1] : null;
  const gapsRemaining = latestResult ? new Set(latestResult.gaps).size : 0;

  const chartData = results.map((r) => ({
    name: r.type === 'unit' ? `Unit ${r.targetId}` : r.type.charAt(0).toUpperCase() + r.type.slice(1),
    score: Math.round(r.score)
  }));

  const activityCandidates = [stats?.lastUpdated, latestResult?.timestamp].filter(Boolean) as string[];
  const lastActivity = activityCandidates
    .map(d => new Date(d).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => b - a)[0];
  const inactiveDays = lastActivity ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)) : null;

  const activeAlerts: { id: string; text: string }[] = [];
  if (inactiveDays !== null && inactiveDays >= 3) {
    activeAlerts.push({
      id: 'inactivity',
      text: `${firstName} hasn't been active in ${inactiveDays} days. A gentle nudge might help them stay on track.`
    });
  }
  if (results.length === 0) {
    activeAlerts.push({
      id: 'no-tests',
      text: `${firstName} hasn't completed the placement test yet. It helps Valerie build their personalized path.`
    });
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-soft-pink/30 to-sage-green/30 dark:from-soft-pink/20 dark:to-sage-green/20 rounded-3xl p-3 shadow-inner">
            <ValerieMascot size={56} expression="happy" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1">
              {firstName}'s Progress
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-400 font-medium">
              A clear look at how your student is learning with Valley Science.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 self-start">
          {(overview.linkedStudents?.length || 0) > 1 && onSwitchStudent && (
            <div data-tour="parent-student-switcher" className="min-w-[200px]">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Viewing</label>
              <select
                value={overview.activeStudentUid || studentProfile.uid}
                onChange={e => onSwitchStudent(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-soft-pink"
              >
                {overview.linkedStudents!.map(s => (
                  <option key={s.uid} value={s.uid}>{s.name} (Grade {s.grade})</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={onRefresh}
            className={`${GHOST_BUTTON_CLASS} self-end`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      <section className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="w-10 h-10 bg-soft-pink/10 rounded-2xl flex items-center justify-center">
            <BellRing size={20} className="text-soft-pink" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Notifications</h3>
            <p className="text-xs font-bold text-slate-400">In-app alerts about your student's activity</p>
          </div>
        </div>
        <div className="p-8 space-y-3">
          {activeAlerts.length > 0 ? (
            activeAlerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-slate-700 leading-relaxed">{alert.text}</p>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-4 p-4 bg-sage-green/5 border border-sage-green/20 rounded-2xl">
              <CheckCircle2 size={20} className="text-sage-green shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                All good! No alerts right now. {firstName} is on track.
              </p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Coming with modules</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ScaffoldAlert icon={<CalendarClock size={16} />} text="Idle time during a module" />
              <ScaffoldAlert icon={<Clock size={16} />} text="Too long on a simulation" />
              <ScaffoldAlert icon={<Clock size={16} />} text="Too long on a single question" />
              <ScaffoldAlert icon={<Layers size={16} />} text="Exceeding allocated module time" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="parent-stat-cards">
        <PlainStatCard onClick={() => setStatDetail('time')} icon={<Clock className="text-blue-500" />} accent="blue" value={formatLearningTime(totalSeconds)} label="Time spent learning" explanation="Total time talking with Valerie and working through science." />
        <PlainStatCard onClick={() => setStatDetail('tests')} icon={<CheckCircle2 className="text-sage-green" />} accent="green" value={testsCompleted.toString()} label="Tests completed" explanation={testsCompleted === 0 ? "No tests taken yet." : "Placement, unit, and grade-level checks."} />
        <PlainStatCard onClick={() => setStatDetail('average')} icon={trendUp ? <TrendingUp className="text-sage-green" /> : <TrendingDown className="text-orange-500" />} accent={trendUp ? 'green' : 'orange'} value={results.length > 0 ? `${avgScore}%` : 'N/A'} label="Average score" explanation={results.length >= 2 ? (trendUp ? "Scores are trending upward — nice work!" : "Scores dipped recently — may need a little support.") : "Average across all tests taken so far."} />
        <PlainStatCard onClick={() => setStatDetail('gaps')} icon={<Brain className="text-purple-500" />} accent="purple" value={results.length > 0 ? gapsRemaining.toString() : 'N/A'} label="Concepts to revisit" explanation={results.length === 0 ? "Shows up after the first test." : gapsRemaining === 0 ? "No open gaps — all caught up!" : "Topics Valerie is still helping your student master."} />
      </div>

      {statDetail && (
        <StatDetailModal
          type={statDetail}
          results={results}
          totalSeconds={totalSeconds}
          avgScore={avgScore}
          firstName={firstName}
          onClose={() => setStatDetail(null)}
        />
      )}

      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20" data-tour="parent-performance-chart">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Test Performance Over Time</h3>
            <p className="text-sm font-bold text-slate-400">Each bar is one test. Higher is better (green = strong).</p>
          </div>
        </div>
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
              <p className="font-black uppercase tracking-widest text-sm">No tests completed yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Question-level test details */}
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20" data-tour="parent-test-details">
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Test Details</h3>
        <p className="text-sm font-bold text-slate-400 mb-6">Expand a test to see wrong answers and topics.</p>
        {results.length === 0 ? (
          <p className="text-slate-500 font-medium">No test data yet.</p>
        ) : (
          <div className="space-y-3">
            {[...results].reverse().map(r => (
              <TestDetailRow key={r.id} result={r} expanded={expandedTestId === r.id} onToggle={() => setExpandedTestId(expandedTestId === r.id ? null : r.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20" data-tour="parent-module-progress">
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
            Once your student begins curriculum modules and simulations, you'll see completion status, time spent per module, and unit-test results here.
          </p>
        </div>
      </div>
    </div>
  );
}

function TestDetailRow({ result, expanded, onToggle }: { result: TestResult; expanded: boolean; onToggle: () => void }) {
  const wrongAnswers = (result.answers || []).filter(a => !a.correct);
  const label = result.type === 'unit' ? `Unit Test — ${result.targetId}` : `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} Test`;
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
        <div>
          <p className="font-black text-slate-900 dark:text-slate-100">{label}</p>
          <p className="text-xs font-bold text-slate-400">{new Date(result.timestamp).toLocaleDateString()} · {Math.round(result.score)}%</p>
        </div>
        <div className="flex items-center gap-3">
          {wrongAnswers.length > 0 && (
            <span className="text-xs font-black text-orange-500 uppercase tracking-widest">{wrongAnswers.length} wrong</span>
          )}
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="p-5 space-y-3 border-t border-slate-100 dark:border-slate-700">
          {(result.answers || []).length === 0 ? (
            <p className="text-sm text-slate-500 font-medium">Question-level detail not available for this test.</p>
          ) : (
            result.answers!.map((a, i) => (
              <div key={i} className={`p-4 rounded-xl border ${a.correct ? 'bg-sage-green/5 border-sage-green/20' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50'}`}>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{a.questionText}</p>
                {a.selectedAnswer && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Answer: {a.selectedAnswer}</p>}
                {a.concept && <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{a.concept}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatDetailModal({ type, results, totalSeconds, avgScore, firstName, onClose }: {
  type: StatDetail; results: TestResult[]; totalSeconds: number; avgScore: number;
  firstName: string; onClose: () => void;
}) {
  const titles: Record<string, string> = {
    time: 'Time Learning', tests: 'Tests Completed', average: 'Score Breakdown', gaps: 'Concepts to Revisit'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-[32px] p-8 shadow-2xl relative max-h-[80vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 dark:text-slate-500"><X size={22} /></button>
        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-6">{titles[type!]}</h3>

        {type === 'time' && (
          <div className="space-y-3">
            <p className="text-4xl font-black text-slate-900">{formatLearningTime(totalSeconds)}</p>
            <p className="text-slate-600 font-medium">Total learning time for {firstName}. Valerie chat and module time will appear here as modules roll out.</p>
          </div>
        )}
        {type === 'tests' && (
          <ul className="space-y-2">
            {results.length === 0 ? <p className="text-slate-500">No tests yet.</p> : results.map(r => (
              <li key={r.id} className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-bold text-slate-700 capitalize">{r.type} test</span>
                <span className="text-sm font-black text-slate-900">{Math.round(r.score)}% · {new Date(r.timestamp).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
        {type === 'average' && (
          <ul className="space-y-2">
            {['placement', 'unit', 'grade'].map(t => {
              const typed = results.filter(r => r.type === t);
              const avg = typed.length ? Math.round(typed.reduce((s, r) => s + r.score, 0) / typed.length) : null;
              return (
                <li key={t} className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="font-bold text-slate-700 capitalize">{t}</span>
                  <span className="font-black text-slate-900">{avg !== null ? `${avg}% (${typed.length})` : 'N/A'}</span>
                </li>
              );
            })}
            <li className="p-3 bg-soft-pink/10 rounded-xl flex justify-between mt-4">
              <span className="font-black text-slate-900">Overall</span>
              <span className="font-black text-slate-900">{results.length ? `${avgScore}%` : 'N/A'}</span>
            </li>
          </ul>
        )}
        {type === 'gaps' && (
          <div className="space-y-4">
            {results.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No gaps identified yet.</p>
            ) : (
              results.slice().reverse().map(r => {
                const wrong = (r.answers || []).filter(a => !a.correct);
                if (wrong.length === 0 && r.gaps.length === 0) return null;
                return (
                  <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="font-black text-slate-900 dark:text-slate-100 mb-2 capitalize">{r.type} test · {Math.round(r.score)}% · {new Date(r.timestamp).toLocaleDateString()}</p>
                    {wrong.length > 0 ? wrong.map((a, i) => (
                      <div key={i} className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-xl">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.questionText}</p>
                        {a.selectedAnswer && <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Your child answered: {a.selectedAnswer}</p>}
                        {a.concept && <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-1">Topic: {a.concept}</p>}
                      </div>
                    )) : r.gaps.map((g, i) => (
                      <p key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{g}</p>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PlainStatCard({ icon, value, label, explanation, accent, onClick }: {
  icon: React.ReactNode; value: string; label: string; explanation: string; accent?: string; onClick?: () => void;
}) {
  const accentMap: Record<string, string> = {
    green: 'bg-sage-green/10', blue: 'bg-blue-50', pink: 'bg-soft-pink/10', orange: 'bg-orange-50', purple: 'bg-purple-50',
  };
  const bg = accent ? accentMap[accent] || 'bg-slate-50' : 'bg-slate-50';
  return (
    <button onClick={onClick} className="bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-black/20 hover:scale-105 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/40 hover:border-soft-pink/30 transition-all duration-200 flex flex-col text-left cursor-pointer w-full">
      <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-5`}>{icon}</div>
      <h4 className="text-3xl font-black text-slate-900 mb-1">{value}</h4>
      <p className="text-sm font-black text-slate-700 mb-2">{label}</p>
      <p className="text-xs text-slate-400 font-bold leading-relaxed">{explanation}</p>
    </button>
  );
}

function ScaffoldAlert({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl opacity-70">
      <div className="text-slate-400 shrink-0">{icon}</div>
      <p className="text-xs font-bold text-slate-500">{text}</p>
      <span className="ml-auto text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0">Soon</span>
    </div>
  );
}
