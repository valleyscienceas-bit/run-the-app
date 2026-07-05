import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AppTab } from '../types';
import { TOUR_BACK_BUTTON_CLASS } from '../lib/buttonStyles';

export interface SpotlightStep {
  title: string;
  body: string;
  /** CSS selector for element to highlight, e.g. `[data-tour="nav-curriculum"]` */
  target?: string;
  /** Switch to this tab before highlighting */
  tab?: AppTab;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightTourProps {
  steps: SpotlightStep[];
  onComplete: () => void;
  onDismiss: () => void;
  onNavigateTab?: (tab: AppTab) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipLayout {
  placement: 'top' | 'bottom' | 'left' | 'right';
  top: number;
  left: number;
}

const TOOLTIP_ESTIMATE = { width: 360, height: 280 };
const VIEWPORT_MARGIN = 16;

function computeTooltipLayout(
  targetRect: Rect,
  tooltipSize: { width: number; height: number },
  preferred: 'top' | 'bottom' | 'left' | 'right',
  pad: number,
): TooltipLayout {
  const gap = pad + 12;
  const { width: tw, height: th } = tooltipSize;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceBelow = vh - (targetRect.top + targetRect.height + gap);
  const spaceAbove = targetRect.top - gap;
  const spaceRight = vw - (targetRect.left + targetRect.width + gap);
  const spaceLeft = targetRect.left - gap;

  let placement = preferred;
  if (preferred === 'bottom' && spaceBelow < th + VIEWPORT_MARGIN && spaceAbove >= th + VIEWPORT_MARGIN) {
    placement = 'top';
  } else if (preferred === 'top' && spaceAbove < th + VIEWPORT_MARGIN && spaceBelow >= th + VIEWPORT_MARGIN) {
    placement = 'bottom';
  } else if (preferred === 'right' && spaceRight < tw + VIEWPORT_MARGIN && spaceLeft >= tw + VIEWPORT_MARGIN) {
    placement = 'left';
  } else if (preferred === 'left' && spaceLeft < tw + VIEWPORT_MARGIN && spaceRight >= tw + VIEWPORT_MARGIN) {
    placement = 'right';
  }

  let top: number;
  let left: number;

  if (placement === 'bottom') {
    top = targetRect.top + targetRect.height + gap;
    left = targetRect.left;
  } else if (placement === 'top') {
    top = targetRect.top - gap - th;
    left = targetRect.left;
  } else if (placement === 'right') {
    top = targetRect.top;
    left = targetRect.left + targetRect.width + gap;
  } else {
    top = targetRect.top;
    left = targetRect.left - gap - tw;
  }

  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - th - VIEWPORT_MARGIN));
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - tw - VIEWPORT_MARGIN));

  return { placement, top, left };
}

