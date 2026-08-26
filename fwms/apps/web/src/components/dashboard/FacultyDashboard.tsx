import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { BookOpen, Edit2, Clock, CheckCircle, XCircle, FileSpreadsheet, FlaskConical } from 'lucide-react';

type WorkloadRow = {
  id: number;
  subjectName: string;
  programClass: string;
  theoryHrsPerWeek: number;
  practicalHrsPerWeek: number;
  tutorialHrsPerWeek: number;
  totalTeachingHours: number;
  noteMarker?: string | null;
};

type FacultyDashboardProps = {
  data: any;
};

export function FacultyDashboard({ data }: FacultyDashboardProps) {
  const { workload, assignedSubjects, workloadRows, recentRequests } = data;

  const totalHours = workload?.totalHours || 0;
  const maxHours = workload?.normMax || 18;
  const progress = Math.min((totalHours / maxHours) * 100, 100);
  
  let color = '#10B981'; // Green
  if (workload?.status === 'overloaded') color = '#EF4444'; // Red
  if (workload?.status === 'underloaded') color = '#F59E0B'; // Yellow

  const gaugeData = [{ name: 'Workload', value: progress, fill: color }];

  // Determine which subject list to show
  const hasAllocations = assignedSubjects?.length > 0;
  const hasWorkloadRows = workloadRows?.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* My Workload Gauge */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)] w-full text-left mb-2">My Workload</h2>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                barSize={15} 
                data={gaugeData}
                startAngle={180} 
                endAngle={0}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
              <span className="text-3xl font-bold" style={{ color }}>{totalHours}</span>
              <span className="text-xs text-gray-500">of {maxHours} hrs limit</span>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600 font-medium capitalize">
            Status: <span style={{ color }}>{workload?.status}</span>
          </div>
        </div>

        {/* Assigned Subjects (from formal allocations) */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--color-signal-orange)]" />
            Assigned Subjects
          </h2>
          {hasAllocations ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedSubjects.map((sub: any) => (
                <div key={sub.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-white transition-colors relative group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{sub.subjectName}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sub.className && <span className="mr-2">Class: {sub.className}</span>}
                          {sub.batchName && <span>Batch: {sub.batchName}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="font-medium text-[var(--color-mgm-crimson)]">{sub.hours} hrs/week</span>
                    <button className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              No formal allocations for this term.
            </div>
          )}
        </div>
      </div>

      {/* Workload Report Sheet (AI-imported subjects) */}
      {hasWorkloadRows && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[var(--color-signal-orange)]" />
              Department Workload Sheet
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              AI Imported
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(workloadRows as WorkloadRow[]).map((row) => (
              <div
                key={row.id}
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 bg-orange-50 p-2 rounded-lg text-[var(--color-signal-orange)]">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[var(--foreground)] truncate" title={row.subjectName}>
                      {row.subjectName}
                      {row.noteMarker && (
                        <sup className="ml-0.5 text-blue-500 font-bold text-[10px]">{row.noteMarker}</sup>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-slate)] mt-0.5">{row.programClass || '—'}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Theory</p>
                    <p className="text-sm font-bold text-blue-700">{row.theoryHrsPerWeek}<span className="text-[10px] font-normal">/wk</span></p>
                  </div>
                  <div className="bg-purple-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-purple-500 font-medium uppercase tracking-wide">Practical</p>
                    <p className="text-sm font-bold text-purple-700">{row.practicalHrsPerWeek}<span className="text-[10px] font-normal">/wk</span></p>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Total</p>
                    <p className="text-sm font-bold text-orange-700">{row.totalTeachingHours}<span className="text-[10px] font-normal"> hrs</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--color-slate)] mt-4">
            These subjects are from your department's AI-imported workload sheet. Formal allocations will appear above once approved by your HOD.
          </p>
        </div>
      )}

      {/* Timeline Tracker */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">Recent Request Status</h2>
        {recentRequests?.length > 0 ? (
          <div className="space-y-6">
            {recentRequests.map((req: any) => (
              <div key={req.id} className="relative flex items-center gap-4">
                <div className="h-full w-px bg-gray-200 absolute left-4 top-8 -z-10" />
                <div className="bg-[var(--surface)]">
                  {req.toStatus === 'approved' && <CheckCircle className="w-8 h-8 text-emerald-500 bg-[var(--surface)]" />}
                  {req.toStatus === 'rejected' && <XCircle className="w-8 h-8 text-red-500 bg-[var(--surface)]" />}
                  {(req.toStatus !== 'approved' && req.toStatus !== 'rejected') && <Clock className="w-8 h-8 text-amber-500 bg-[var(--surface)]" />}
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm text-gray-800">{req.changeType.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 capitalize">Status updated to: <b>{req.toStatus.replace(/_/g, ' ')}</b></p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
            No recent requests.
          </div>
        )}
      </div>
    </div>
  );
}
