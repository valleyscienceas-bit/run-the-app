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
    const t = setTimeout(measureTarget, step.tab ? 350 : 50);
    return () => clearTimeout(t);
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
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{step.body}</p>
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
  { title: 'Welcome, Parent', body: 'This tour walks through every part of your account — progress, billing, student management, and settings.', placement: 'bottom' },
  { title: 'Student Progress', body: 'Your home base. See test scores, learning time, and gaps for whichever child you have selected.', target: '[data-tour="nav-dashboard"]', tab: 'dashboard', placement: 'right' },
  { title: 'Switch Students', body: 'If you have more than one child, pick who you\'re viewing here. Stats update instantly for that student only.', target: '[data-tour="parent-student-switcher"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Stat Cards', body: 'Tap any stat card to drill in — test lists, score breakdowns, or concepts your child still needs to revisit.', target: '[data-tour="parent-stat-cards"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Performance Chart', body: 'This chart tracks test scores over time. Hover any bar to see the exact score.', target: '[data-tour="parent-performance-chart"]', tab: 'dashboard', placement: 'top' },
  { title: 'Test Details', body: 'Expand any test to see each question, what your child answered, and which topics were missed.', target: '[data-tour="parent-test-details"]', tab: 'dashboard', placement: 'top' },
  { title: 'Student Account', body: 'Manage profiles, change grade level, add another student, or delete an account.', target: '[data-tour="nav-student-account"]', tab: 'student-account', placement: 'right' },
  { title: 'Grade Level', body: 'Change your child\'s grade here. They won\'t access the old grade\'s curriculum until you switch back — but all progress is saved.', target: '[data-tour="parent-grade-select"]', tab: 'student-account', placement: 'bottom' },
  { title: 'Billing', body: 'Each student has their own subscription ($8/mo or $90/yr). You\'ll see one bill per child here.', target: '[data-tour="nav-billing"]', tab: 'billing', placement: 'right' },
  { title: 'Billing Cards', body: 'Each card is one child\'s plan — status, renewal date, and auto-renew controls.', target: '[data-tour="parent-billing-cards"]', tab: 'billing', placement: 'bottom' },
  { title: 'Settings', body: 'Change your password, toggle dark mode, or replay this tour anytime.', target: '[data-tour="nav-settings"]', tab: 'settings', placement: 'right' },
  { title: 'Profile', body: 'Your email is fixed for security. Update your display username here if you\'re on an individual plan.', target: '[data-tour="settings-profile"]', tab: 'settings', placement: 'bottom' },
  { title: 'Password', body: 'Set a new password anytime. You\'ll need to enter it twice to confirm.', target: '[data-tour="settings-password"]', tab: 'settings', placement: 'bottom' },
  { title: 'Appearance', body: 'Switch between light and dark mode, or replay this guided tour whenever you need a refresher.', target: '[data-tour="settings-appearance"]', tab: 'settings', placement: 'top' },
];

export const STUDENT_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'Welcome, Student', body: 'Let\'s walk through your whole account — curriculum, Valerie, stats, and settings.', placement: 'bottom' },
  { title: 'Curriculum', body: 'Your full science library lives here. Every unit and module for your grade — explore freely.', target: '[data-tour="nav-curriculum"]', tab: 'curriculum', placement: 'right' },
  { title: 'Grade Units', body: 'Each card is a unit. Click one to see its modules and take the unit test when you\'re ready.', target: '[data-tour="curriculum-units"]', tab: 'curriculum', placement: 'bottom' },
  { title: 'Socratic Lab', body: 'Talk to Valerie here. She asks questions — never direct answers — to help you think through science.', target: '[data-tour="nav-chat"]', tab: 'chat', placement: 'right' },
  { title: 'Your Stats', body: 'Track scores, learning time, streaks, and gaps. Tap any stat card for a detailed breakdown.', target: '[data-tour="nav-dashboard"]', tab: 'dashboard', placement: 'right' },
  { title: 'Stat Cards', body: 'Click any card to see test history, gap lists, and what you got wrong on each question.', target: '[data-tour="student-stat-cards"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Performance Chart', body: 'Your test scores over time. Green bars are strong scores; pink and orange mean room to grow.', target: '[data-tour="student-performance-chart"]', tab: 'dashboard', placement: 'top' },
  { title: 'Conceptual Gaps', body: 'Topics Valerie identified from your tests. Closed gaps turn green as you master them.', target: '[data-tour="student-gaps-panel"]', tab: 'dashboard', placement: 'left' },
  { title: 'Settings', body: 'Change your password, switch dark mode, or replay this tour.', target: '[data-tour="nav-settings"]', tab: 'settings', placement: 'right' },
  { title: 'Profile & Security', body: 'View your email and update your password here.', target: '[data-tour="settings-profile"]', tab: 'settings', placement: 'bottom' },
  { title: 'Appearance', body: 'Toggle light or dark mode and replay the account tour anytime.', target: '[data-tour="settings-appearance"]', tab: 'settings', placement: 'top' },
];

