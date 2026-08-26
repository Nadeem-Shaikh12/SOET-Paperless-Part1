import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '..\/lib/api-client';
import { useAuthStore } from '..\/stores/auth';
import { DataTable } from '..\/components/ui/DataTable';
import { Modal } from '..\/components/ui/Modal';
import { Badge } from '..\/components/ui/Badge';
import { Plus, Loader2, Send, Trash2 } from 'lucide-react';

export default function AllocationsPage() {
  const { user } = useAuthStore();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alloc, fac, subj, cls, trm] = await Promise.all([
        apiClient<any[]>('/allocations'),
        apiClient<any[]>('/faculty').catch(() => []),
        apiClient<any[]>('/subjects').catch(() => []),
        apiClient<any[]>('/classes').catch(() => []),
        apiClient<any[]>('/institutional/academic-terms').catch(() => []),
      ]);
      setAllocations(alloc);
      setFaculty(fac);
      setSubjects(subj);
      setClasses(cls);
      setTerms(trm);
    } catch (err) {
      console.error('Failed to fetch allocations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeTerm = terms.find((t) => t.status === 'active');

  const openCreate = () => {
    setFormData({
      facultyId: faculty[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      classId: classes[0]?.id || '',
      termId: activeTerm?.id || '',
      theoryHours: 0,
      practicalHours: 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        facultyId: Number(formData.facultyId),
        subjectId: Number(formData.subjectId),
        classId: Number(formData.classId),
        termId: Number(formData.termId),
        theoryHours: Number(formData.theoryHours),
        practicalHours: Number(formData.practicalHours),
        effectiveStartDate: new Date().toISOString(),
      };
      await apiClient('/allocations', { method: 'POST', body: JSON.stringify(payload) });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApproval = async (item: any) => {
    if (!confirm('Are you sure you want to submit this allocation for approval?')) return;
    try {
      await apiClient('/approvals/submit', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'allocation',
          entityId: item.id,
        }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return;
    try {
      await apiClient(`/allocations/${item.id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const filteredAllocations = statusFilter === 'all' ? allocations : allocations.filter((a) => a.status === statusFilter);

  const updateField = (key: string, value: any) => setFormData((p: any) => ({ ...p, [key]: value }));
  const inputClass = 'w-full px-4 py-2.5 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all';
  const labelClass = 'block text-sm font-semibold text-[var(--foreground)] mb-1.5';

  const canCreate = user?.role === 'super_admin' || user?.role === 'dept_admin';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>Allocations</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Faculty-subject-class workload assignments.</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] text-white font-semibold text-sm rounded-[var(--radius-buttons)] transition-all">
            <Plus className="w-4 h-4" /> New Allocation
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'pending_approval', 'approved', 'rejected'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-[var(--radius-tags)] text-xs font-semibold transition-all ${statusFilter === s ? 'bg-[var(--color-carbon)] text-white' : 'bg-[var(--surface)] text-[var(--color-graphite)] hover:text-[var(--color-carbon)] border border-[var(--border)]'}`}
          >{s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'facultyId', label: 'Faculty', sortable: true, render: (r) => faculty.find((f) => f.id === r.facultyId)?.name || `#${r.facultyId}` },
          { key: 'subjectId', label: 'Subject', sortable: true, render: (r) => subjects.find((s) => s.id === r.subjectId)?.subjectName || `#${r.subjectId}` },
          { key: 'classId', label: 'Class', render: (r) => { const c = classes.find((cl) => cl.id === r.classId); return c ? `${c.className} ${c.division}` : (r.classId || '—'); } },
          { key: 'theoryHours', label: 'Theory Hrs' },
          { key: 'practicalHours', label: 'Practical Hrs' },
          { key: 'totalHours', label: 'Total Hrs', sortable: true, render: (r) => <span className="font-bold">{r.totalHours}</span> },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status.replace('_', ' ')}</Badge> },
        ]}
        data={filteredAllocations}
        searchKeys={[]}
        emptyMessage="No allocations found for the selected filter."
        actions={canCreate ? (row) => {
          const isDraft = row.status === 'draft' || row.status === 'returned_for_clarification';
          return (
            <div className="flex gap-1">
              {isDraft && (
                <button onClick={() => handleSubmitApproval(row)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-all" title="Submit for Approval"><Send className="w-4 h-4" /></button>
              )}
              {row.status === 'draft' && (
                <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          );
        } : undefined}
      />

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Allocation" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Faculty *</label>
              <select className={inputClass} value={formData.facultyId || ''} onChange={(e) => updateField('facultyId', e.target.value)}>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Subject *</label>
              <select className={inputClass} value={formData.subjectId || ''} onChange={(e) => updateField('subjectId', e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Class *</label>
              <select className={inputClass} value={formData.classId || ''} onChange={(e) => updateField('classId', e.target.value)}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.className} {c.division}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Term *</label>
              <select className={inputClass} value={formData.termId || ''} onChange={(e) => updateField('termId', e.target.value)}>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.semester}, {t.academicYear}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Theory Hours</label><input className={inputClass} type="number" step="0.5" value={formData.theoryHours ?? 0} onChange={(e) => updateField('theoryHours', e.target.value)} /></div>
            <div><label className={labelClass}>Practical Hours</label><input className={inputClass} type="number" step="0.5" value={formData.practicalHours ?? 0} onChange={(e) => updateField('practicalHours', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] rounded-[var(--radius-buttons)] hover:bg-[var(--color-fog)] transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] rounded-[var(--radius-buttons)] transition-all disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
