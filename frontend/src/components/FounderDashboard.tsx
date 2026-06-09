import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { DollarSign, Users, School, TrendingUp, Activity, ShieldCheck } from 'lucide-react';

const REVENUE_DATA = [
  { month: 'Jan', rev: 12000 },
  { month: 'Feb', rev: 15000 },
  { month: 'Mar', rev: 18000 },
  { month: 'Apr', rev: 24000 },
];

const USER_STATS = [
  { name: 'District', value: 4500, color: '#2563eb' },
  { name: 'Individual', value: 1200, color: '#87A96B' },
];

export function FounderDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Founder Command Center</h1>
          <p className="text-lg text-slate-600 font-medium">Monitoring Valley Science growth and unit economics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
          <ShieldCheck size={18} />
          Admin Verified
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FounderStatCard 
          icon={<DollarSign className="text-green-600" />} 
          label="MRR" 
          value="$24,000" 
          subtext="+33% MoM" 
        />
        <FounderStatCard 
          icon={<Users className="text-blue-600" />} 
          label="Total Students" 
          value="5,700" 
          subtext="Across 3 Districts" 
        />
        <FounderStatCard 
          icon={<School className="text-purple-600" />} 
          label="Active Districts" 
          value="3" 
          subtext="LASD, PAUSD, MVWSD" 
        />
        <FounderStatCard 
          icon={<TrendingUp className="text-orange-600" />} 
          label="Avg. LTV" 
          value="$450" 
          subtext="District Contract" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2">
            <Activity size={24} className="text-blue-600" />
            Revenue Growth
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="rev" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8">User Composition</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={USER_STATS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  {USER_STATS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-cream rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pricing Strategy</p>
              <p className="text-sm font-bold text-slate-700">District: $12/student/year</p>
              <p className="text-sm font-bold text-slate-700">Individual: $19/month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FounderStatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <h4 className="text-3xl font-black text-slate-900 mb-1">{value}</h4>
      <p className="text-sm text-slate-500 font-bold">{subtext}</p>
    </div>
  );
}
