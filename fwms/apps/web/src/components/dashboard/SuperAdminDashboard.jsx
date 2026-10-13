import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2, Clock, AlertCircle, Info, BookOpen, FlaskConical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Custom tooltip for Department Workload Chart
const DepartmentTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const theory = Number(data.Theory || 0);
    const practical = Number(data.Practical || 0);
    const total = theory + practical;
    return (
      <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xl text-xs space-y-2 min-w-[210px]">
        <p className="font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-1.5">
          {data.fullName || data.name}
        </p>
        <div className="flex justify-between text-[var(--color-slate)] font-medium">
          <span>Total Department Workload:</span>
          <span className="font-bold text-[var(--foreground)]">{total} hrs/week</span>
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[#202020]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#202020]" />
              Theory (Lectures):
            </span>
            <span className="font-semibold">{theory}h {total > 0 ? `(${Math.round((theory / total) * 100)}%)` : ''}</span>
          </div>
          <div className="flex justify-between items-center text-[#ff682c]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ff682c]" />
              Practical (Labs):
            </span>
            <span className="font-semibold">{practical}h {total > 0 ? `(${Math.round((practical / total) * 100)}%)` : ''}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function SuperAdminDashboard({ data }) {
  const { heatmap = [], deptWorkloadChart = [] } = data;
  const [searchParams] = useSearchParams();
  const designationFilter = searchParams.get('designation') || '';
  const statusFilter = searchParams.get('status') || '';
  const [hoveredFaculty, setHoveredFaculty] = useState(null);

  const filteredHeatmap = useMemo(() => {
    if (!heatmap) return [];
    return heatmap.filter((f) => {
      const matchDesig = designationFilter ? f.desig === designationFilter : true;
      const matchStatus = statusFilter ? f.status === statusFilter : true;
      return matchDesig && matchStatus;
    });
  }, [heatmap, designationFilter, statusFilter]);

  const displayKpis = useMemo(() => {
    let overloadedCount = 0;
    let underloadedCount = 0;
    let totalWorkload = 0;

    filteredHeatmap.forEach((f) => {
      totalWorkload += f.totalHours;
      if (f.status === 'overloaded') overloadedCount++;
      if (f.status === 'underloaded') underloadedCount++;
    });

    const avgWorkload = filteredHeatmap.length > 0 ? (totalWorkload / filteredHeatmap.length).toFixed(1) : 0;
    const uniqueDepts = (!designationFilter && !statusFilter && data?.kpis?.totalDepartments)
      ? data.kpis.totalDepartments
      : new Set(filteredHeatmap.map((f) => f.dept)).size;

    return {
      totalFaculty: (!designationFilter && !statusFilter && data?.kpis?.totalFaculty) ? data.kpis.totalFaculty : filteredHeatmap.length,
      totalDepartments: uniqueDepts,
      avgWorkload,
      overloadedCount,
      underloadedCount,
      normalCount: filteredHeatmap.length - overloadedCount - underloadedCount
    };
  }, [filteredHeatmap, designationFilter, statusFilter, data?.kpis]);

  // Clean formatted data for chart with standard department acronyms
  const formattedDeptChart = useMemo(() => {
    return deptWorkloadChart.map((d) => {
      let short = d.name;
      if (d.name.includes('Computer')) short = 'CSE';
      else if (d.name.includes('Mechanical')) short = 'Mechanical';
      else if (d.name.includes('Civil')) short = 'Civil';
      else if (d.name.includes('Electrical') || d.name.includes('ETC')) short = 'EE & ETC';
      else if (d.name.includes('Information')) short = 'IT';

      return {
        ...d,
        name: short,
        fullName: d.fullName || d.name,
        Total: (d.Theory || 0) + (d.Practical || 0)
      };
    });
  }, [deptWorkloadChart]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Total Faculty</h3>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>
            {displayKpis.totalFaculty}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Total Departments</h3>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>
            {displayKpis.totalDepartments}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Avg. Workload Hours</h3>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>
            {displayKpis.avgWorkload} <span className="text-xs font-normal text-[var(--color-slate)]">hrs/wk</span>
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className={`p-2.5 rounded-[var(--radius-cards)] inline-block ${displayKpis.overloadedCount > 0 ? 'bg-[#ff682c]/10 text-[#ff682c]' : 'bg-[var(--color-fog)] text-[var(--color-carbon)]'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Overloaded Faculty</h3>
          <p className={`text-2xl font-bold mt-1 font-heading ${displayKpis.overloadedCount > 0 ? 'text-[#ff682c]' : 'text-[var(--foreground)]'}`} style={{ letterSpacing: '-0.02em' }}>
            {displayKpis.overloadedCount} <span className="text-xs font-normal text-[var(--color-slate)]">&gt;18 hrs</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution by Department */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>
                  Workload Distribution by Department
                </h2>
                <p className="text-xs text-[var(--color-slate)] mt-0.5">
                  Weekly teaching hours: classroom Theory lectures vs practical Labs
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-fog)] text-[var(--color-slate)] border border-[var(--border)] shrink-0">
                Weekly Hours
              </span>
            </div>

            {/* Custom Legend */}
            <div className="flex items-center gap-4 text-xs font-medium my-3">
              <span className="flex items-center gap-1.5 text-[#202020]">
                <span className="w-3 h-3 rounded bg-[#202020]" />
                Theory (Lectures)
              </span>
              <span className="flex items-center gap-1.5 text-[#ff682c]">
                <span className="w-3 h-3 rounded bg-[#ff682c]" />
                Practical (Labs)
              </span>
            </div>

            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedDeptChart} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={{ stroke: '#e8e8e8' }}
                    tickLine={false}
                    interval={0}
                    tick={{ fontSize: 12, fill: 'var(--color-carbon)', fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#828282' }}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip content={<DepartmentTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="Theory" stackId="a" fill="#202020" radius={[0, 0, 4, 4]} barSize={36} />
                  <Bar dataKey="Practical" stackId="a" fill="#ff682c" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Breakdown Mini-Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[var(--border)] mt-3">
            {formattedDeptChart.map((d) => (
              <div key={d.name} className="p-2.5 rounded-lg bg-[var(--color-fog)]/60 border border-[var(--border)]/60 text-center">
                <span className="text-[11px] font-bold text-[var(--color-carbon)] block truncate" title={d.fullName}>
                  {d.name}
                </span>
                <span className="text-sm font-extrabold text-[var(--foreground)] block my-0.5">
                  {d.Total} hrs
                </span>
                <span className="text-[10px] text-[var(--color-slate)] block">
                  Th: {d.Theory}h · Pr: {d.Practical}h
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Workload Heatmap */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>
                  Faculty Workload Heatmap
                </h2>
                <p className="text-xs text-[var(--color-slate)] mt-0.5">
                  Individual faculty teaching loads vs UGC norms (12–18 hrs/week)
                </p>
              </div>
            </div>

            {/* Status Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs my-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Normal (12–18h): {displayKpis.normalCount}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Underloaded (&lt;12h): {displayKpis.underloadedCount}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold border border-orange-200">
                <span className="w-2 h-2 rounded-full bg-[#ff682c]" />
                Overloaded (&gt;18h): {displayKpis.overloadedCount}
              </span>
            </div>

            {/* Grid of Faculty Chips with Hover Detail */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1 mt-2">
              {filteredHeatmap.map((f) => {
                let statusBadge = 'border-emerald-300 bg-emerald-50/60 text-emerald-900';
                let dotColor = 'bg-emerald-500';
                if (f.status === 'overloaded') {
                  statusBadge = 'border-orange-300 bg-orange-50/80 text-orange-950 font-semibold';
                  dotColor = 'bg-[#ff682c]';
                } else if (f.status === 'underloaded') {
                  statusBadge = 'border-amber-300 bg-amber-50/70 text-amber-900';
                  dotColor = 'bg-amber-400';
                }

                return (
                  <div
                    key={f.id || f.name}
                    onMouseEnter={() => setHoveredFaculty(f)}
                    onMouseLeave={() => setHoveredFaculty(null)}
                    title={`${f.name} (${f.dept}) — ${f.totalHours} hrs`}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all hover:shadow-sm ${statusBadge}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate max-w-[110px]" title={f.name}>
                        {f.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/, '')}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/80 shadow-2xs shrink-0">
                        {f.totalHours}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--color-slate)]">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className="truncate">{f.dept?.replace('Engineering', 'Engg.') || 'General'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Hover / Info Banner */}
          <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--color-slate)] flex items-center justify-between min-h-[32px]">
            {hoveredFaculty ? (
              <div className="flex items-center gap-2 text-[var(--foreground)] font-medium">
                <Info className="w-3.5 h-3.5 text-[var(--color-signal-orange)] shrink-0" />
                <span>
                  <strong className="text-[var(--color-carbon)]">{hoveredFaculty.name}</strong> ({hoveredFaculty.dept}):{' '}
                  <span className="font-bold">{hoveredFaculty.totalHours} hrs</span> —{' '}
                  <span className="capitalize">{hoveredFaculty.status}</span> ({hoveredFaculty.desig?.replace('_', ' ')})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-[var(--color-slate)] italic">
                Hover over any faculty chip above to see designation and department details.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}