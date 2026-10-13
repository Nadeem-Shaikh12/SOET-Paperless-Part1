import { useState, useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, CheckCircle, XCircle, FileSpreadsheet, FlaskConical, CalendarDays, MapPin, Users, Award } from 'lucide-react';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function FacultyDashboard({ data }) {
  const { workload, assignedSubjects, workloadRows, schedule, departmentName, recentRequests } = data;

  const totalHours = workload?.totalHours || 0;
  const theoryHours = workload?.theoryHours || 0;
  const practicalHours = workload?.practicalHours || 0;
  const tutorialHours = workload?.tutorialHours || 0;
  const normMax = workload?.normMax || 18;
  const normMin = workload?.normMin || 12;
  const progress = normMax > 0 ? Math.min((totalHours / normMax) * 100, 100) : 0;

  let color = '#10B981'; // Green
  if (workload?.status === 'overloaded') color = '#EF4444'; // Red
  if (workload?.status === 'underloaded') color = '#F59E0B'; // Yellow

  const gaugeData = [{ name: 'Workload', value: progress, fill: color }];

  // Choose the best subject rows to display
  const displayRows = useMemo(() => {
    if (workloadRows && workloadRows.length > 0) return workloadRows;
    if (assignedSubjects && assignedSubjects.length > 0) {
      return assignedSubjects.map(s => ({
        id: s.id,
        subjectName: s.subjectName,
        programClass: s.className || 'Classroom',
        theoryHrsPerWeek: s.theoryHrs || s.hours || 0,
        practicalHrsPerWeek: s.practicalHrs || 0,
        tutorialHrsPerWeek: 0,
        totalTeachingHours: (s.hours || 0) * 16,
        noteMarker: s.batchName || null
      }));
    }
    return [];
  }, [workloadRows, assignedSubjects]);

  const hasSchedule = schedule && Object.keys(schedule).length > 0;

  // Selected timetable day: default to today (or Monday if Sunday)
  const todayIndex = new Date().getDay();
  const defaultDayIndex = todayIndex === 0 ? 1 : todayIndex;
  const [selectedDayIndex, setSelectedDayIndex] = useState(defaultDayIndex);
  const selectedDay = DAYS[selectedDayIndex];

  const todaySchedule = useMemo(() => {
    if (!schedule || !schedule[selectedDay]) return [];
    return [...schedule[selectedDay]].sort((a, b) => {
      const timeA = a.time?.split('-')[0] || '';
      const timeB = b.time?.split('-')[0] || '';
      return timeA.localeCompare(timeB);
    });
  }, [schedule, selectedDay]);

  // Count total weekly slots
  const totalWeeklySlots = useMemo(() => {
    if (!schedule) return 0;
    return Object.values(schedule).reduce((sum, slots) => sum + (Array.isArray(slots) ? slots.length : 0), 0);
  }, [schedule]);

  const getActivityStyle = (activity, type) => {
    if (!activity) return { bg: 'bg-gray-50 border-gray-200 text-gray-600', tag: 'bg-gray-200 text-gray-700' };
    const lower = activity.toLowerCase();
    if (type === 'practical' || lower.includes('lab') || lower.includes('pel') || lower.includes('jpr') || lower.includes('ste') || lower.includes('practical')) {
      return { bg: 'bg-blue-50/70 border-blue-200 text-blue-900', tag: 'bg-blue-100 text-blue-800' };
    }
    if (type === 'mentoring' || lower.includes('continuous assessment')) {
      return { bg: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', tag: 'bg-emerald-100 text-emerald-800' };
    }
    if (type === 'tutorial' || lower.includes('tutorial') || lower.includes('(tu)')) {
      return { bg: 'bg-teal-50/70 border-teal-200 text-teal-900', tag: 'bg-teal-100 text-teal-800' };
    }
    return { bg: 'bg-orange-50/70 border-orange-200 text-orange-950', tag: 'bg-orange-100 text-orange-800' };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* My Workload Gauge Card */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">My Workload</h2>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {workload?.status || 'normal'}
            </span>
          </div>

          <div className="h-44 w-full relative">
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
              <span className="text-3xl font-extrabold" style={{ color }}>{totalHours}</span>
              <span className="text-xs text-gray-500 font-medium">hrs / week</span>
              <span className="text-[10px] text-gray-400 mt-0.5">(norm: {normMin}–{normMax} hrs/wk)</span>
            </div>
          </div>

          {/* Breakdown Badges */}
          <div className="w-full grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-[var(--border)] text-center">
            <div className="p-1.5 rounded-lg bg-blue-50/60 border border-blue-100">
              <p className="text-[10px] font-semibold text-blue-600 uppercase">Theory</p>
              <p className="text-sm font-bold text-blue-900">{theoryHours}h<span className="text-[10px] font-normal">/wk</span></p>
            </div>
            <div className="p-1.5 rounded-lg bg-purple-50/60 border border-purple-100">
              <p className="text-[10px] font-semibold text-purple-600 uppercase">Practical</p>
              <p className="text-sm font-bold text-purple-900">{practicalHours}h<span className="text-[10px] font-normal">/wk</span></p>
            </div>
            <div className="p-1.5 rounded-lg bg-teal-50/60 border border-teal-100">
              <p className="text-[10px] font-semibold text-teal-600 uppercase">Tutorial</p>
              <p className="text-sm font-bold text-teal-900">{tutorialHours}h<span className="text-[10px] font-normal">/wk</span></p>
            </div>
          </div>

          {departmentName && (
            <p className="text-[11px] text-[var(--color-slate)] mt-3 text-center">{departmentName}</p>
          )}
        </div>

        {/* Assigned Subjects & Teaching Breakdown */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--color-signal-orange)]" />
                Assigned Subjects & Teaching Load
              </h2>
              <span className="text-xs text-[var(--color-slate)]">
                {displayRows.length} {displayRows.length === 1 ? 'course' : 'courses'} scheduled
              </span>
            </div>

            {displayRows.length > 0 ? (
              <div className="space-y-3">
                {displayRows.map((row) => {
                  const weeklySum = (row.theoryHrsPerWeek || 0) + (row.practicalHrsPerWeek || 0) + (row.tutorialHrsPerWeek || 0);
                  return (
                    <div
                      key={row.id}
                      className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-gray-300 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="shrink-0 bg-orange-50 p-2.5 rounded-lg text-[var(--color-signal-orange)] mt-0.5">
                            <FlaskConical className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-[var(--foreground)] leading-snug">
                              {row.subjectName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--color-slate)]">
                              {row.programClass && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 opacity-70" />
                                  <span>{row.programClass}</span>
                                </span>
                              )}
                              {row.noteMarker && (
                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                  • <Users className="w-3.5 h-3.5 opacity-70" /> {row.noteMarker}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {weeklySum} hrs/wk
                        </span>
                      </div>

                      <div className="mt-3.5 grid grid-cols-4 gap-2 text-center">
                        <div className="bg-blue-50/70 rounded-lg py-1.5 border border-blue-100">
                          <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Theory</p>
                          <p className="text-sm font-bold text-blue-900">{row.theoryHrsPerWeek || 0}<span className="text-[10px] font-normal text-blue-600">/wk</span></p>
                        </div>
                        <div className="bg-purple-50/70 rounded-lg py-1.5 border border-purple-100">
                          <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">Practical</p>
                          <p className="text-sm font-bold text-purple-900">{row.practicalHrsPerWeek || 0}<span className="text-[10px] font-normal text-purple-600">/wk</span></p>
                        </div>
                        <div className="bg-teal-50/70 rounded-lg py-1.5 border border-teal-100">
                          <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">Tutorial</p>
                          <p className="text-sm font-bold text-teal-900">{row.tutorialHrsPerWeek || 0}<span className="text-[10px] font-normal text-teal-600">/wk</span></p>
                        </div>
                        <div className="bg-orange-50/70 rounded-lg py-1.5 border border-orange-100">
                          <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider">Total Sem</p>
                          <p className="text-sm font-bold text-orange-900">{row.totalTeachingHours || weeklySum * 16}<span className="text-[10px] font-normal text-orange-600"> hrs</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                No workload allocations recorded for this term.
              </div>
            )}
          </div>

          <p className="text-[11px] text-[var(--color-slate)] mt-3">
            Source: Official Personal Faculty Workload &amp; Time Table records.
          </p>
        </div>
      </div>

      {/* Day-wise Timetable Section */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--color-signal-orange)]" />
              My Current Timetable
            </h2>
            <p className="text-xs text-[var(--color-slate)] mt-0.5">
              Day-by-day lecture, laboratory, and classroom allocations.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg self-start sm:self-auto">
            {totalWeeklySlots} teaching sessions / week
          </span>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 border-b border-[var(--border)]">
          {DAYS.slice(1).map((day, i) => {
            const actualIndex = i + 1; // 1 = Monday, 6 = Saturday
            const slots = schedule?.[day] || [];
            const isToday = actualIndex === todayIndex;
            const isSelected = actualIndex === selectedDayIndex;
            return (
              <button
                key={day}
                onClick={() => setSelectedDayIndex(actualIndex)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 border-b-2 -mb-px ${
                  isSelected
                    ? 'border-[var(--color-signal-orange)] bg-[var(--color-signal-orange)]/10 text-[var(--color-signal-orange)] font-bold'
                    : isToday
                    ? 'border-gray-300 bg-gray-50 text-[var(--color-carbon)] font-semibold'
                    : 'border-transparent text-[var(--color-graphite)] hover:bg-gray-100 hover:text-black'
                }`}
              >
                <span>{DAY_LABELS[actualIndex]}</span>
                {slots.length > 0 && (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-[var(--color-signal-orange)] text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {slots.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule Slot Cards */}
        {hasSchedule ? (
          todaySchedule.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todaySchedule.map((slot, idx) => {
                const style = getActivityStyle(slot.activity, slot.type);
                return (
                  <div
                    key={idx}
                    className={`flex items-stretch gap-4 p-4 rounded-xl border transition-all ${style.bg}`}
                  >
                    {/* Time Column */}
                    <div className="shrink-0 w-28 flex flex-col items-center justify-center border-r border-current/15 pr-3">
                      <Clock className="w-4 h-4 mb-1 opacity-60" />
                      <span className="text-xs font-bold tracking-tight text-center">{slot.time}</span>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style.tag}`}>
                          {slot.type === 'practical' ? 'Laboratory' : slot.type === 'mentoring' ? 'Mentoring' : 'Lecture'}
                        </span>
                        {slot.batch && (
                          <span className="text-[11px] font-semibold text-gray-700">
                            {slot.batch}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm leading-tight truncate" title={slot.activity}>
                        {slot.activity}
                      </p>
                      {slot.location && (
                        <p className="text-xs opacity-75 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{slot.location}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-28 flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              <CalendarDays className="w-6 h-6 mb-1 opacity-40" />
              No teaching sessions scheduled for {DAYS[selectedDayIndex].charAt(0) + DAYS[selectedDayIndex].slice(1).toLowerCase()}.
            </div>
          )
        ) : (
          <div className="h-28 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            No timetable data available for this term.
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-5">Recent Request Status</h2>
        {recentRequests && recentRequests.length > 0 ? (
          <div className="space-y-4">
            {recentRequests.map((req) => (
              <div key={req.id} className="relative flex items-center gap-4">
                <div className="bg-[var(--surface)] shrink-0">
                  {req.toStatus === 'approved' && <CheckCircle className="w-7 h-7 text-emerald-500" />}
                  {req.toStatus === 'rejected' && <XCircle className="w-7 h-7 text-red-500" />}
                  {req.toStatus !== 'approved' && req.toStatus !== 'rejected' && <Clock className="w-7 h-7 text-amber-500" />}
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">{req.changeType?.replace(/_/g, ' ').toUpperCase()}</span>
                    <p className="text-xs text-gray-600 mt-0.5 capitalize">Status: <b>{req.toStatus?.replace(/_/g, ' ')}</b></p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
            No recent approval or change requests.
          </div>
        )}
      </div>
    </div>
  );
}