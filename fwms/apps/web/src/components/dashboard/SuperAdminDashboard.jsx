import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2, Clock, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { v4 as uuidv4 } from 'uuid';


export function SuperAdminDashboard({ data }) {
  const { heatmap, deptWorkloadChart } = data;
  const [searchParams] = useSearchParams();
  const designationFilter = searchParams.get('designation') || '';
  const statusFilter = searchParams.get('status') || '';

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
    let totalWorkload = 0;

    filteredHeatmap.forEach((f) => {
      totalWorkload += f.totalHours;
      if (f.status === 'overloaded') overloadedCount++;
    });

    const avgWorkload = filteredHeatmap.length > 0 ? (totalWorkload / filteredHeatmap.length).toFixed(1) : 0;
    const uniqueDepts = new Set(filteredHeatmap.map((f) => f.dept)).size;

    return {
      totalFaculty: filteredHeatmap.length,
      totalDepartments: uniqueDepts,
      avgWorkload,
      overloadedCount
    };
  }, [filteredHeatmap]);

  return (
    <div className="space-y-6">
      {/* KPI Cards — Ventriloc Metric KPI Card style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Total Faculty</h3>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>{displayKpis.totalFaculty}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Total Departments</h3>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>{displayKpis.totalDepartments}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Avg. Workload Hours</h3>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>{displayKpis.avgWorkload}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <div className={`p-2.5 rounded-[var(--radius-cards)] inline-block ${displayKpis.overloadedCount > 0 ? 'bg-[#ff682c]/10 text-[#ff682c]' : 'bg-[var(--color-fog)] text-[var(--color-carbon)]'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Overloaded Faculty</h3>
          <p className={`text-2xl font-bold mt-1 font-heading ${displayKpis.overloadedCount > 0 ? 'text-[#ff682c]' : 'text-[var(--foreground)]'}`} style={{ letterSpacing: '-0.02em' }}>
            {displayKpis.overloadedCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution Chart — Carbon lines with Signal Orange accents */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4" style={{ letterSpacing: '-0.02em' }}>Workload Distribution by Department</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptWorkloadChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-chalk)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#828282' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#828282' }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e8e8e8', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(32, 32, 32, 0.04)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Theory" stackId="a" fill="#202020" radius={[0, 0, 4, 4]} barSize={32} />
                <Bar dataKey="Practical" stackId="a" fill="#ff682c" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap / Grid */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4" style={{ letterSpacing: '-0.02em' }}>Faculty Workload Heatmap</h2>
          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
            {filteredHeatmap.map((f) => {
              let colorClass = 'bg-emerald-500'; // normal
              if (f.status === 'overloaded') colorClass = 'bg-[#ff682c]';
              if (f.status === 'underloaded') colorClass = 'bg-amber-400';

              return (
                <div
                  key={uuidv4()}
                  title={`${f.name} (${f.dept}): ${f.totalHours} hrs`}
                  className={`w-6 h-6 rounded-[var(--radius-sm)] cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`} />);


            })}
          </div>
          <div className="flex items-center gap-4 mt-6 text-xs text-[var(--color-slate)]">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-[var(--radius-sm)] bg-emerald-500"></div> Normal</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-[var(--radius-sm)] bg-amber-400"></div> Underloaded</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-[var(--radius-sm)] bg-[#ff682c]"></div> Overloaded</div>
          </div>
        </div>
      </div>
    </div>);

}