import { Beaker, LayoutDashboard, BookOpen, Settings, LogOut, ShieldCheck, UserCircle, CreditCard, ClipboardList, BarChart2, HelpCircle, Users } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserState, AppTab } from '../types';
import { ValerieMascot } from './ValerieMascot';
import { ThemeToggle } from './ThemeToggle';
import { ICON_GHOST_BUTTON_CLASS } from '../lib/buttonStyles';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  userState: UserState;
  onLogout?: () => void;
  isDemo?: boolean;
  demoViewRole?: 'student' | 'parent';
  onDemoRoleSwitch?: (role: 'student' | 'parent') => void;
  teacherUnreadCount?: number;
  studentUnreadCount?: number;
}

export function Layout({ children, activeTab, onTabChange, userState, onLogout, isDemo, demoViewRole, onDemoRoleSwitch, teacherUnreadCount = 0, studentUnreadCount = 0 }: LayoutProps) {
  const role = isDemo ? demoViewRole : userState.role;
  const showStudentNav = role === 'student';
  const showDistrictStudentNav = role === 'student' && userState.path === 'district';
  const showParentNav = role === 'parent';
  const showDistrictParent = role === 'parent' && userState.path === 'district';
  const showTeacherNav = userState.role === 'teacher';
  const showAdminNav = userState.role === 'admin';

  return (
    <div className="min-h-screen bg-cream dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-8 z-50 hidden md:block">
        <button 
          onClick={() => onTabChange(showStudentNav ? 'curriculum' : 'dashboard')}
          className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity"
        >
          <ValerieMascot size={48} />
          <div>
            <span className="text-xl font-black tracking-tighter block leading-none dark:text-slate-100">VALLEY</span>
            <span className="text-xl font-black tracking-tighter block leading-none text-sage-green">SCIENCE</span>
          </div>
        </button>

        {isDemo && onDemoRoleSwitch && (
          <div className="mb-6 p-3 bg-soft-pink/10 dark:bg-soft-pink/20 rounded-2xl border border-soft-pink/20 dark:border-soft-pink/30">
            <p className="text-[10px] font-black text-soft-pink uppercase tracking-widest mb-2">Demo Mode</p>
            <div className="flex gap-2">
              <button onClick={() => onDemoRoleSwitch('student')} className={cn("flex-1 py-2 rounded-xl text-xs font-black", demoViewRole === 'student' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>Student</button>
              <button onClick={() => onDemoRoleSwitch('parent')} className={cn("flex-1 py-2 rounded-xl text-xs font-black", demoViewRole === 'parent' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>Parent</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {showStudentNav && (
            <>
              <NavItem icon={<BookOpen size={22} />} label="Curriculum" active={activeTab === 'curriculum'} onClick={() => onTabChange('curriculum')} tourId="nav-curriculum" />
              <NavItem icon={<Beaker size={22} />} label="Socratic Lab" active={activeTab === 'chat'} onClick={() => onTabChange('chat')} tourId="nav-chat" />
            </>
          )}
          {showDistrictStudentNav && (
            <>
              <NavItem icon={<Users size={22} />} label="My Class" active={activeTab === 'my-class'} onClick={() => onTabChange('my-class')} tourId="nav-my-class" badgeCount={studentUnreadCount} />
              <NavItem icon={<ClipboardList size={22} />} label="My Assignments" active={activeTab === 'my-assignments'} onClick={() => onTabChange('my-assignments')} tourId="nav-my-assignments" />
            </>
          )}
          {(showStudentNav || showParentNav || showTeacherNav) && (
            <NavItem 
              icon={<LayoutDashboard size={22} />} 
              label={showParentNav ? "Student Progress" : showTeacherNav ? "My Class" : "Stats Page"} 
              active={activeTab === 'dashboard'} 
              onClick={() => onTabChange('dashboard')}
              tourId="nav-dashboard"
              badgeCount={showTeacherNav ? teacherUnreadCount : undefined}
            />
          )}
          {showAdminNav && (
            <NavItem icon={<ShieldCheck size={22} />} label="All Classrooms" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
          )}
          {isDemo && (
            <NavItem icon={<HelpCircle size={22} />} label="Demo Guide" active={activeTab === 'demo-guide'} onClick={() => onTabChange('demo-guide')} />
          )}
          {showParentNav && !showDistrictParent && (
            <>
              <NavItem icon={<UserCircle size={22} />} label="Student Account" active={activeTab === 'student-account'} onClick={() => onTabChange('student-account')} tourId="nav-student-account" />
              <NavItem icon={<CreditCard size={22} />} label="Billing" active={activeTab === 'billing'} onClick={() => onTabChange('billing')} tourId="nav-billing" />
            </>
          )}
          {showDistrictParent && (
            <NavItem icon={<UserCircle size={22} />} label="Student Account" active={activeTab === 'student-account'} onClick={() => onTabChange('student-account')} tourId="nav-student-account" />
          )}
          {showTeacherNav && (
            <>
              <NavItem icon={<ClipboardList size={22} />} label="Assignments" active={activeTab === 'assignments'} onClick={() => onTabChange('assignments')} tourId="nav-assignments" />
              <NavItem icon={<BarChart2 size={22} />} label="Class Tests" active={activeTab === 'class-tests'} onClick={() => onTabChange('class-tests')} tourId="nav-class-tests" />
            </>
          )}
          {userState.role === 'founder' && (
            <NavItem icon={<ShieldCheck size={22} />} label="Founder View" active={activeTab === 'founder'} onClick={() => onTabChange('founder')} />
          )}
          <NavItem icon={<Settings size={22} />} label="Settings" active={activeTab === 'settings'} onClick={() => onTabChange('settings')} tourId="nav-settings" />
        </div>

        <div className="absolute bottom-8 left-8 right-8 space-y-3" data-tour="nav-account-footer">
          <div className="p-5 bg-cream dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
              {userState.role === 'parent'
                ? (userState.path === 'district' ? 'District Parent' : 'Parent Account')
                : (userState.path === 'district' ? 'District Access' : 'Individual Access')}
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
              {userState.profile?.username || userState.profile?.name || 'User'}
            </p>
          </div>
          <ThemeToggle
            showLabel
            className="w-full justify-center py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={onLogout}
            data-tour="nav-logout"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-black text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-950/60 hover:border-red-300 transition-all"
          >
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-around z-50 rounded-t-[32px] shadow-2xl">
        {showStudentNav && (
          <>
            <button onClick={() => onTabChange('curriculum')} className={cn("p-2", activeTab === 'curriculum' ? "text-soft-pink" : "text-slate-300")}>
              <BookOpen size={28} />
            </button>
            <button onClick={() => onTabChange('chat')} className={cn("p-2", activeTab === 'chat' ? "text-soft-pink" : "text-slate-300")}>
              <Beaker size={28} />
            </button>
          </>
        )}
        {(showStudentNav || showParentNav || showTeacherNav || showAdminNav) && (
          <button onClick={() => onTabChange('dashboard')} className={cn("p-2 relative", activeTab === 'dashboard' ? "text-soft-pink" : "text-slate-300")}>
            <LayoutDashboard size={28} />
            {showTeacherNav && teacherUnreadCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {teacherUnreadCount > 9 ? '9+' : teacherUnreadCount}
              </span>
            )}
          </button>
        )}
        {showParentNav && (
          <>
            <button onClick={() => onTabChange('student-account')} className={cn("p-2", activeTab === 'student-account' ? "text-soft-pink" : "text-slate-300")}>
              <UserCircle size={28} />
            </button>
            {!showDistrictParent && (
              <button onClick={() => onTabChange('billing')} className={cn("p-2", activeTab === 'billing' ? "text-soft-pink" : "text-slate-300")}>
                <CreditCard size={28} />
              </button>
            )}
          </>
        )}
        {showDistrictStudentNav && (
          <>
            <button onClick={() => onTabChange('my-class')} className={cn("p-2 relative", activeTab === 'my-class' ? "text-soft-pink" : "text-slate-300 dark:text-slate-600")}>
              <Users size={28} />
              {studentUnreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {studentUnreadCount > 9 ? '9+' : studentUnreadCount}
                </span>
              )}
            </button>
            <button onClick={() => onTabChange('my-assignments')} className={cn("p-2", activeTab === 'my-assignments' ? "text-soft-pink" : "text-slate-300 dark:text-slate-600")}>
              <ClipboardList size={28} />
            </button>
          </>
        )}
        {showTeacherNav && (
          <>
            <button onClick={() => onTabChange('assignments')} className={cn("p-2", activeTab === 'assignments' ? "text-soft-pink" : "text-slate-300")}>
              <ClipboardList size={28} />
            </button>
            <button onClick={() => onTabChange('class-tests')} className={cn("p-2", activeTab === 'class-tests' ? "text-soft-pink" : "text-slate-300")}>
              <BarChart2 size={28} />
            </button>
          </>
        )}
        {isDemo && (
          <button onClick={() => onTabChange('demo-guide')} className={cn("p-2", activeTab === 'demo-guide' ? "text-soft-pink" : "text-slate-300")}>
            <HelpCircle size={28} />
          </button>
        )}
        <button onClick={() => onTabChange('settings')} className={cn("p-2", activeTab === 'settings' ? "text-soft-pink" : "text-slate-300")}>
          <Settings size={28} />
        </button>
        <button onClick={onLogout} className={cn(ICON_GHOST_BUTTON_CLASS, 'hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30')}>
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

function NavItem({ icon, label, active, onClick, tourId, badgeCount }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, tourId?: string, badgeCount?: number }) {
  return (
    <button
      onClick={onClick}
      data-tour={tourId}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group",
        active 
          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-50 dark:border-slate-700" 
          : "text-slate-400 dark:text-slate-500 font-bold hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/60"
      )}
    >
      <div className={cn("relative transition-transform duration-300 group-hover:scale-110", active ? "text-soft-pink" : "text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-slate-100")}>
        {icon}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" aria-label={`${badgeCount} unread notifications`} />
      )}
    </button>
  );
}
