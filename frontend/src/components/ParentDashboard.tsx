import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Clock, CheckCircle2, TrendingUp, Brain, RefreshCw, AlertTriangle,
  BellRing, CalendarClock, BookOpen, Layers, Info, TrendingDown
} from 'lucide-react';
import { StudentOverview } from '../types';
import { ValerieMascot } from './ValerieMascot';

interface ParentDashboardProps {
  overview: StudentOverview | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function ParentDashboard({ overview, loading, onRefresh }: ParentDashboardProps) {
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
          <p className="text-xl text-slate-600 font-medium">Monitoring your student's conceptual growth.</p>
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
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all"
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

  // Score trend (recent 3 vs previous 3)
  const recentAvg = results.slice(-3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-3).length, 1);
  const prevAvg = results.slice(-6, -3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-6, -3).length, 1);
  const trendUp = recentAvg >= prevAvg;

  // Conceptual gaps remaining (gaps in the latest test)
  const latestResult = results.length > 0 ? results[results.length - 1] : null;
  const gapsRemaining = latestResult ? new Set(latestResult.gaps).size : 0;

  const chartData = results.map((r) => ({
    name: r.type === 'unit' ? `Unit ${r.targetId}` : r.type.charAt(0).toUpperCase() + r.type.slice(1),
    score: Math.round(r.score)
  }));

  // Last activity = most recent of stats.lastUpdated or latest result timestamp
  const activityCandidates = [stats?.lastUpdated, latestResult?.timestamp].filter(Boolean) as string[];
  const lastActivity = activityCandidates
    .map(d => new Date(d).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => b - a)[0];
  const inactiveDays = lastActivity ? Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)) : null;

  // Active alerts (only what current data supports)
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
      {/* Friendly header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-soft-pink/30 to-sage-green/30 rounded-3xl p-3 shadow-inner">
            <ValerieMascot size={56} expression="happy" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-1">
              {firstName}'s Progress
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              A clear look at how your student is learning with Valley Science.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 self-start bg-white border-2 border-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black hover:border-soft-pink hover:text-soft-pink transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {/* Alerts panel */}
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

          {/* Scaffolded module-time monitors (activate once module data exists) */}
          <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Coming with modules</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ScaffoldAlert icon={<CalendarClock size={16} />} text="Idle time during a module" />
              <ScaffoldAlert icon={<Clock size={16} />} text="Too long on a simulation" />
              <ScaffoldAlert icon={<Clock size={16} />} text="Too long on a single question" />
              <ScaffoldAlert icon={<Layers size={16} />} text="Exceeding allocated module time" />
            </div>
            <p className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-2">
              <Info size={14} /> These monitors turn on automatically once learning modules roll out.
            </p>
          </div>
        </div>
      </section>

      {/* Plain-language stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PlainStatCard
          icon={<Clock className="text-blue-500" />}
          accent="blue"
          value={formatTime(totalSeconds)}
          label="Time spent learning"
          explanation="Total time talking with Valerie and working through science."
        />
        <PlainStatCard
          icon={<CheckCircle2 className="text-sage-green" />}
          accent="green"
          value={testsCompleted.toString()}
          label="Tests completed"
          explanation={testsCompleted === 0 ? "No tests taken yet." : "Placement, unit, and grade-level checks."}
        />
        <PlainStatCard
          icon={trendUp ? <TrendingUp className="text-sage-green" /> : <TrendingDown className="text-orange-500" />}
          accent={trendUp ? 'green' : 'orange'}
          value={results.length > 0 ? `${avgScore}%` : 'N/A'}
          label="Average score"
          explanation={
            results.length >= 2
              ? (trendUp ? "Scores are trending upward — nice work!" : "Scores dipped recently — may need a little support.")
              : "Average across all tests taken so far."
          }
        />
        <PlainStatCard
          icon={<Brain className="text-purple-500" />}
          accent="purple"
          value={results.length > 0 ? gapsRemaining.toString() : 'N/A'}
          label="Concepts to revisit"
          explanation={
            results.length === 0
              ? "Shows up after the first test."
              : gapsRemaining === 0
                ? "No open gaps — all caught up!"
                : "Topics Valerie is still helping your student master."
          }
        />
      </div>

      {/* Test history */}
      <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-900">Test Performance Over Time</h3>
            <p className="text-sm font-bold text-slate-400">Each bar is one test. Higher is better (green = strong).</p>
          </div>
        </div>
        <div className="h-72">
          {results.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                  formatter={(v: any) => [`${v}%`, 'Score']}
                />
                <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#87A96B' : entry.score >= 60 ? '#FADADD' : '#fca5a5'} />
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

      {/* Module progress (placeholder, ready for module data) */}
      <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
            <BookOpen size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Module Progress</h3>
            <p className="text-sm font-bold text-slate-400">Per-module completion and time spent</p>
          </div>
        </div>
        <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
          <Layers size={32} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-500 mb-1">Detailed module stats arrive as modules roll out</p>
          <p className="text-sm font-bold text-slate-400 max-w-md mx-auto">
            Once your student begins curriculum modules and simulations, you'll see completion status, time spent per module, and unit-test results here.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlainStatCard({ icon, value, label, explanation, accent }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  explanation: string;
  accent?: string;
}) {
  const accentMap: Record<string, string> = {
    green: 'bg-sage-green/10',
    blue: 'bg-blue-50',
    pink: 'bg-soft-pink/10',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
  };
  const bg = accent ? accentMap[accent] || 'bg-slate-50' : 'bg-slate-50';
  return (
    <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-xl transition-shadow flex flex-col">
      <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-5`}>
        {icon}
      </div>
      <h4 className="text-3xl font-black text-slate-900 mb-1">{value}</h4>
      <p className="text-sm font-black text-slate-700 mb-2">{label}</p>
      <p className="text-xs text-slate-400 font-bold leading-relaxed">{explanation}</p>
    </div>
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
