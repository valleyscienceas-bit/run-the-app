import React from 'react';
import { Beaker, LayoutDashboard, BookOpen, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserState } from '../types';
import { ValerieMascot } from './ValerieMascot';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'curriculum' | 'dashboard' | 'chat';
  onTabChange: (tab: 'curriculum' | 'dashboard' | 'chat' | 'founder') => void;
  userState: UserState;
  onLogout?: () => void;
}

export function Layout({ children, activeTab, onTabChange, userState, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-cream font-sans text-slate-900">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-100 p-8 z-50 hidden md:block">
        <button 
          onClick={() => onTabChange('curriculum')}
          className="flex items-center gap-3 mb-12 hover:opacity-80 transition-opacity"
        >
          <ValerieMascot size={48} />
          <div>
            <span className="text-xl font-black tracking-tighter block leading-none">VALLEY</span>
            <span className="text-xl font-black tracking-tighter block leading-none text-sage-green">SCIENCE</span>
          </div>
        </button>

        <div className="space-y-3">
          {userState.role !== 'parent' && (
            <>
              <NavItem 
                icon={<BookOpen size={22} />} 
                label="Curriculum" 
                active={activeTab === 'curriculum'} 
                onClick={() => onTabChange('curriculum')}
              />
              <NavItem 
                icon={<Beaker size={22} />} 
                label="Socratic Lab" 
                active={activeTab === 'chat'} 
                onClick={() => onTabChange('chat')}
              />
            </>
          )}
          <NavItem 
            icon={<LayoutDashboard size={22} />} 
            label={userState.role === 'parent' ? "Student Progress" : "Stats Page"} 
            active={activeTab === 'dashboard'} 
            onClick={() => onTabChange('dashboard')}
          />
          {userState.role === 'founder' && (
            <NavItem 
              icon={<ShieldCheck size={22} />} 
              label="Founder View" 
              active={activeTab === 'founder' as any} 
              onClick={() => onTabChange('founder')}
            />
          )}
          <NavItem 
            icon={<Settings size={22} />} 
            label="Settings" 
            active={activeTab === 'settings' as any} 
            onClick={() => onTabChange('settings' as any)}
          />
        </div>

        <div className="absolute bottom-10 left-8 right-8">
          <div className="p-6 bg-cream rounded-[32px] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              {userState.role === 'parent' ? 'Parent Account' : (userState.path === 'district' ? 'District Access' : 'Individual Access')}
            </p>
            <p className="text-sm font-black text-slate-900 mb-4 truncate">
              {userState.profile?.username || userState.profile?.name || 'Guest User'}
            </p>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-around z-50 rounded-t-[32px] shadow-2xl">
        {userState.role !== 'parent' && (
          <>
            <button onClick={() => onTabChange('curriculum')} className={cn("p-2", activeTab === 'curriculum' ? "text-soft-pink" : "text-slate-300")}>
              <BookOpen size={28} />
            </button>
            <button onClick={() => onTabChange('chat')} className={cn("p-2", activeTab === 'chat' ? "text-soft-pink" : "text-slate-300")}>
              <Beaker size={28} />
            </button>
          </>
        )}
        <button onClick={() => onTabChange('dashboard')} className={cn("p-2", activeTab === 'dashboard' ? "text-soft-pink" : "text-slate-300")}>
          <LayoutDashboard size={28} />
        </button>
        <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
          <LogOut size={28} />
        </button>
      </nav>

      {/* Main Content */}
      <main className="md:ml-72 p-8 md:p-16 pb-32 md:pb-16 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group",
        active 
          ? "bg-white text-slate-900 font-black shadow-xl shadow-slate-200/50 border border-slate-50" 
          : "text-slate-400 font-bold hover:text-slate-900 hover:bg-white/50"
      )}
    >
      <div className={cn("transition-transform duration-300 group-hover:scale-110", active ? "text-soft-pink" : "text-slate-300 group-hover:text-slate-900")}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}