export function SpotlightTour({ steps, onComplete, onDismiss, onNavigateTab }: SpotlightTourProps) {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipLayout, setTooltipLayout] = useState<TooltipLayout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const measureTarget = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.target]);

  useLayoutEffect(() => {
    if (step.tab && onNavigateTab) {
      onNavigateTab(step.tab);
    }
    // Retry measuring so tab switches and late-rendered panels are not skipped
    const delays = step.tab ? [80, 350, 700, 1200] : [50, 200, 500];
    const timers = delays.map(ms => setTimeout(measureTarget, ms));
    return () => timers.forEach(clearTimeout);
  }, [index, step.tab, step.target, onNavigateTab, measureTarget]);

  useEffect(() => {
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [measureTarget]);

  const pad = 8;
  const preferredPlacement = step.placement || 'bottom';

  useLayoutEffect(() => {
    if (!targetRect) {
      setTooltipLayout(null);
      return;
    }
    const tooltipEl = tooltipRef.current;
    const tooltipSize = tooltipEl
      ? { width: tooltipEl.offsetWidth, height: tooltipEl.offsetHeight }
      : TOOLTIP_ESTIMATE;
    setTooltipLayout(computeTooltipLayout(targetRect, tooltipSize, preferredPlacement, pad));
  }, [targetRect, preferredPlacement, index]);

  const placement = tooltipLayout?.placement ?? preferredPlacement;

  let tooltipStyle: React.CSSProperties = { position: 'fixed', zIndex: 201, maxWidth: 360 };
  if (targetRect && tooltipLayout) {
    tooltipStyle = { ...tooltipStyle, top: tooltipLayout.top, left: tooltipLayout.left };
  } else if (targetRect) {
    const fallback = computeTooltipLayout(targetRect, TOOLTIP_ESTIMATE, preferredPlacement, pad);
    tooltipStyle = { ...tooltipStyle, top: fallback.top, left: fallback.left };
  } else {
    tooltipStyle = { ...tooltipStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Dim overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - pad}
                y={targetRect.top - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(15,23,42,0.65)" mask="url(#spotlight-mask)" />
      </svg>

      {/* Highlight ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none border-2 border-soft-pink rounded-2xl shadow-[0_0_0_4px_rgba(250,218,221,0.3)]"
          style={{
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            zIndex: 200,
          }}
        />
      )}

      {/* Tooltip card */}
      <div ref={tooltipRef} style={tooltipStyle} className="relative bg-white dark:bg-slate-800 w-full max-w-sm rounded-[28px] shadow-2xl p-7 border border-slate-100 dark:border-slate-700 pointer-events-auto">
        <button onClick={onDismiss} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300">
          <X size={20} />
        </button>
        {targetRect && (
          <div
            className="absolute w-3 h-3 bg-white dark:bg-slate-800 border-soft-pink rotate-45"
            style={
              placement === 'bottom'
                ? { top: -6, left: 24, borderTop: '2px solid', borderLeft: '2px solid', borderColor: 'rgb(250 218 221)' }
                : placement === 'top'
                ? { bottom: -6, left: 24, borderBottom: '2px solid', borderRight: '2px solid', borderColor: 'rgb(250 218 221)' }
                : { display: 'none' }
            }
          />
        )}
        <p className="text-xs font-black text-soft-pink uppercase tracking-widest mb-2">Step {index + 1} of {steps.length}</p>
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">{step.title}</h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{step.body}</p>
        {step.target && !targetRect && (
          <p className="text-xs font-bold text-slate-400 mb-4">
            This control may appear once you have data or the right account setup — the tip still applies.
          </p>
        )}
        <div className="flex gap-2">
          {index > 0 && (
            <button onClick={() => setIndex(i => i - 1)} className={TOUR_BACK_BUTTON_CLASS}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            onClick={() => (isLast ? onComplete() : setIndex(i => i + 1))}
            className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1"
          >
            {isLast ? 'Finish' : <>Next <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

export const PARENT_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'Welcome, Parent', body: 'This guided tour walks through every part of your parent account: progress monitoring, student management, billing, settings, and how to sign out safely.', placement: 'bottom' },
  { title: 'Student Progress', body: 'Open Student Progress anytime from the sidebar. This is your home base for scores, learning time, and conceptual gaps for the child you are viewing.', target: '[data-tour="nav-dashboard"]', tab: 'dashboard', placement: 'right' },
  { title: 'Switch Students', body: 'If you manage more than one child, use this switcher to change who you are viewing. Charts and stats update for that student only.', target: '[data-tour="parent-student-switcher"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Stat Cards', body: 'These cards summarize time learning, tests completed, average score, and concepts to revisit. Click any card for a detailed breakdown.', target: '[data-tour="parent-stat-cards"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Performance Chart', body: 'This chart shows test scores over time. Hover a bar for the exact score. Green bars are strong; warmer colors mean room to grow.', target: '[data-tour="parent-performance-chart"]', tab: 'dashboard', placement: 'top' },
  { title: 'Test Details', body: 'Expand any past test to see each question, what your child answered, and which topics were missed — useful for conversations at home.', target: '[data-tour="parent-test-details"]', tab: 'dashboard', placement: 'top' },
  { title: 'Student Account', body: 'Open Student Account to manage profiles: add another student, change grade level, or remove an account you no longer need.', target: '[data-tour="nav-student-account"]', tab: 'student-account', placement: 'right' },
  { title: 'Grade Level', body: 'Change grade here when your child moves up. Progress for the previous grade is saved and can be restored if you switch back.', target: '[data-tour="parent-grade-select"]', tab: 'student-account', placement: 'bottom' },
  { title: 'Billing', body: 'Billing lists each child\'s plan separately ($8/mo or $90/yr). Open it to check status and renewal details.', target: '[data-tour="nav-billing"]', tab: 'billing', placement: 'right' },
  { title: 'Billing Cards', body: 'Each card is one student\'s subscription: active or free, renewal date, and upgrade controls when available.', target: '[data-tour="parent-billing-cards"]', tab: 'billing', placement: 'bottom' },
  { title: 'Settings', body: 'Settings holds your profile, password, appearance, optional two-factor authentication, and a button to replay this tour.', target: '[data-tour="nav-settings"]', tab: 'settings', placement: 'right' },
  { title: 'Profile', body: 'Your email stays fixed for security. On individual plans you can update your display username here.', target: '[data-tour="settings-profile"]', tab: 'settings', placement: 'bottom' },
  { title: 'Password', body: 'Set a new password anytime. Enter it twice to confirm. Use a unique password you do not reuse elsewhere.', target: '[data-tour="settings-password"]', tab: 'settings', placement: 'bottom' },
  { title: 'Appearance & Tour', body: 'Toggle light or dark mode, and use Replay Tour whenever you want this walkthrough again.', target: '[data-tour="settings-appearance"]', tab: 'settings', placement: 'top' },
  { title: 'Your Account Footer', body: 'At the bottom of the sidebar you will always see which account type you are on and your username.', target: '[data-tour="nav-account-footer"]', tab: 'settings', placement: 'top' },
  { title: 'Log Out', body: 'Use Log Out when you finish. It is always visible at the bottom of the sidebar so you can leave the account securely.', target: '[data-tour="nav-logout"]', tab: 'settings', placement: 'top' },
];

export const STUDENT_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'Welcome, Student', body: 'This tour covers your full account: curriculum, Valerie in the Socratic Lab, stats, gaps you can repair, settings, and how to log out.', placement: 'bottom' },
  { title: 'Curriculum', body: 'Curriculum is your science library. Open it to browse every unit for your grade and start modules when you are ready.', target: '[data-tour="nav-curriculum"]', tab: 'curriculum', placement: 'right' },
  { title: 'Grade Units', body: 'Each card is one unit. Click a unit to see its modules. When you feel ready, take the unit test from inside the unit.', target: '[data-tour="curriculum-units"]', tab: 'curriculum', placement: 'bottom' },
  { title: 'Socratic Lab', body: 'Socratic Lab is where you talk with Valerie. She asks guiding questions instead of giving answers, so you build real understanding.', target: '[data-tour="nav-chat"]', tab: 'chat', placement: 'right' },
  { title: 'Your Stats', body: 'Stats Page tracks scores, learning time, streaks, and conceptual gaps. Visit it after tests to see how you are growing.', target: '[data-tour="nav-dashboard"]', tab: 'dashboard', placement: 'right' },
  { title: 'Continue Learning', body: 'When you have history, this card helps you resume your last module, reopen chat, or jump to the next gap to repair.', target: '[data-tour="student-continue-card"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Stat Cards', body: 'Tap any card for details: test history, time spent, averages, streaks, and lists of gaps. Nothing here is graded in real time — it is feedback for you.', target: '[data-tour="student-stat-cards"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Performance Chart', body: 'Bars show each test score over time. Green is strong; pink and orange mean those topics need more practice with Valerie.', target: '[data-tour="student-performance-chart"]', tab: 'dashboard', placement: 'top' },
  { title: 'Conceptual Gaps', body: 'Open gaps are topics to keep practicing. Closed gaps turn green when later tests show improvement. Use Repair on an open gap to jump into a matching module.', target: '[data-tour="student-gaps-panel"]', tab: 'dashboard', placement: 'left' },
  { title: 'Settings', body: 'Settings is where you update your password, switch light/dark mode, manage optional 2FA, and replay this tour.', target: '[data-tour="nav-settings"]', tab: 'settings', placement: 'right' },
  { title: 'Profile', body: 'Your email is shown here for your account. Keep it accurate so password resets and security codes reach you.', target: '[data-tour="settings-profile"]', tab: 'settings', placement: 'bottom' },
  { title: 'Password', body: 'Change your password here anytime. Enter the new password twice. Never share it with classmates.', target: '[data-tour="settings-password"]', tab: 'settings', placement: 'bottom' },
  { title: 'Appearance & Tour', body: 'Toggle appearance and use Replay Tour if you want this walkthrough again later.', target: '[data-tour="settings-appearance"]', tab: 'settings', placement: 'top' },
  { title: 'Log Out', body: 'When you are done, use Log Out at the bottom of the sidebar so the next person cannot use your account.', target: '[data-tour="nav-logout"]', tab: 'settings', placement: 'top' },
];

export const DISTRICT_STUDENT_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'My Class', body: 'My Class shows your district section: classmates and a place to message your teacher when you need help.', target: '[data-tour="nav-my-class"]', tab: 'my-class', placement: 'right' },
  { title: 'Classmates', body: 'Everyone enrolled in your section appears here with usernames and grades so you know who is learning with you.', target: '[data-tour="student-class-list"]', tab: 'my-class', placement: 'bottom' },
  { title: 'Ask Your Teacher', body: 'Use Ask Teacher when you are stuck on assigned work. Your teacher sees the thread and can reply from their dashboard.', target: '[data-tour="student-ask-teacher"]', tab: 'my-class', placement: 'bottom' },
  { title: 'My Assignments', body: 'My Assignments lists work your teacher assigned. The full curriculum is still under Curriculum if you want to explore more.', target: '[data-tour="nav-my-assignments"]', tab: 'my-assignments', placement: 'right' },
  { title: 'Assigned Work', body: 'Each card shows the title, due date, and progress. Use Start or Continue to open the linked module and work with Valerie.', target: '[data-tour="student-assigned-list"]', tab: 'my-assignments', placement: 'bottom' },
];

export const TEACHER_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'Welcome, Teacher', body: 'This tour covers your class roster, student progress, assignments, class-wide tests, settings, export tools, and logging out.', placement: 'bottom' },
  { title: 'My Class', body: 'My Class is your roster dashboard: scores, learning time, open gaps, passwords for sandbox accounts, and per-student detail.', target: '[data-tour="nav-dashboard"]', tab: 'dashboard', placement: 'right' },
  { title: 'Export Class Data', body: 'Download a CSV of scores, time, and open gaps for your class — useful for gradebooks and conferences.', target: '[data-tour="teacher-export-csv"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Class Table', body: 'Scroll the roster and click any row for full progress and password controls. Columns summarize averages, tests, time, and gaps at a glance.', target: '[data-tour="teacher-class-table"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Student Questions', body: 'When students ask for help, threads appear here so you can reply without leaving Valley Science.', target: '[data-tour="teacher-questions"]', tab: 'dashboard', placement: 'top' },
  { title: 'Assignments', body: 'Create module assignments, choose due dates, and track who has started, is in progress, or turned work in.', target: '[data-tour="nav-assignments"]', tab: 'assignments', placement: 'right' },
  { title: 'Assignment List', body: 'Current and past assignments are separated. Open one for per-student progress, or delete an assignment you no longer need.', target: '[data-tour="teacher-assignments-list"]', tab: 'assignments', placement: 'bottom' },
  { title: 'Class Tests', body: 'Class Tests shows section-wide analytics: averages and questions students miss most often.', target: '[data-tour="nav-class-tests"]', tab: 'class-tests', placement: 'right' },
  { title: 'Settings', body: 'Update your password, appearance, optional 2FA, and replay this tour from Settings.', target: '[data-tour="nav-settings"]', tab: 'settings', placement: 'right' },
  { title: 'Profile', body: 'Confirm your account email and username here.', target: '[data-tour="settings-profile"]', tab: 'settings', placement: 'bottom' },
  { title: 'Password', body: 'Change your teacher password here. Use a strong unique password for classroom accounts.', target: '[data-tour="settings-password"]', tab: 'settings', placement: 'bottom' },
  { title: 'Appearance & Tour', body: 'Toggle light/dark mode and replay the account tour whenever you need a refresher.', target: '[data-tour="settings-appearance"]', tab: 'settings', placement: 'top' },
  { title: 'Log Out', body: 'Log Out is always at the bottom of the sidebar. Use it on shared devices so students cannot access your teacher tools.', target: '[data-tour="nav-logout"]', tab: 'settings', placement: 'top' },
];

