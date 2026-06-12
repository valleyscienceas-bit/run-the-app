import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, CheckCircle2, Clock, Brain, Flame, Star, Target, BookOpen } from 'lucide-react';
import { TestResult, UserState } from '../types';

interface DashboardProps {
  results: TestResult[];
  userState: UserState;
  totalLearningSeconds?: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function Dashboard({ results, userState, totalLearningSeconds = 0 }: DashboardProps) {
  const isParent = userState.role === 'parent';
  const latestResult = results.length > 0 ? results[results.length - 1] : null;

  const chartData = results.map((r, i) => ({
    name: r.type === 'unit' ? `Unit ${r.targetId}` : r.type,
    score: Math.round(r.score),
    index: i
  }));

  const allGaps = Array.from(new Set(results.flatMap(r => r.gaps)));

  // Average score
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  // Best score
  const bestScore = results.length > 0
    ? Math.round(Math.max(...results.map(r => r.score)))
    : 0;

  // Score trend: last 3 tests average vs previous 3
  const recentAvg = results.slice(-3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-3).length, 1);
  const prevAvg = results.slice(-6, -3).reduce((s, r) => s + r.score, 0) / Math.max(results.slice(-6, -3).length, 1);
  const trendUp = recentAvg >= prevAvg;

  // Most tested type
  const typeCounts: Record<string, number> = {};
  results.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
  const mostTestedType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Gap closure rate: gaps that appeared once but not in latest result = "closed"
  const allGapSet = new Set(results.flatMap(r => r.gaps));
  const latestGapSet = new Set(latestResult?.gaps || []);
  const closedGaps = [...allGapSet].filter(g => !latestGapSet.has(g));
  const gapClosureRate = allGapSet.size > 0
    ? Math.round((closedGaps.length / allGapSet.size) * 100)
    : 0;

  // Streak: consecutive days with activity (from result timestamps)
  const dayStrings = results.map(r => new Date(r.timestamp).toDateString());
  const uniqueDays = Array.from(new Set(dayStrings)).sort();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (uniqueDays.includes(d.toDateString())) streak++;
    else if (i > 0) break;
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">
          {isParent ? 'Student Progress' : 'My Stats'}
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          {isParent
            ? `Monitoring conceptual growth for ${userState.profile?.linkedStudentUid ? 'your student' : 'linked account'}.`
            : 'Tracking your conceptual growth and identified gaps.'}
        </p>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<CheckCircle2 className="text-sage-green" />}
          label={isParent ? "Student Tests" : "Tests Taken"}
          value={results.length.toString()}
          subtext="Placement, Unit, & Grade"
          accent="green"
        />
        <StatCard
          icon={<Clock className="text-blue-500" />}
          label="Time Learning"
          value={formatTime(totalLearningSeconds)}
          subtext="Total with Valerie"
          accent="blue"
        />
        <StatCard
          icon={<TrendingUp className={trendUp ? "text-sage-green" : "text-orange-500"} />}
          label="Avg Score"
          value={results.length > 0 ? `${avgScore}%` : 'N/A'}
          subtext={results.length >= 2 ? (trendUp ? "Trending up" : "Needs focus") : "Keep testing"}
          accent={trendUp ? "green" : "orange"}
        />
        <StatCard
          icon={<Flame className="text-soft-pink" />}
          label="Day Streak"
          value={streak > 0 ? `${streak}d` : '0d'}
          subtext="Consecutive days active"
          accent="pink"
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Star className="text-yellow-500" />}
          label="Best Score"
          value={results.length > 0 ? `${bestScore}%` : 'N/A'}
          subtext="Personal record"
          accent="yellow"
        />
        <StatCard
          icon={<Brain className="text-purple-500" />}
          label="Gaps Identified"
          value={allGaps.length.toString()}
          subtext="Conceptual areas to repair"
          accent="purple"
        />
        <StatCard
          icon={<Target className="text-sage-green" />}
          label="Gap Closure"
          value={allGaps.length > 0 ? `${gapClosureRate}%` : 'N/A'}
          subtext={`${closedGaps.length} of ${allGapSet.size} gaps closed`}
          accent="green"
        />
        <StatCard
          icon={<BookOpen className="text-blue-500" />}
          label="Most Active"
          value={mostTestedType !== 'N/A' ? mostTestedType.charAt(0).toUpperCase() + mostTestedType.slice(1) : 'N/A'}
          subtext={`${typeCounts[mostTestedType] || 0} test${typeCounts[mostTestedType] !== 1 ? 's' : ''} taken`}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Score History Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8">Test Performance History</h3>
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
                <p className="font-black uppercase tracking-widest text-sm">No Test Data Yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Conceptual Gaps */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-4">Conceptual Gaps</h3>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 text-center p-3 bg-red-50 rounded-2xl">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Open</p>
              <p className="text-2xl font-black text-red-500">{latestGapSet.size}</p>
            </div>
            <div className="flex-1 text-center p-3 bg-sage-green/10 rounded-2xl">
              <p className="text-xs font-black text-sage-green uppercase tracking-widest mb-1">Closed</p>
              <p className="text-2xl font-black text-sage-green">{closedGaps.length}</p>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {allGaps.length > 0 ? (
              allGaps.map((gap, i) => {
                const isClosed = !latestGapSet.has(gap);
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border ${isClosed ? 'bg-sage-green/5 border-sage-green/20' : 'bg-slate-50 border-slate-100'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isClosed ? 'bg-sage-green' : 'bg-soft-pink'}`} />
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{gap}</p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Brain size={32} className="text-slate-200 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Gaps Identified</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  accent?: string;
}) {
  const accentMap: Record<string, string> = {
    green: 'bg-sage-green/10',
    blue: 'bg-blue-50',
    pink: 'bg-soft-pink/10',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
    yellow: 'bg-yellow-50',
  };
  const bg = accent ? accentMap[accent] || 'bg-slate-50' : 'bg-slate-50';
  return (
    <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-xl transition-shadow">
      <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-5`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <h4 className="text-3xl font-black text-slate-900 mb-1">{value}</h4>
      <p className="text-xs text-slate-400 font-bold">{subtext}</p>
    </div>
  );
}
