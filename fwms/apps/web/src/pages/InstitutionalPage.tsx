import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '..\/lib/api-client';
import { useAuthStore } from '..\/stores/auth';
import { DataTable } from '..\/components/ui/DataTable';
import { Modal } from '..\/components/ui/Modal';
import { Badge } from '..\/components/ui/Badge';
import { AccessDenied } from '..\/components/ui/AccessDenied';
import { Plus, Pencil, Trash2, Building2, GraduationCap, Calendar, Gauge, Loader2 } from 'lucide-react';

type Tab = 'schools' | 'departments' | 'terms' | 'norms';

export default function InstitutionalConfigPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [tab, setTab] = useState<Tab>('schools');
  const [schools, setSchools] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [norms, setNorms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, t, n] = await Promise.all([
        apiClient<any[]>('/institutional/schools'),
        apiClient<any[]>('/institutional/departments'),
        apiClient<any[]>('/institutional/academic-terms'),
        apiClient<any[]>('/institutional/norms'),
      ]);
      setSchools(s);
      setDepartments(d);
      setTerms(t);
      setNorms(n);
    } catch (err) {
      console.error('Failed to fetch institutional data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setFormData(getDefaultForm());
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormData(getEditForm(item));
    setModalOpen(true);
  };

  const getDefaultForm = () => {
    switch (tab) {
      case 'schools': return { schoolName: '', deanName: '' };
      case 'departments': return { deptName: '', schoolId: schools[0]?.id || '', defaultBatchSize: 30 };
      case 'terms': return { academicYear: '', semester: 'Odd', startDate: '', endDate: '' };
      case 'norms': return { designation: 'Professor', minWeeklyHours: 14, maxWeeklyHours: 16, defaultTheoryMultiplier: 1.0, defaultPracticalMultiplier: 2.0, slaDaysForHodReview: 3, effectiveTermId: terms[0]?.id || '' };
      default: return {};
    }
  };

  const getEditForm = (item: any) => {
    switch (tab) {
      case 'schools': return { schoolName: item.schoolName, deanName: item.deanName || '' };
      case 'departments': return { deptName: item.deptName, schoolId: item.schoolId, defaultBatchSize: item.defaultBatchSize };
      case 'terms': return { academicYear: item.academicYear, semester: item.semester, startDate: item.startDate?.split('T')[0], endDate: item.endDate?.split('T')[0] };
      case 'norms': return { ...item, effectiveTermId: item.effectiveTermId };
      default: return {};
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'schools') {
        if (editItem) await apiClient(`/institutional/schools/${editItem.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        else await apiClient('/institutional/schools', { method: 'POST', body: JSON.stringify(formData) });
      } else if (tab === 'departments') {
        const payload = { ...formData, schoolId: Number(formData.schoolId), defaultBatchSize: Number(formData.defaultBatchSize) };
        if (editItem) await apiClient(`/institutional/departments/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        else await apiClient('/institutional/departments', { method: 'POST', body: JSON.stringify(payload) });
      } else if (tab === 'terms') {
        await apiClient('/institutional/academic-terms', { method: 'POST', body: JSON.stringify(formData) });
      } else if (tab === 'norms') {
        const payload = {
          ...formData,
          effectiveTermId: Number(formData.effectiveTermId),
          minWeeklyHours: Number(formData.minWeeklyHours),
          maxWeeklyHours: Number(formData.maxWeeklyHours),
          defaultTheoryMultiplier: Number(formData.defaultTheoryMultiplier),
          defaultPracticalMultiplier: Number(formData.defaultPracticalMultiplier),
          slaDaysForHodReview: Number(formData.slaDaysForHodReview),
        };
        await apiClient('/institutional/norms', { method: 'PUT', body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateSchool = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this school?')) return;
    try {
      await apiClient(`/institutional/schools/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed');
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      let endpoint = '';
      if (tab === 'departments') endpoint = `/institutional/departments/${item.id}`;
      else if (tab === 'terms') endpoint = `/institutional/academic-terms/${item.id}`;
      else if (tab === 'norms') endpoint = `/institutional/norms/${item.id}`;

      if (endpoint) {
        await apiClient(endpoint, { method: 'DELETE' });
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const updateField = (key: string, value: any) => setFormData((p: any) => ({ ...p, [key]: value }));

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'schools', label: 'Schools', icon: Building2 },
    { key: 'departments', label: 'Departments', icon: GraduationCap },
    { key: 'terms', label: 'Academic Terms', icon: Calendar },
    { key: 'norms', label: 'Workload Norms', icon: Gauge },
  ];

  const inputClass = 'w-full px-4 py-2.5 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all';
  const labelClass = 'block text-sm font-semibold text-[var(--foreground)] mb-1.5';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" />
      </div>
    );
  }

  if (user?.role !== 'super_admin') {
    return <AccessDenied message="Only super administrators are allowed to view or modify institutional configuration." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>Institutional Configuration</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage schools, departments, academic terms, and workload norms.</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] text-white font-semibold text-sm rounded-[var(--radius-buttons)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add {tabs.find((t) => t.key === tab)?.label.replace(/s$/, '')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-[var(--color-carbon)] text-white'
                  : 'text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tables */}
      {tab === 'schools' && (
        <DataTable
          columns={[
            { key: 'id', label: 'ID', sortable: true },
            { key: 'schoolName', label: 'School Name', sortable: true },
            { key: 'deanName', label: 'Dean', sortable: true },
            { key: 'isActive', label: 'Status', render: (r) => <Badge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
          ]}
          data={schools}
          searchKeys={['schoolName', 'deanName']}
          searchPlaceholder="Search schools..."
          actions={isSuperAdmin ? (row) => (
            <div className="flex gap-2 justify-end">
              <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDeactivateSchool(row.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {tab === 'departments' && (
        <DataTable
          columns={[
            { key: 'id', label: 'ID', sortable: true },
            { key: 'deptName', label: 'Department', sortable: true },
            { key: 'schoolId', label: 'School', sortable: true, render: (r) => schools.find((s) => s.id === r.schoolId)?.schoolName || r.schoolId },
            { key: 'defaultBatchSize', label: 'Batch Size' },
            { key: 'isActive', label: 'Status', render: (r) => <Badge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
          ]}
          data={departments}
          searchKeys={['deptName']}
          searchPlaceholder="Search departments..."
          actions={isSuperAdmin ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {tab === 'terms' && (
        <DataTable
          columns={[
            { key: 'id', label: 'ID', sortable: true },
            { key: 'academicYear', label: 'Academic Year', sortable: true },
            { key: 'semester', label: 'Semester', sortable: true },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
            { key: 'startDate', label: 'Start', render: (r) => new Date(r.startDate).toLocaleDateString() },
            { key: 'endDate', label: 'End', render: (r) => new Date(r.endDate).toLocaleDateString() },
          ]}
          data={terms}
          searchKeys={['academicYear', 'semester']}
          searchPlaceholder="Search terms..."
          actions={isSuperAdmin ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {tab === 'norms' && (
        <DataTable
          columns={[
            { key: 'designation', label: 'Designation', sortable: true, render: (r) => r.designation.replace('_', ' ') },
            { key: 'minWeeklyHours', label: 'Min Hours' },
            { key: 'maxWeeklyHours', label: 'Max Hours' },
            { key: 'defaultTheoryMultiplier', label: 'Theory Mult.' },
            { key: 'defaultPracticalMultiplier', label: 'Practical Mult.' },
            { key: 'slaDaysForHodReview', label: 'SLA Days' },
          ]}
          data={norms}
          actions={isSuperAdmin ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {/* Modal Forms */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'Add'} ${tabs.find((t) => t.key === tab)?.label.replace(/s$/, '')}`}>
        <div className="space-y-4">
          {tab === 'schools' && (
            <>
              <div>
                <label className={labelClass}>School Name *</label>
                <input className={inputClass} value={formData.schoolName || ''} onChange={(e) => updateField('schoolName', e.target.value)} placeholder="e.g. School of Engineering" />
              </div>
              <div>
                <label className={labelClass}>Dean Name</label>
                <input className={inputClass} value={formData.deanName || ''} onChange={(e) => updateField('deanName', e.target.value)} placeholder="e.g. Dr. Sharma" />
              </div>
            </>
          )}

          {tab === 'departments' && (
            <>
              <div>
                <label className={labelClass}>Department Name *</label>
                <input className={inputClass} value={formData.deptName || ''} onChange={(e) => updateField('deptName', e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              <div>
                <label className={labelClass}>School *</label>
                <select className={inputClass} value={formData.schoolId || ''} onChange={(e) => updateField('schoolId', e.target.value)}>
                  <option value="">Select School</option>
                  {schools.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.schoolName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Default Batch Size</label>
                <input className={inputClass} type="number" value={formData.defaultBatchSize || 30} onChange={(e) => updateField('defaultBatchSize', e.target.value)} />
              </div>
            </>
          )}

          {tab === 'terms' && (
            <>
              <div>
                <label className={labelClass}>Academic Year *</label>
                <input className={inputClass} value={formData.academicYear || ''} onChange={(e) => updateField('academicYear', e.target.value)} placeholder="e.g. 2024-25" />
              </div>
              <div>
                <label className={labelClass}>Semester *</label>
                <select className={inputClass} value={formData.semester || ''} onChange={(e) => updateField('semester', e.target.value)}>
                  <option value="Odd">Odd</option>
                  <option value="Even">Even</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input className={inputClass} type="date" value={formData.startDate || ''} onChange={(e) => updateField('startDate', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>End Date *</label>
                  <input className={inputClass} type="date" value={formData.endDate || ''} onChange={(e) => updateField('endDate', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {tab === 'norms' && (
            <>
              <div>
                <label className={labelClass}>Designation *</label>
                <select className={inputClass} value={formData.designation || ''} onChange={(e) => updateField('designation', e.target.value)}>
                  <option value="Professor">Professor</option>
                  <option value="Associate_Professor">Associate Professor</option>
                  <option value="Assistant_Professor">Assistant Professor</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Effective Term *</label>
                <select className={inputClass} value={formData.effectiveTermId || ''} onChange={(e) => updateField('effectiveTermId', e.target.value)}>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.semester}, {t.academicYear}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Min Weekly Hours</label>
                  <input className={inputClass} type="number" step="0.5" value={formData.minWeeklyHours ?? ''} onChange={(e) => updateField('minWeeklyHours', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Max Weekly Hours</label>
                  <input className={inputClass} type="number" step="0.5" value={formData.maxWeeklyHours ?? ''} onChange={(e) => updateField('maxWeeklyHours', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Theory Multiplier</label>
                  <input className={inputClass} type="number" step="0.1" value={formData.defaultTheoryMultiplier ?? ''} onChange={(e) => updateField('defaultTheoryMultiplier', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Practical Multiplier</label>
                  <input className={inputClass} type="number" step="0.1" value={formData.defaultPracticalMultiplier ?? ''} onChange={(e) => updateField('defaultPracticalMultiplier', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>SLA Days for HOD Review</label>
                <input className={inputClass} type="number" value={formData.slaDaysForHodReview ?? 3} onChange={(e) => updateField('slaDaysForHodReview', e.target.value)} />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] rounded-[var(--radius-buttons)] hover:bg-[var(--color-fog)] transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] rounded-[var(--radius-buttons)] transition-all disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
