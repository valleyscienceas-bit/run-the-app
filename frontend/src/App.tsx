import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Brain, ClipboardCheck, ArrowRight } from 'lucide-react';
import { auth, onAuthStateChanged, User, db, doc, setDoc, getDoc, updateDoc } from './lib/firebase';
import { Layout } from './components/Layout';
import { ModuleGrid } from './components/ModuleGrid';
import { SocraticChat } from './components/SocraticChat';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { LoginSelection } from './components/LoginSelection';
import { FounderDashboard } from './components/FounderDashboard';
import { PlacementTest } from './components/PlacementTest';
import { UnitView } from './components/UnitView';
import { ValerieWidget } from './components/ValerieWidget';
import { PaymentFirewall } from './components/PaymentFirewall';
import { ParentDashboard } from './components/ParentDashboard';
import { StudentAccount } from './components/StudentAccount';
import { Billing } from './components/Billing';
import { FULL_CURRICULUM, UNITS } from './curriculum';
import { NGSSModule, UserState, UserRole, AccessPath, UserProfile, GradeLevel, Unit, TestResult, AppTab, StudentOverview } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const isProcessingPayment = useRef(false);
  const [appState, setAppState] = useState<UserState>({
    role: 'student',
    path: 'individual',
    isLoggedIn: false
  });
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<AppTab>('curriculum');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedModule, setSelectedModule] = useState<NGSSModule | null>(null);
  const [showPlacementPopup, setShowPlacementPopup] = useState(false);
  const [isTakingTest, setIsTakingTest] = useState<{ type: 'placement' | 'unit' | 'grade', target?: any } | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null);
  const [totalLearningSeconds, setTotalLearningSeconds] = useState(0);
  const [studentOverview, setStudentOverview] = useState<StudentOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            
            // Fetch test results
            const resultsSnap = await getDoc(doc(db, 'results', user.uid));
            let results: TestResult[] = [];
            if (resultsSnap.exists()) {
              results = resultsSnap.data().results || [];
              setTestResults(results);
            }

            // Fetch learning time stats
            try {
              const statsSnap = await getDoc(doc(db, 'stats', user.uid));
              if (statsSnap.exists()) {
                setTotalLearningSeconds(statsSnap.data().totalSeconds || 0);
              }
            } catch { /* stats are non-critical */ }

            setAppState({
              path: profileData.path,
              role: profileData.role,
              isLoggedIn: true,
              grade: profileData.grade,
              profile: profileData
            });
            
            setView('dashboard');

            // Parents land on the Student Progress (dashboard) tab and load linked student data
            if (profileData.role === 'parent') {
              setActiveTab('dashboard');
              loadStudentOverview(user.uid);
            }
            
            // Only show placement popup if student, first time, and has no results at all
            const hasExistingResults = results.length > 0;
            if (hasExistingResults) {
              setShowPlacementPopup(false);
              // Self-heal profile isFirstTime state if database had the stale flag
              if (profileData.isFirstTime) {
                profileData.isFirstTime = false;
                updateDoc(doc(db, 'users', user.uid), { isFirstTime: false }).catch(err => {
                  console.error("Failed to auto-cleanse isFirstTime state:", err);
                });
              }
            } else if (profileData.role === 'student' && profileData.isFirstTime) {
              setShowPlacementPopup(true);
            }
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setUser(null);
        setAppState({
          role: 'student',
          path: 'individual',
          isLoggedIn: false
        });
        setView('landing');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDismissPlacement = async () => {
    setShowPlacementPopup(false);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { isFirstTime: false });
        if (appState.profile) {
          setAppState(prev => ({
            ...prev,
            profile: prev.profile ? { ...prev.profile, isFirstTime: false } : undefined
          }));
        }
      } catch (err) {
        console.error("Error dismissing placement test:", err);
      }
    }
  };

  const handleLogin = (path: AccessPath, role: UserRole, details?: any) => {
    const profile: UserProfile = {
      uid: user?.uid || details?.uid || 'guest',
      name: details?.name || 'Guest User',
      username: details?.username || 'guest',
      email: details?.email || '',
      parentEmail: details?.parentEmail || null,
      linkedStudentUid: details?.linkedStudentUid || null,
      role,
      path,
      grade: details?.grade || (path === 'district' ? '6' : '3'),
      xp: details?.xp || 0,
      isFirstTime: details?.isFirstTime ?? true,
      isPaid: details?.isPaid ?? (path === 'district'),
      createdAt: details?.createdAt || new Date().toISOString()
    };

    setAppState({
      path,
      role,
      isLoggedIn: true,
      grade: profile.grade,
      profile
    });
    
    setView('dashboard');
    if (role === 'founder') {
      setActiveTab('founder');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setAppState({
        role: 'student',
        path: 'individual',
        isLoggedIn: false
      });
      setView('landing');
      setActiveTab('curriculum');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!appState.profile || isProcessingPayment.current) return;
    isProcessingPayment.current = true;

    const updatedProfile = { ...appState.profile, isPaid: true };
    
    // 1. Update Student Profile in Firestore
    try {
      await setDoc(doc(db, 'users', updatedProfile.uid), updatedProfile, { merge: true });
    } catch (err) {
      console.error("Error updating student profile:", err);
    }

    // 2. Dual-Provisioning: Create Parent Account via backend (Admin SDK)
    if (updatedProfile.parentEmail) {
      try {
        await fetch('/api/provision-parent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentUid: updatedProfile.uid,
            studentName: updatedProfile.name,
            parentEmail: updatedProfile.parentEmail,
            studentGrade: updatedProfile.grade
          })
        });
        console.log(`[DUAL-PROVISIONING] Parent provisioned for ${updatedProfile.parentEmail}`);
      } catch (err) {
        console.error("Error in parent provisioning:", err);
      }
    }

    setAppState(prev => ({
      ...prev,
      profile: updatedProfile
    }));

    if (updatedProfile.isFirstTime && updatedProfile.role === 'student' && testResults.length === 0) {
      setShowPlacementPopup(true);
    }
    
    // Reset guard after a delay to allow for state transition
    setTimeout(() => {
      isProcessingPayment.current = false;
    }, 5000);
  };

  const handleModuleSelect = (module: NGSSModule) => {
    setSelectedModule(module);
    setActiveTab('chat');
  };

  const handleTestComplete = async (score: number, gaps: string[]) => {
    const result: TestResult = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.uid || 'guest',
      type: isTakingTest?.type || 'placement',
      targetId: isTakingTest?.type === 'unit' ? isTakingTest.target.id : appState.grade,
      score,
      gaps,
      timestamp: new Date().toISOString()
    };

    const newResults = [...testResults, result];
    setTestResults(newResults);
    setLastTestResult(result);
    setIsTakingTest(null);
    setShowPlacementPopup(false);
    setActiveTab('dashboard');
    
    // Save results via backend (Admin SDK bypasses rules)
    if (user) {
      try {
        await fetch('/api/save-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, results: newResults })
        });
        await updateDoc(doc(db, 'users', user.uid), { isFirstTime: false });
        
        if (appState.profile) {
          handleUpdateProfile({ ...appState.profile, isFirstTime: false });
        }
      } catch (err) {
        console.error("Error saving test results or updating profile:", err);
      }
    }
  };

  const handleStartTest = (type: 'placement' | 'unit' | 'grade', target?: any) => {
    (window as any).currentTestTarget = target;
    (window as any).userGrade = appState.grade;
    setIsTakingTest({ type, target });
    setLastTestResult(null);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setAppState(prev => ({
      ...prev,
      profile: updatedProfile
    }));
  };

  const loadStudentOverview = async (parentUid: string) => {
    setOverviewLoading(true);
    try {
      const res = await fetch('/api/student-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUid })
      });
      if (res.ok) {
        const data = await res.json();
        setStudentOverview(data);
      } else {
        setStudentOverview(null);
      }
    } catch (err) {
      console.error("Error loading student overview:", err);
      setStudentOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUid: user.uid })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete the student account.');
      }
      // The parent account is removed along with the student; sign out.
      await handleLogout();
    } catch (err: any) {
      console.error("Delete student error:", err);
      throw err;
    }
  };

  const isGated = appState.profile?.role === 'student' && appState.path === 'individual' && !appState.profile?.isPaid;

  if (view === 'landing') {
    return <LandingPage onLoginClick={() => setView('login')} />;
  }

  if (view === 'login') {
    return <LoginSelection onBack={() => setView('landing')} onLogin={handleLogin} />;
  }

  if (isGated) {
    return <PaymentFirewall onPaymentSuccess={handlePaymentSuccess} onSkip={handlePaymentSuccess} />;
  }

  return (
    <Layout 
      activeTab={activeTab === 'founder' ? 'dashboard' : activeTab} 
      onTabChange={(tab) => { if (!showPlacementPopup) setActiveTab(tab as any); }}
      userState={appState}
      onLogout={handleLogout}
    >
      {showPlacementPopup && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white max-w-lg w-full rounded-[40px] p-12 text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-soft-pink/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Brain size={40} className="text-soft-pink" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Welcome to Valley Science!</h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Before you start, you need to take a quick placement test. This helps Valerie identify your conceptual gaps and build a personalized learning path just for you.
            </p>
            <p className="text-xs font-black text-soft-pink uppercase tracking-widest mb-10">Required to get started</p>
            <button 
              onClick={() => { setShowPlacementPopup(false); handleStartTest('placement'); }}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all"
            >
              Start Placement Test
            </button>
          </motion.div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {isTakingTest ? (
            <PlacementTest 
              module={isTakingTest.type === 'unit' ? null : selectedModule} 
              onComplete={handleTestComplete} 
              onCancel={() => setIsTakingTest(null)}
            />
          ) : lastTestResult ? (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white max-w-2xl w-full rounded-[40px] p-12 text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-sage-green/10 rounded-full flex items-center justify-center mx-auto mb-8 text-sage-green">
                  <ClipboardCheck size={40} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">{lastTestResult.score}%</h2>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Test Results</h3>
                <p className="text-slate-600 font-medium mb-8">
                  {lastTestResult.type === 'placement' ? 'Benchmark complete.' : 'Assessment complete.'} Valerie has updated your stats with {lastTestResult.gaps.length} identified gaps.
                </p>
                <div className="bg-slate-50 p-6 rounded-3xl text-left mb-8 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Identified Gaps</p>
                  <ul className="space-y-2">
                    {lastTestResult.gaps.map((gap, i) => (
                      <li key={i} className="text-sm font-bold text-slate-700 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-soft-pink rounded-full mt-1.5 shrink-0" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => setLastTestResult(null)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all"
                >
                  Continue to Learning Path
                </button>
              </motion.div>
            </div>
          ) : selectedUnit ? (
            <UnitView 
              unit={selectedUnit} 
              onBack={() => setSelectedUnit(null)} 
              onSelectModule={handleModuleSelect}
              onTakeUnitTest={(unit) => handleStartTest('unit', unit)}
            />
          ) : (
            <>
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="max-w-3xl">
                  <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-4 leading-tight">
                    {appState.path === 'district' ? 'District Curriculum' : `Grade ${appState.grade} Science`}
                  </h1>
                  <p className="text-xl text-slate-600 font-medium">
                    {appState.path === 'district' 
                      ? `Welcome back! Your teacher has unlocked the Grade ${appState.grade} units for you.` 
                      : `Exploring the core units for Grade ${appState.grade}. Select a unit to see its modules.`}
                  </p>
                </div>
                <button 
                  onClick={() => handleStartTest('grade')}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-soft-pink transition-all whitespace-nowrap"
                >
                  Take Grade Level Test <ArrowRight size={20} />
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {UNITS.filter(u => u.gradeLevel === appState.grade).map((unit, index) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedUnit(unit)}
                    className="group bg-white border-2 border-slate-100 rounded-[40px] p-10 hover:shadow-2xl hover:border-soft-pink transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-4 py-1.5 bg-cream text-slate-900 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-slate-100">
                        Unit {index + 1}
                      </span>
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-soft-pink group-hover:text-white transition-colors">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4 group-hover:text-soft-pink transition-colors">
                      {unit.title}
                    </h3>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                      {unit.description}
                    </p>
                    <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      {unit.modules.length} Modules • Unit Test Available
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <SocraticChat 
          selectedModule={selectedModule} 
          onBack={() => {
            setSelectedModule(null);
            setActiveTab('curriculum');
          }}
        />
      )}

      {activeTab === 'dashboard' && (
        appState.role === 'parent' ? (
          <ParentDashboard
            overview={studentOverview}
            loading={overviewLoading}
            onRefresh={() => user && loadStudentOverview(user.uid)}
          />
        ) : (
          <Dashboard results={testResults} userState={appState} totalLearningSeconds={totalLearningSeconds} />
        )
      )}

      {activeTab === 'student-account' && appState.role === 'parent' && (
        <StudentAccount
          overview={studentOverview}
          loading={overviewLoading}
          onDeleteStudent={handleDeleteStudent}
        />
      )}

      {activeTab === 'billing' && appState.role === 'parent' && (
        <Billing profile={appState.profile} />
      )}

      {activeTab === 'settings' && (
        <Settings userState={appState} onUpdateProfile={handleUpdateProfile} />
      )}

      {activeTab === 'founder' && (
        <FounderDashboard />
      )}

      <ValerieWidget />
    </Layout>
  );
}