/**
 * First-time module / Socratic Lab tour.
 * Keep these data-tour hooks stable — add new steps here as module UI ships.
 */
export const MODULE_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'You opened a module', body: 'Each module focuses on one science idea. You are in the Socratic Lab, where Valerie helps you build a mental model through conversation.', target: '[data-tour="chat-header"]', tab: 'chat', placement: 'bottom' },
  { title: 'Module badge', body: 'When a module is selected, its NGSS code appears in the header so you always know which standard you are working on.', target: '[data-tour="chat-header"]', tab: 'chat', placement: 'bottom' },
  { title: 'Conversation thread', body: 'Valerie\'s questions and your replies appear here. Read carefully — each question is meant to stretch your thinking, not trap you.', target: '[data-tour="chat-messages"]', tab: 'chat', placement: 'top' },
  { title: 'Your response', body: 'Type what you think, even if you are unsure. Press Send. Valerie will follow up with another question or a gentle hint if you are stuck.', target: '[data-tour="chat-input"]', tab: 'chat', placement: 'top' },
  { title: 'If something fails', body: 'If Valerie cannot reply, you will see a clear error and a Retry button. Your message is kept so you do not lose your thought.', target: '[data-tour="chat-messages"]', tab: 'chat', placement: 'top' },
  { title: 'Leave the module', body: 'Use Back when you are done for now. Your chat history is saved so you can continue later from Stats or Curriculum.', target: '[data-tour="chat-back"]', tab: 'chat', placement: 'bottom' },
  // Future module surfaces (targets may be absent until modules ship — tour still shows the tip)
  { title: 'Module overview (coming soon)', body: 'Future modules will show goals, key vocabulary, and the conceptual gap this lesson repairs — look for a module overview panel here.', target: '[data-tour="module-overview"]', tab: 'chat', placement: 'bottom' },
  { title: 'Practice check (coming soon)', body: 'Short practice checks will appear here so you can verify understanding before moving on.', target: '[data-tour="module-practice"]', tab: 'chat', placement: 'bottom' },
];
