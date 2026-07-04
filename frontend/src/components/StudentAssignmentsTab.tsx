import { useEffect, useState } from 'react';
import { ClipboardList, Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight, Play } from 'lucide-react';
import { ClassroomAssignment, AssignmentSubmission, NGSSModule } from '../types';
import { resolveAssignmentModules } from '../lib/learningContext';

interface StudentAssignmentRow extends ClassroomAssignment {
  mySubmission?: AssignmentSubmission;
  isLate?: boolean;
}

interface StudentAssignmentsTabProps {
  studentUid?: string;
  onStartAssignment: (assignment: ClassroomAssignment, module: NGSSModule) => void;
}

export function StudentAssignmentsTab({ studentUid, onStartAssignment }: StudentAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<StudentAssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentUid) return;
    setLoading(true);
    fetch('/api/student-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentUid })
    })
      .then(r => r.ok ? r.json() : { assignments: [] })
      .then(d => setAssignments(d.assignments || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [studentUid]);

  const now = new Date();
  const current = assignments.filter(a => new Date(a.dueAt) >= now);
  const past = assignments.filter(a => new Date(a.dueAt) < now);

  const handleStart = (assignment: StudentAssignmentRow) => {
    const modules = resolveAssignmentModules(assignment.moduleIds || []);
    const completed = new Set(assignment.mySubmission?.completedModuleIds || []);
    const next = modules.find(m => !completed.has(m.id)) || modules[0];
    if (!next) return;
    onStartAssignment(assignment, next);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">My Assignments</h1>
        <p className="text-xl text-slate-700 dark:text-slate-400 font-medium">
          Work your teacher assigned. Browse the full curriculum anytime under Curriculum.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-400 font-bold text-center py-12">Loading assignments...</p>
      ) : (
        <>
          <AssignmentSection title="Due Soon" empty="No current assignments from your teacher." items={current} onStart={handleStart} />
          <AssignmentSection title="Past Assignments" empty="No past assignments yet." items={past} onStart={handleStart} isPast />
        </>
      )}
    </div>
  );
}

function AssignmentSection({
  title,
  empty,
  items,
  onStart,
  isPast,
}: {
  title: string;
  empty: string;
  items: StudentAssignmentRow[];
  onStart: (a: StudentAssignmentRow) => void;
  isPast?: boolean;
}) {
  return (
    <section data-tour="student-assigned-list">
      <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500 dark:text-slate-400">{empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(a => {
            const sub = a.mySubmission || { status: 'not_started' as const, progress: 0 };
            const isLate = a.isLate || (sub.status !== 'completed' && isPast);
            const modules = resolveAssignmentModules(a.moduleIds || []);
            const canStart = modules.length > 0 && sub.status !== 'completed';
            const label = sub.status === 'in_progress' ? 'Continue' : 'Start assignment';

            return (
              <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">{a.title}</h3>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1">
                      <Calendar size={14} /> Due {new Date(a.dueAt).toLocaleString()}
                      {isLate && <span className="text-orange-500">· Late</span>}
                    </p>
                    {modules.length > 0 && (
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                        {modules.map(m => m.title).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sub.status} isLate={isLate} />
                    {canStart && (
                      <button
                        type="button"
                        onClick={() => onStart(a)}
                        className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black text-sm hover:opacity-90 transition-all"
                      >
                        {sub.status === 'in_progress' ? <ArrowRight size={16} /> : <Play size={16} />}
                        {label}
                      </button>
                    )}
                    {modules.length === 0 && sub.status !== 'completed' && (
                      <p className="text-xs font-bold text-orange-500">No linked modules yet</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sub.status === 'completed' ? 'bg-sage-green' : sub.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      style={{ width: `${sub.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-slate-600 dark:text-slate-300 w-12">{sub.progress}%</span>
                </div>
                {sub.score != null && (
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">Score: {sub.score}%</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status, isLate }: { status: string; isLate?: boolean }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-sage-green bg-sage-green/10 px-3 py-1.5 rounded-full">
        <CheckCircle2 size={14} /> Turned In
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full">
        <Clock size={14} /> In Progress
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${isLate ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
      <AlertCircle size={14} /> {isLate ? 'Late' : 'Not Started'}
    </span>
  );
}
