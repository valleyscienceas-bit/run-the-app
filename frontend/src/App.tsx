import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Brain, ClipboardCheck, ArrowRight } from 'lucide-react';
import { auth, onAuthStateChanged, signOut, User, db, doc, setDoc, getDoc, updateDoc } from './lib/firebase';
import { getMfaPending } from './lib/mfaSession';
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
import { PaymentFirewall } from './components/PaymentFirewall';
import { ParentDashboard } from './components/ParentDashboard';
import { TEXT_LINK_CLASS } from './lib/buttonStyles';
import { StudentAccount } from './components/StudentAccount';
import { Billing } from './components/Billing';
import { DemoGuide } from './components/DemoGuide';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SpotlightTour, PARENT_SPOTLIGHT_STEPS, STUDENT_SPOTLIGHT_STEPS, DISTRICT_STUDENT_SPOTLIGHT_STEPS, TEACHER_SPOTLIGHT_STEPS, MODULE_SPOTLIGHT_STEPS } from './components/SpotlightTour';
import { StudentClassTab } from './components/StudentClassTab';
import { StudentAssignmentsTab } from './components/StudentAssignmentsTab';
import { AssignmentsTab } from './components/AssignmentsTab';
import { ClassTestsTab } from './components/ClassTestsTab';
import { FULL_CURRICULUM, UNITS } from './curriculum';
import { NGSSModule, UserState, UserRole, AccessPath, UserProfile, GradeLevel, Unit, TestResult, AppTab, StudentOverview, TestAnswer } from './types';
import { loadThemePreference, applyTheme, saveThemePreference } from './lib/theme';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const isProcessingPayment = useRef(false);
  const [appState, setAppState] = useState<UserState>({
    role: 'student',
    path: 'individual',
    isLoggedIn: false
  });
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [resumeMfaLogin, setResumeMfaLogin] = useState(false);
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
  const [demoViewRole, setDemoViewRole] = useState<'student' | 'parent'>('student');
  const [showTour, setShowTour] = useState(false);
  const [showModuleTour, setShowModuleTour] = useState(false);
  const [tourRole, setTourRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [demoExpired, setDemoExpired] = useState(false);
  const [teacherStudents, setTeacherStudents] = useState<StudentOverview[]>([]);
  const [selectedTeacherStudentUid, setSelectedTeacherStudentUid] = useState('');
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; grade: string; studentCount: number }[]>([]);
  const [activeClassroomId, setActiveClassroomId] = useState<string | undefined>();
  const [activeStudentUid, setActiveStudentUid] = useState<string | undefined>();
  const [demoParentUid, setDemoParentUid] = useState<string | undefined>();
  const [teacherUnreadCount, setTeacherUnreadCount] = useState(0);
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);

  const [demoApprovalNotice, setDemoApprovalNotice] = useState<'approved' | 'already' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo');
    if (demoParam === 'approved' || demoParam === 'already') {
      setDemoApprovalNotice(demoParam);
      window.history.replaceState({}, '', window.location.pathname);
    }
    applyTheme(loadThemePreference());
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const pending = getMfaPending();
        if (pending && pending.uid === user.uid) {
          await signOut(auth);
          setResumeMfaLogin(true);
          setView('login');
          return;
        }

        setUser(user);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;

            applyTheme(loadThemePreference(profileData));
            if (profileData.theme) saveThemePreference(profileData.theme);

            // Demo expiry check
            if (profileData.isDemo && profileData.demoExpiresAt) {
              if (new Date(profileData.demoExpiresAt) < new Date()) {
                setDemoExpired(true);
                fetch('/api/demo-feedback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: profileData.email, uid: user.uid })
                }).catch(() => {});
                return;
              }
            }
            setDemoExpired(false);
            if (profileData.demoParentUid) setDemoParentUid(profileData.demoParentUid);
            
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

            if (profileData.isDemo) {
              setShowPlacementPopup(false);
              setDemoViewRole('student');
              if (!profileData.hasSeenDemoStudentGuide) {
                setActiveTab('demo-guide');
              } else {
                setActiveTab('curriculum');
              }
            } else if (profileData.role === 'parent') {
              setActiveTab('dashboard');
              loadStudentOverview(user.uid);
            }

            // Teacher: load classroom students
            if (profileData.role === 'teacher') {
              setActiveTab('dashboard');
              loadTeacherData(user.uid, profileData.classroomIds?.[0]);
            }

            // Admin: load district classrooms
            if (profileData.role === 'admin' && profileData.districtId) {
              setActiveTab('dashboard');
              loadAdminClassrooms(profileData.districtId);
            }

            if (profileData.isDemo) {
              setDemoViewRole('student');
              setActiveTab(profileData.hasSeenDemoStudentGuide ? 'curriculum' : 'demo-guide');
              setShowPlacementPopup(false);
            } else {
            // Onboarding tours (demo users start tours from Demo Guide instead)
            if (!profileData.isDemo) {
              if (profileData.role === 'parent' && !profileData.hasCompletedParentTour) {
                setTourRole('parent');
                setShowTour(true);
              } else if (profileData.role === 'teacher' && !profileData.hasCompletedTeacherTour) {
                setTourRole('teacher');
                setShowTour(true);
              } else if (profileData.role === 'student' && !profileData.hasCompletedStudentTour && results.length > 0) {
                setTourRole('student');
                setShowTour(true);
              }
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
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setUser(null);
        const pending = getMfaPending();
        if (pending) {
          setResumeMfaLogin(true);
          setView('login');
          return;
        }
        setResumeMfaLogin(false);
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
    setResumeMfaLogin(false);
    const isDistrictGuestEntry = path === 'district' && details?.isGuestEntry === true;
    const effectiveRole: UserRole = isDistrictGuestEntry ? 'student' : role;
    const profile: UserProfile = {
      uid: user?.uid || details?.uid || 'guest',
      name: details?.name || 'Guest User',
      username: details?.username || 'guest',
      email: details?.email || '',
      parentEmail: details?.parentEmail || null,
      linkedStudentUid: details?.linkedStudentUid || null,
      role: effectiveRole,
      path,
      grade: details?.grade || (path === 'district' ? '6' : '3'),
      xp: details?.xp || 0,
      isFirstTime: details?.isFirstTime ?? true,
      isPaid: details?.isPaid ?? (path === 'district'),
      createdAt: details?.createdAt || new Date().toISOString()
    };

    setAppState({
      path,
      role: effectiveRole,
      isLoggedIn: true,
      grade: profile.grade,
      profile
    });
    
    setView('dashboard');
    if (effectiveRole === 'founder') {
      setActiveTab('founder');
    }
  };

  const goToLanding = () => setView('landing');

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setAppState({
        role: 'student',
        path: 'individual',
        isLoggedIn: false
      });
      setActiveTab('curriculum');
      goToLanding();
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

  const handleTestComplete = async (score: number, gaps: string[], answers: TestAnswer[] = []) => {
    const result: TestResult = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.uid || 'guest',
      type: isTakingTest?.type || 'placement',
      targetId: isTakingTest?.type === 'unit' ? isTakingTest.target.id : appState.grade,
      score,
      gaps,
      timestamp: new Date().toISOString(),
      answers
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

        // Trigger student tour after first placement test (not for demo accounts)
        if (appState.profile && !appState.profile.hasCompletedStudentTour && !appState.profile.isDemo) {
          setTourRole('student');
          setShowTour(true);
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

  const loadStudentOverview = async (parentUid: string, studentUid?: string) => {
    setOverviewLoading(true);
    try {
      const res = await fetch('/api/student-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUid, studentUid })
      });
      if (res.ok) {
        const data = await res.json();
        setStudentOverview(data);
        if (data.activeStudentUid) setActiveStudentUid(data.activeStudentUid);
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

  const loadTeacherData = async (teacherUid: string, classroomId?: string) => {
    try {
      const classRes = await fetch('/api/teacher-classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid })
      });
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassrooms(classData.classrooms || []);
        const cid = classroomId || classData.classrooms?.[0]?.id;
        setActiveClassroomId(cid);
        if (cid) {
          const studRes = await fetch('/api/classroom-students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classroomId: cid })
          });
          if (studRes.ok) {
            const studData = await studRes.json();
            setTeacherStudents(studData.students || []);
          }
        }
        loadTeacherNotifications(teacherUid);
      }
    } catch (err) {
      console.error("Error loading teacher data:", err);
    }
  };

  const loadTeacherNotifications = async (teacherUid: string) => {
    try {
      const res = await fetch('/api/teacher-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid })
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error loading teacher notifications:", err);
    }
  };

  const loadStudentNotifications = async (studentUid: string) => {
    try {
      const res = await fetch('/api/student-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentUid })
      });
      if (res.ok) {
        const data = await res.json();
        setStudentUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error loading student notifications:", err);
    }
  };

  const loadAdminClassrooms = async (districtId: string) => {
    try {
      const res = await fetch('/api/admin-classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId })
      });
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || []);
      }
    } catch (err) {
      console.error("Error loading admin classrooms:", err);
    }
  };

  const handleSwitchStudent = (studentUid: string) => {
    setActiveStudentUid(studentUid);
    setStudentOverview(null);
    if (user) loadStudentOverview(user.uid, studentUid);
  };

  const handleModuleSelect = (module: NGSSModule) => {
    setSelectedModule(module);
    setActiveTab('chat');
    const tourKey = `vs-module-tour:${module.id}`;
    if (!localStorage.getItem(tourKey)) {
      setTimeout(() => setShowModuleTour(true), 400);
    }
  };

  useEffect(() => {
    if (activeTab !== 'chat') return;
    // #region agent log
    fetch('http://127.0.0.1:7887/ingest/9957fc9c-a7ba-454b-b31a-1e2b29b7ba3c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3efbc'},body:JSON.stringify({sessionId:'c3efbc',hypothesisId:'H1',location:'App.tsx:chat-tab',message:'chat tab activated',data:{activeTab,role:appState.role,hasModule:!!selectedModule},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [activeTab, appState.role, selectedModule]);

  useEffect(() => {
    if (appState.role !== 'teacher' || !user?.uid) return;
    loadTeacherNotifications(user.uid);
    const interval = setInterval(() => loadTeacherNotifications(user.uid), 30000);
    return () => clearInterval(interval);
  }, [appState.role, user?.uid, activeTab]);

  useEffect(() => {
    if (appState.role !== 'student' || appState.path !== 'district' || !user?.uid) return;
    loadStudentNotifications(user.uid);
    const interval = setInterval(() => loadStudentNotifications(user.uid), 30000);
    return () => clearInterval(interval);
  }, [appState.role, appState.path, user?.uid, activeTab]);

  const handleModuleTourComplete = () => {
    if (selectedModule) {
      localStorage.setItem(`vs-module-tour:${selectedModule.id}`, '1');
    }
    setShowModuleTour(false);
  };

  const handleAddStudent = async (data: { name: string; username: string; email: string; password: string; grade: GradeLevel }) => {
    if (!user) return;
    const res = await fetch('/api/parent-create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentUid: user.uid, ...data })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create student');
    }
    await loadStudentOverview(user.uid);
  };

  const handleGradeChange = async (studentUid: string, newGrade: GradeLevel) => {
    if (!user) return;
    const res = await fetch('/api/update-student-grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentUid: user.uid, studentUid, newGrade })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update grade');
    }
    await loadStudentOverview(user.uid, studentUid);
  };

  const handleTourComplete = async () => {
    setShowTour(false);
    if (!user || !appState.profile) return;
    const field = tourRole === 'parent'
      ? 'hasCompletedParentTour'
      : tourRole === 'teacher'
      ? 'hasCompletedTeacherTour'
      : 'hasCompletedStudentTour';
    try {
      await updateDoc(doc(db, 'users', user.uid), { [field]: true });
      handleUpdateProfile({ ...appState.profile, [field]: true });
    } catch (err) {
      console.error("Tour completion save error:", err);
    }
  };

  const handleDemoRoleSwitch = (role: 'student' | 'parent') => {
    setDemoViewRole(role);
    if (role === 'parent' && demoParentUid && user) {
      loadStudentOverview(demoParentUid);
    }
    const profile = appState.profile;
    if (role === 'parent') {
      setActiveTab(profile?.hasSeenDemoParentGuide ? 'dashboard' : 'demo-guide');
    } else {
      setActiveTab(profile?.hasSeenDemoStudentGuide ? 'curriculum' : 'demo-guide');
    }
  };

  const handleDemoStartTour = () => {
    setTourRole(demoViewRole);
    setShowTour(true);
  };

  const markDemoGuideSeen = async (role: 'student' | 'parent') => {
    if (!user || !appState.profile?.isDemo) return;
    const field = role === 'parent' ? 'hasSeenDemoParentGuide' : 'hasSeenDemoStudentGuide';
    if (appState.profile[field]) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { [field]: true });
      handleUpdateProfile({ ...appState.profile, [field]: true });
    } catch (err) {
      console.error('Failed to mark demo guide seen:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'demo-guide' && appState.profile?.isDemo) {
      markDemoGuideSeen(demoViewRole);
    }
  }, [activeTab, demoViewRole, appState.profile?.isDemo, appState.profile?.hasSeenDemoStudentGuide, appState.profile?.hasSeenDemoParentGuide]);

  const isDemo = appState.profile?.isDemo === true;
  const effectiveRole: UserRole = isDemo
    ? (demoViewRole === 'parent' ? 'parent' : 'student')
    : appState.role;
  const layoutUserState: UserState = { ...appState, role: effectiveRole };
  const effectiveParentUid = isDemo && demoViewRole === 'parent' && demoParentUid ? demoParentUid : user?.uid;

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

  const isGated = appState.profile?.role === 'student' && appState.path === 'individual' && !appState.profile?.isPaid && !appState.profile?.isDemo;
  const tourActive = showTour || showModuleTour;

  if (demoExpired) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-8">
        <div className="bg-white max-w-lg w-full rounded-[40px] p-12 text-center shadow-2xl border border-slate-100">
          <h2 className="text-3xl font-black text-slate-900 mb-4">Demo Ended</h2>
          <p className="text-slate-600 font-medium mb-8 leading-relaxed">
            Your 48-hour demo access has expired. We'd love to hear your feedback, and you can sign up anytime for full access at $8/month or $90/year.
          </p>
          <button onClick={() => { setDemoExpired(false); handleLogout(); }} className={`w-full ${TEXT_LINK_CLASS} py-3 mb-4 hover:text-soft-pink dark:hover:text-soft-pink`}>
            Back to Home
          </button>
          <a href="#how-it-works" onClick={() => { setDemoExpired(false); handleLogout(); }} className="text-sm font-bold text-soft-pink hover:underline">
            Learn more about Valley Science
          </a>
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLoginClick={() => { setAuthMode('login'); setView('login'); }}
        onSignUpClick={() => { setAuthMode('signup'); setView('login'); }}
        demoApprovalNotice={demoApprovalNotice}
        onDismissDemoNotice={() => setDemoApprovalNotice(null)}
      />
    );
  }

  if (view === 'login') {
    return <LoginSelection initialMode={authMode} resumeMfaLogin={resumeMfaLogin} onBack={goToLanding} onLogin={handleLogin} />;
  }

  if (isGated) {
    return <PaymentFirewall onPaymentSuccess={handlePaymentSuccess} onSkip={handlePaymentSuccess} />;
  }

  return (
    <Layout 
      activeTab={activeTab === 'founder' ? 'dashboard' : activeTab} 
      onTabChange={(tab) => { if (!showPlacementPopup || tourActive) setActiveTab(tab); }}
      userState={layoutUserState}
      onLogout={handleLogout}
      isDemo={isDemo}
      demoViewRole={demoViewRole}
      onDemoRoleSwitch={handleDemoRoleSwitch}
      teacherUnreadCount={appState.role === 'teacher' ? teacherUnreadCount : 0}
      studentUnreadCount={appState.role === 'student' && appState.path === 'district' ? studentUnreadCount : 0}
    >
      {showTour && (
        <SpotlightTour
          steps={
            tourRole === 'parent'
              ? PARENT_SPOTLIGHT_STEPS.filter(s => s.target !== '[data-tour="parent-student-switcher"]' || (studentOverview?.linkedStudents?.length || 0) > 1)
              : tourRole === 'teacher'
              ? TEACHER_SPOTLIGHT_STEPS
              : [
                  ...STUDENT_SPOTLIGHT_STEPS,
                  ...(appState.path === 'district' ? DISTRICT_STUDENT_SPOTLIGHT_STEPS : []),
                ]
          }
          onComplete={handleTourComplete}
          onDismiss={() => setShowTour(false)}
          onNavigateTab={(tab) => { if (!showPlacementPopup || tourActive) setActiveTab(tab); }}
        />
      )}
      {showModuleTour && effectiveRole === 'student' && (
        <SpotlightTour
          steps={MODULE_SPOTLIGHT_STEPS}
          onComplete={handleModuleTourComplete}
          onDismiss={handleModuleTourComplete}
          onNavigateTab={(tab) => { if (!showPlacementPopup || tourActive) setActiveTab(tab); }}
        />
      )}
      {showPlacementPopup && !tourActive && (
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

      {activeTab === 'curriculum' && effectiveRole === 'student' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {isTakingTest ? (
            <PlacementTest 
              module={isTakingTest.type === 'unit' ? null : selectedModule} 
              onComplete={handleTestComplete} 
              onCancel={() => setIsTakingTest(null)}
            />
          ) : lastTestResult && !tourActive ? (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-tour="curriculum-units">
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

      {activeTab === 'chat' && effectiveRole === 'student' && (
        <SocraticChat 
          selectedModule={selectedModule} 
          onBack={() => {
            setSelectedModule(null);
            setActiveTab('curriculum');
          }}
        />
      )}

      {activeTab === 'dashboard' && (
        effectiveRole === 'parent' ? (
          <ParentDashboard
            overview={studentOverview}
            loading={overviewLoading}
            onRefresh={() => effectiveParentUid && loadStudentOverview(effectiveParentUid, activeStudentUid)}
            onSwitchStudent={handleSwitchStudent}
          />
        ) : appState.role === 'teacher' ? (
          <TeacherDashboard
            students={teacherStudents}
            teacherUid={user?.uid}
            classroomId={activeClassroomId}
            selectedOverview={selectedTeacherStudentUid ? teacherStudents.find(s => s.studentProfile?.uid === selectedTeacherStudentUid) || null : null}
            onSelectStudent={setSelectedTeacherStudentUid}
            onRefresh={() => user && activeClassroomId && loadTeacherData(user.uid, activeClassroomId)}
            onNotificationsChange={(count) => {
              setTeacherUnreadCount(count);
              if (user) loadTeacherNotifications(user.uid);
            }}
          />
        ) : appState.role === 'admin' ? (
          <AdminDashboard
            classrooms={classrooms}
            onSelectClassroom={(id) => setActiveClassroomId(id)}
          />
        ) : (
          <Dashboard results={testResults} userState={appState} totalLearningSeconds={totalLearningSeconds} />
        )
      )}

      {activeTab === 'demo-guide' && isDemo && (
        <DemoGuide
          demoViewRole={demoViewRole}
          onStartTour={handleDemoStartTour}
          showTourButton={
            demoViewRole === 'parent'
              ? !appState.profile?.hasCompletedParentTour
              : !appState.profile?.hasCompletedStudentTour
          }
        />
      )}

      {activeTab === 'assignments' && appState.role === 'teacher' && (
        <AssignmentsTab
          classroomId={activeClassroomId}
          fallbackClassroomId={appState.profile?.classroomIds?.[0]}
          teacherUid={user?.uid}
        />
      )}

      {activeTab === 'class-tests' && appState.role === 'teacher' && (
        <ClassTestsTab classroomId={activeClassroomId} />
      )}

      {activeTab === 'my-class' && effectiveRole === 'student' && appState.path === 'district' && (
        <StudentClassTab
          studentUid={user?.uid}
          unreadCount={studentUnreadCount}
          onUnreadChange={(count) => {
            setStudentUnreadCount(count);
            if (user) loadStudentNotifications(user.uid);
          }}
        />
      )}

      {activeTab === 'my-assignments' && effectiveRole === 'student' && appState.path === 'district' && (
        <StudentAssignmentsTab studentUid={user?.uid} />
      )}

      {activeTab === 'student-account' && effectiveRole === 'parent' && user && (
        <StudentAccount
          overview={studentOverview}
          loading={overviewLoading}
          parentUid={effectiveParentUid || user.uid}
          onDeleteStudent={handleDeleteStudent}
          onSwitchStudent={handleSwitchStudent}
          onAddStudent={handleAddStudent}
          onGradeChange={handleGradeChange}
        />
      )}

      {activeTab === 'billing' && effectiveRole === 'parent' && (
        <Billing profile={appState.profile} linkedStudents={studentOverview?.linkedStudents} />
      )}

      {activeTab === 'settings' && (
        <Settings
          userState={appState}
          onUpdateProfile={handleUpdateProfile}
          onReplayTour={() => {
            if (isDemo) setTourRole(demoViewRole);
            else if (appState.role === 'parent') setTourRole('parent');
            else if (appState.role === 'teacher') setTourRole('teacher');
            else setTourRole('student');
            setShowTour(true);
          }}
        />
      )}

      {activeTab === 'founder' && user && (
        <FounderDashboard founderUid={user.uid} />
      )}
    </Layout>
  );
}
