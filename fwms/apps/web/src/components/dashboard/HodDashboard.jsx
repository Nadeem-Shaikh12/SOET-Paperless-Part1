import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';


const COLORS = ['#202020', '#ff682c', '#816729', '#828282', '#4d4d4d', '#e8e8e8', '#f5f5f5'];

export function HodDashboard({ data }) {
  const { facultyWorkloads, subjectAllocationChart } = data;
  const [searchParams] = useSearchParams();
  const designationFilter = searchParams.get('designation') || '';
  const statusFilter = searchParams.get('status') || '';

  const filteredWorkloads = useMemo(() => {
    if (!facultyWorkloads) return [];
    return facultyWorkloads.filter((f) => {
      let status = 'normal';
      if (f.totalHours > f.normMax) status = 'overloaded';
      if (f.totalHours < f.normMin) status = 'underloaded';

      const matchDesig = designationFilter ? f.desig === designationFilter : true;
      const matchStatus = statusFilter ? status === statusFilter : true;

      return matchDesig && matchStatus;
    });
  }, [facultyWorkloads, designationFilter, statusFilter]);

  const displayKpis = useMemo(() => {
    let overloadedCount = 0;
    let totalWorkload = 0;

    filteredWorkloads.forEach((f) => {
      totalWorkload += f.totalHours;
      if (f.totalHours > f.normMax) overloadedCount++;
    });

    const avgWorkload = filteredWorkloads.length > 0 ? (totalWorkload / filteredWorkloads.length).toFixed(1) : 0;

    return {
      facultyCount: filteredWorkloads.length,
      avgWorkload,
      overloadedCount
    };
  }, [filteredWorkloads]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
              <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Department Faculty</h3>
              <p className="text-2xl font-bold text-[var(--foreground)] mt-1 font-heading" style={{ letterSpacing: '-0.02em' }}>{displayKpis.facultyCount}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
              <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)] inline-block">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-[var(--color-slate)] text-sm font-medium mt-4">Avg. Workload</h3>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Allocation Donut Chart */}
            <div className="bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-4" style={{ letterSpacing: '-0.02em' }}>Subject Hour Allocation</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                    <Pie
                      data={subjectAllocationChart}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value">
                      
                      {subjectAllocationChart?.map((entry, index) =>
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      )}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e8e8e8', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(32, 32, 32, 0.04)' }} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) =>
                      <span title={value} className="text-[var(--foreground)] truncate inline-block max-w-[140px] align-bottom ml-1">
                          {value}
                        </span>
                      } />
                    
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Faculty Cards Grid */}
            <div className="lg:col-span-2 bg-[var(--surface)] rounded-[var(--radius-cards)] border border-[var(--border)] p-6">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-4" style={{ letterSpacing: '-0.02em' }}>Faculty Workload Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                {filteredWorkloads.map((f) => {
                  const progressPct = Math.min(f.totalHours / f.normMax * 100, 100);
                  let barColor = 'bg-emerald-500';
                  if (f.totalHours > f.normMax) barColor = 'bg-[#ff682c]';
                  if (f.totalHours < f.normMin) barColor = 'bg-amber-400';

                  return (
                    <div key={f.id} className="border border-[var(--border)] bg-[var(--color-fog)] p-4 rounded-[var(--radius-cards)] hover:bg-[var(--surface)] transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-[var(--foreground)]">{f.name}</h4>
                          <p className="text-xs text-[var(--color-slate)]">{f.desig.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[var(--color-graphite)] block">{f.totalHours * 24} hrs / sem</span>
                          <span className="text-[10px] text-[var(--color-slate)]">({f.totalHours} hrs/wk)</span>
                        </div>
                      </div>
                      <div className="w-full bg-[var(--color-chalk)] rounded-full h-2 mt-3">
                        <div className={`${barColor} h-2 rounded-full`} style={{ width: `${progressPct}%` }}></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-[var(--color-slate)]">
                        <span>Min: {f.normMin * 24} hrs</span>
                        <span>Max: {f.normMax * 24} hrs</span>
                      </div>
                    </div>);

                })}
              </div>
            </div>
        </div>
      </div>
    );
  }