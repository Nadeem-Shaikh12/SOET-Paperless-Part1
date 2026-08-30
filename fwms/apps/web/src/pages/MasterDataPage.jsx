import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '..\/lib/api-client';
import { useAuthStore } from '..\/stores/auth';
import { Badge } from '..\/components/ui/Badge';
import { AccessDenied } from '..\/components/ui/AccessDenied';
import { Calendar, Gauge, Loader2 } from 'lucide-react';

export default function MasterDataPage() {
  const { user } = useAuthStore();
  const [terms, setTerms] = useState([]);
  const [norms, setNorms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, n] = await Promise.all([
      apiClient('/institutional/academic-terms'),
      apiClient('/institutional/norms')]
      );
      setTerms(t);
      setNorms(n);
    } catch (err) {
      console.error('Failed to fetch master data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {fetchData();}, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" />
      </div>);

  }

  if (user?.role !== 'super_admin' && user?.role !== 'dept_admin') {
    return <AccessDenied message="You do not have permission to view this page." />;
  }

  const activeTerm = terms.find((t) => t.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>Master Data</h1>
        <p className="text-sm text-[var(--color-slate)] mt-1">Overview of academic terms and workload norms.</p>
      </div>

      {/* Active Term Card */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Calendar className="w-5 h-5" /></div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Current Academic Term</h2>
        </div>
        {activeTerm ?
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-[var(--foreground)] opacity-50 uppercase tracking-wider">Year</p>
              <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">{activeTerm.academicYear}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--foreground)] opacity-50 uppercase tracking-wider">Semester</p>
              <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">{activeTerm.semester}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--foreground)] opacity-50 uppercase tracking-wider">Start</p>
              <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">{new Date(activeTerm.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--foreground)] opacity-50 uppercase tracking-wider">End</p>
              <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">{new Date(activeTerm.endDate).toLocaleDateString()}</p>
            </div>
          </div> :

        <p className="text-sm text-[var(--foreground)] opacity-50">No active term configured.</p>
        }
      </div>

      {/* All Terms */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">All Academic Terms</h2>
        <div className="grid gap-3">
          {terms.map((t) =>
          <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
              <div>
                <p className="font-semibold text-[var(--foreground)]">{t.semester} Semester, {t.academicYear}</p>
                <p className="text-xs text-[var(--foreground)] opacity-50 mt-0.5">
                  {new Date(t.startDate).toLocaleDateString()} — {new Date(t.endDate).toLocaleDateString()}
                </p>
              </div>
              <Badge status={t.status}>{t.status}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Norms */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><Gauge className="w-5 h-5" /></div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Workload Norms</h2>
        </div>
        {norms.length === 0 ?
        <p className="text-sm text-[var(--foreground)] opacity-50">No norms configured for the current term.</p> :

        <div className="grid gap-4 md:grid-cols-3">
            {norms.map((n) =>
          <div key={n.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
                <p className="font-bold text-[var(--foreground)]">{n.designation.replace('_', ' ')}</p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--foreground)] opacity-60">Weekly Hours</span><span className="font-semibold text-[var(--foreground)]">{n.minWeeklyHours} – {n.maxWeeklyHours}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--foreground)] opacity-60">Theory Mult.</span><span className="font-semibold text-[var(--foreground)]">{n.defaultTheoryMultiplier}×</span></div>
                  <div className="flex justify-between"><span className="text-[var(--foreground)] opacity-60">Practical Mult.</span><span className="font-semibold text-[var(--foreground)]">{n.defaultPracticalMultiplier}×</span></div>
                  <div className="flex justify-between"><span className="text-[var(--foreground)] opacity-60">SLA Days</span><span className="font-semibold text-[var(--foreground)]">{n.slaDaysForHodReview} days</span></div>
                </div>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}