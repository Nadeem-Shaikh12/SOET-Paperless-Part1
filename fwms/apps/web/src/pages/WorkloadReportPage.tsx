import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth';
import { WorkloadReportDocument } from '../components/workload-report/WorkloadReportDocument';
import { FileSpreadsheet, Sparkles } from 'lucide-react';


type TermOption = {
  id: number;
  academicYear: string;
  semester: string;
  status: string;
};

type DepartmentOption = {
  id: number;
  deptName: string;
};

export default function WorkloadReportPage() {
  const { user } = useAuthStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const isAdmin = user?.role === 'super_admin';

  // Fetch terms and departments
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const termsList = await apiClient<TermOption[]>('/institutional/academic-terms');
        setTerms(termsList || []);

        // Default to first active term
        const activeTerm = (termsList || []).find((t: TermOption) => t.status === 'active');
        if (activeTerm) setSelectedTermId(activeTerm.id);
        else if (termsList && termsList.length > 0) setSelectedTermId(termsList[0].id);

        if (isAdmin) {
          const deptsList = await apiClient<DepartmentOption[]>('/institutional/departments');
          setDepartments(deptsList || []);
        } else if (user?.deptId) {
          setSelectedDeptId(user.deptId);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load metadata');
      }
    };
    fetchMeta();
  }, [isAdmin, user]);

  // Fetch report
  const fetchReport = useCallback(async () => {
    if (!selectedTermId) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ termId: String(selectedTermId) });
      if (selectedDeptId) params.set('deptId', String(selectedDeptId));

      const data = await apiClient<any>(`/workload-report?${params.toString()}`);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTermId, selectedDeptId]);

  useEffect(() => {
    if (selectedTermId) fetchReport();
  }, [selectedTermId, selectedDeptId, fetchReport]);

  // Save handler
  const handleSave = async (reportId: number, data: { title?: string; notes?: string; rows: any[] }) => {
    setSaving(true);
    try {
      const updated = await apiClient<any>(`/workload-report/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setReport(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate handler
  const handleRegenerate = async () => {
    if (!selectedTermId) return;
    const deptId = selectedDeptId || report?.deptId || user?.deptId;
    if (!deptId) return;

    if (!window.confirm('This will regenerate the report from current subjects/classes data. Any manual edits will be lost. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient<any>('/workload-report/generate', {
        method: 'POST',
        body: JSON.stringify({ deptId, termId: selectedTermId }),
      });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Page Header + Filters — hidden in print */}
      <div className="print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-[var(--radius-cards)] bg-[var(--color-fog)] text-[var(--color-carbon)]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)] font-heading" style={{ letterSpacing: '-0.02em' }}>
                Workload Report
              </h1>
              <p className="text-sm text-[var(--color-slate)]">Departmental teaching workload summary document</p>
            </div>
            <Link
              to="/workload-report/ingest"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-carbon)] text-white text-sm font-semibold hover:bg-[var(--color-graphite)] transition-colors"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-signal-orange)]" />
              AI Import
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-cards)] p-4">
          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[var(--color-slate)]">Term:</label>
            <select
              value={selectedTermId || ''}
              onChange={e => setSelectedTermId(parseInt(e.target.value))}
              className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.academicYear} — {t.semester} {t.status === 'active' ? '●' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[var(--color-slate)]">Department:</label>
              <select
                value={selectedDeptId || ''}
                onChange={e => setSelectedDeptId(parseInt(e.target.value) || null)}
                className="text-sm px-3 py-1.5 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.deptName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 print:hidden">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-carbon)] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-[var(--radius-cards)] p-4 text-sm text-red-700 print:hidden">
          {error}
        </div>
      ) : !report ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-cards)] p-8 text-center print:hidden">
          <FileSpreadsheet className="w-10 h-10 text-[var(--color-slate)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-graphite)]">
            {isAdmin ? 'Select a department to view the workload report.' : 'No report available for this term.'}
          </p>
        </div>
      ) : (
        <WorkloadReportDocument
          report={report}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
          saving={saving}
        />
      )}
    </div>
  );
}