export const DISTRICT_STUDENT_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'My Class', body: 'See who else is in your district class — classmates, usernames, and grades.', target: '[data-tour="nav-my-class"]', tab: 'my-class', placement: 'right' },
  { title: 'Classmates', body: 'Everyone enrolled in your section appears here.', target: '[data-tour="student-class-list"]', tab: 'my-class', placement: 'bottom' },
  { title: 'My Assignments', body: 'Work your teacher assigned specifically. The full curriculum is still under Curriculum.', target: '[data-tour="nav-my-assignments"]', tab: 'my-assignments', placement: 'right' },
  { title: 'Assigned Work', body: 'Track due dates, progress bars, and whether you\'ve turned each assignment in.', target: '[data-tour="student-assigned-list"]', tab: 'my-assignments', placement: 'bottom' },
];

export const TEACHER_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'Welcome, Teacher', body: 'This tour covers your class roster, assignments, class tests, and settings.', placement: 'bottom' },
  { title: 'My Class', body: 'Your class dashboard — see every student\'s scores, time, passwords, and detailed progress.', target: '[data-tour="nav-dashboard"]', tab: 'dashboard', placement: 'right' },
  { title: 'Class Table', body: 'Scroll through your roster. Click any row for full stats and password controls.', target: '[data-tour="teacher-class-table"]', tab: 'dashboard', placement: 'bottom' },
  { title: 'Assignments', body: 'Create module assignments, track who turned them in, and see progress bars per student.', target: '[data-tour="nav-assignments"]', tab: 'assignments', placement: 'right' },
  { title: 'Assignment List', body: 'Current and past assignments are separated. Click one for per-student detail, or delete if needed.', target: '[data-tour="teacher-assignments-list"]', tab: 'assignments', placement: 'bottom' },
  { title: 'Class Tests', body: 'View class-wide test analytics — averages and the most-missed questions.', target: '[data-tour="nav-class-tests"]', tab: 'class-tests', placement: 'right' },
  { title: 'Settings', body: 'Update your password, toggle dark mode, or replay this tour.', target: '[data-tour="nav-settings"]', tab: 'settings', placement: 'right' },
  { title: 'Password & Theme', body: 'Change your password and switch appearance here.', target: '[data-tour="settings-appearance"]', tab: 'settings', placement: 'bottom' },
];

export const MODULE_SPOTLIGHT_STEPS: SpotlightStep[] = [
  { title: 'Welcome to the Module', body: 'You\'re in the Socratic Lab for this module. Valerie will guide you with questions tailored to what you\'re learning.', target: '[data-tour="chat-header"]', tab: 'chat', placement: 'bottom' },
  { title: 'Chat with Valerie', body: 'Read Valerie\'s questions here. Take your time — there are no wrong ways to start thinking.', target: '[data-tour="chat-messages"]', tab: 'chat', placement: 'top' },
  { title: 'Your Turn', body: 'Type your thinking here and press Send. Valerie will respond with another question to push your understanding further.', target: '[data-tour="chat-input"]', tab: 'chat', placement: 'top' },
  { title: 'Back to Units', body: 'When you\'re done, use Back to return to your curriculum and pick another module.', target: '[data-tour="chat-back"]', tab: 'chat', placement: 'bottom' },
];
