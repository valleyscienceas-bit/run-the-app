import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, CheckCircle2, Clock, Brain } from 'lucide-react';

import { TestResult, UserState } from '../types';

interface DashboardProps {
  results: TestResult[];
  userState: UserState;
}

export function Dashboard({ results, userState }: DashboardProps) {
  const isParent = userState.role === 'parent';
  const latestResult = results.length > 0 ? results[results.length - 1] : null;
  
  const chartData = results.map(r => ({
    name: r.type === 'unit' ? `Unit ${r.targetId}` : r.type,
    score: r.score
  }));

  const allGaps = Array.from(new Set(results.flatMap(r => r.gaps)));

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          icon={<CheckCircle2 className="text-sage-green" />} 
          label={isParent ? "Student Tests" : "Tests Taken"} 
          value={results.length.toString()} 
          subtext="Placement, Unit, & Grade" 
        />
        <StatCard 
          icon={<Brain className="text-purple-600" />} 
          label="Identified Gaps" 
          value={allGaps.length.toString()} 
          subtext="Conceptual areas to improve" 
        />
        <StatCard 
          icon={<TrendingUp className="text-orange-600" />} 
          label="Latest Score" 
          value={latestResult ? `${latestResult.score.toFixed(1)}%` : 'N/A'} 
          subtext={latestResult ? `From ${latestResult.type} test` : 'No tests taken yet'} 
        />
        <StatCard 
          icon={<Clock className="text-blue-600" />} 
          label={isParent ? "Student XP" : "XP Earned"} 
          value={(results.length * 250).toLocaleString()} 
          subtext="Level 4 Scientist" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8">Test Performance History</h3>
          <div className="h-80">
            {results.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                  />
                  <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#87A96B' : '#FADADD'} />
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

        {/* Gap List */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8">Conceptual Gaps</h3>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
            {allGaps.length > 0 ? (
              allGaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-2 h-2 bg-soft-pink rounded-full mt-2 shrink-0" />
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{gap}</p>
                </div>
              ))
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

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
      <h4 className="text-3xl font-black text-slate-900 mb-1">{value}</h4>
      <p className="text-xs text-slate-400 font-bold">{subtext}</p>
    </div>
  );
}
