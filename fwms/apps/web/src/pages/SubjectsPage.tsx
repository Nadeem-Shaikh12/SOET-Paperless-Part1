import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '..\/lib/api-client';
import { useAuthStore } from '..\/stores/auth';
import { DataTable } from '..\/components/ui/DataTable';
import { Modal } from '..\/components/ui/Modal';
import { Badge } from '..\/components/ui/Badge';
import { AccessDenied } from '..\/components/ui/AccessDenied';
import { Plus, Pencil, Trash2, BookOpen, LayoutGrid, FlaskConical, Users, Loader2 } from 'lucide-react';

type Tab = 'subjects' | 'classes' | 'batches' | 'strength';

export default function SubjectsClassesPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('subjects');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [strengths, setStrengths] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subj, cls, bat, str, dept, trm, fac] = await Promise.all([
        apiClient<any[]>('/subjects'),
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/classes/batches'),
        apiClient<any[]>('/student-strength'),
        apiClient<any[]>('/institutional/departments'),
        apiClient<any[]>('/institutional/academic-terms'),
        apiClient<any[]>('/faculty'),
      ]);
      setSubjects(subj);
      setClasses(cls);
      setBatches(bat);
      setStrengths(str);
      setDepartments(dept);
      setTerms(trm);
      setFaculty(fac);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setFormData(getDefaultForm()); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormData({ ...item }); setModalOpen(true); };

  const activeTerm = terms.find((t) => t.status === 'active');

  const getDefaultForm = () => {
    switch (tab) {
      case 'subjects': return { subjectCode: '', subjectName: '', deptId: departments[0]?.id || '', hasTheory: true, hasPractical: false, hasTutorial: false, creditHours: 3, theoryMultiplier: 1.0, practicalMultiplier: 2.0, termId: activeTerm?.id || '' };
      case 'classes': return { className: '', division: 'A', deptId: departments[0]?.id || '', termId: activeTerm?.id || '' };
      case 'batches': return { classId: classes[0]?.id || '', subjectId: subjects[0]?.id || '', batchName: '', batchSize: 30, facultyId: faculty[0]?.id || '', termId: activeTerm?.id || '' };
      case 'strength': return { classId: classes[0]?.id || '', subjectId: subjects[0]?.id || '', studentCount: 0, termId: activeTerm?.id || '' };
      default: return {};
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'subjects') {
        const payload = { ...formData, deptId: Number(formData.deptId), termId: Number(formData.termId), creditHours: Number(formData.creditHours), theoryMultiplier: Number(formData.theoryMultiplier), practicalMultiplier: Number(formData.practicalMultiplier) };
        if (editItem) await apiClient(`/subjects/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        else await apiClient('/subjects', { method: 'POST', body: JSON.stringify(payload) });
      } else if (tab === 'classes') {
        const payload = { ...formData, deptId: Number(formData.deptId), termId: Number(formData.termId) };
        if (editItem) await apiClient(`/classes/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        else await apiClient('/classes', { method: 'POST', body: JSON.stringify(payload) });
      } else if (tab === 'batches') {
        const payload = { ...formData, classId: Number(formData.classId), subjectId: Number(formData.subjectId), batchSize: Number(formData.batchSize), facultyId: Number(formData.facultyId), termId: Number(formData.termId) };
        await apiClient(`/classes/${payload.classId}/batches`, { method: 'POST', body: JSON.stringify(payload) });
      } else if (tab === 'strength') {
        const payload = { classId: Number(formData.classId), subjectId: Number(formData.subjectId), studentCount: Number(formData.studentCount), termId: Number(formData.termId) };
        await apiClient('/student-strength', { method: 'POST', body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      let endpoint = '';
      if (tab === 'subjects') endpoint = `/subjects/${item.id}`;
      else if (tab === 'classes') endpoint = `/classes/${item.id}`;
      else if (tab === 'batches') endpoint = `/classes/batches/${item.id}`;
      else if (tab === 'strength') endpoint = `/student-strength/${item.id}`;

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
    { key: 'subjects', label: 'Subjects', icon: BookOpen },
    { key: 'classes', label: 'Classes', icon: LayoutGrid },
    { key: 'batches', label: 'Batches', icon: FlaskConical },
    { key: 'strength', label: 'Student Strength', icon: Users },
  ];

  const canManage = user?.role === 'super_admin' || user?.role === 'dept_admin';
  const canAdd = tab === 'strength' || canManage;

  const inputClass = 'w-full px-4 py-2.5 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all';
  const labelClass = 'block text-sm font-semibold text-[var(--foreground)] mb-1.5';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" /></div>;
  }

  if (user?.role !== 'super_admin' && user?.role !== 'dept_admin' && user?.role !== 'faculty') {
    return <AccessDenied message="You do not have permission to view this page." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>Subjects & Classes</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage subjects, classes, practical batches, and student strength records.</p>
        </div>
        {canAdd && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] text-white font-semibold text-sm rounded-[var(--radius-buttons)] transition-all">
            <Plus className="w-4 h-4" />
            Add {tabs.find((t) => t.key === tab)?.label.replace(/s$/, '').replace('Student Strengt', 'Student Strength')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-[var(--color-carbon)] text-white' : 'text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)]'}`}
            ><Icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span></button>
          );
        })}
      </div>

      {/* Tables */}
      {tab === 'subjects' && (
        <DataTable columns={[
          { key: 'subjectCode', label: 'Code', sortable: true },
          { key: 'subjectName', label: 'Subject Name', sortable: true },
          { key: 'deptId', label: 'Department', render: (r) => departments.find((d) => d.id === r.deptId)?.deptName || r.deptId },
          { key: 'creditHours', label: 'Credits' },
          { key: 'hasTheory', label: 'Theory', render: (r) => r.hasTheory ? <Badge variant="success">Yes</Badge> : <Badge variant="neutral">No</Badge> },
          { key: 'hasPractical', label: 'Practical', render: (r) => r.hasPractical ? <Badge variant="info">Yes</Badge> : <Badge variant="neutral">No</Badge> },
        ]} data={subjects} searchKeys={['subjectCode', 'subjectName']} searchPlaceholder="Search subjects..."
          actions={canManage ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {tab === 'classes' && (
        <DataTable columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'className', label: 'Class', sortable: true },
          { key: 'division', label: 'Division', sortable: true },
          { key: 'deptId', label: 'Department', render: (r) => departments.find((d) => d.id === r.deptId)?.deptName || r.deptId },
        ]} data={classes} searchKeys={['className', 'division']} searchPlaceholder="Search classes..."
          actions={canManage ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {tab === 'batches' && (
        <DataTable columns={[
          { key: 'batchName', label: 'Batch', sortable: true },
          { key: 'classId', label: 'Class', render: (r) => { const c = classes.find((cl) => cl.id === r.classId); return c ? `${c.className} ${c.division}` : r.classId; } },
          { key: 'subjectId', label: 'Subject', render: (r) => subjects.find((s) => s.id === r.subjectId)?.subjectName || r.subjectId },
          { key: 'batchSize', label: 'Size' },
          { key: 'facultyId', label: 'Faculty', render: (r) => faculty.find((f) => f.id === r.facultyId)?.name || r.facultyId },
        ]} data={batches} searchKeys={['batchName']} searchPlaceholder="Search batches..."
          actions={canManage ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {tab === 'strength' && (
        <DataTable columns={[
          { key: 'classId', label: 'Class', render: (r) => { const c = classes.find((cl) => cl.id === r.classId); return c ? `${c.className} ${c.division}` : r.classId; } },
          { key: 'subjectId', label: 'Subject', render: (r) => subjects.find((s) => s.id === r.subjectId)?.subjectName || r.subjectId },
          { key: 'studentCount', label: 'Students', sortable: true },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status.replace('_', ' ')}</Badge> },
        ]} data={strengths}
          actions={canManage ? (row) => (
            <div className="flex gap-2">
              <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : undefined}
        />
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editItem ? 'Edit' : 'Add'} ${tabs.find((t) => t.key === tab)?.label.replace(/s$/, '')}`} size="lg">
        <div className="space-y-4">
          {tab === 'subjects' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Subject Code *</label><input className={inputClass} value={formData.subjectCode || ''} onChange={(e) => updateField('subjectCode', e.target.value)} placeholder="e.g. CS101" /></div>
                <div><label className={labelClass}>Credits *</label><input className={inputClass} type="number" step="0.5" value={formData.creditHours ?? ''} onChange={(e) => updateField('creditHours', e.target.value)} /></div>
              </div>
              <div><label className={labelClass}>Subject Name *</label><input className={inputClass} value={formData.subjectName || ''} onChange={(e) => updateField('subjectName', e.target.value)} placeholder="e.g. Data Structures" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Department *</label>
                  <select className={inputClass} value={formData.deptId || ''} onChange={(e) => updateField('deptId', e.target.value)}>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.deptName}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Term *</label>
                  <select className={inputClass} value={formData.termId || ''} onChange={(e) => updateField('termId', e.target.value)}>
                    {terms.map((t) => <option key={t.id} value={t.id}>{t.semester}, {t.academicYear}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input type="checkbox" checked={formData.hasTheory || false} onChange={(e) => updateField('hasTheory', e.target.checked)} className="w-4 h-4 rounded border-[var(--border)] text-[var(--color-carbon)] accent-[var(--color-carbon)]" /> Theory
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input type="checkbox" checked={formData.hasPractical || false} onChange={(e) => updateField('hasPractical', e.target.checked)} className="w-4 h-4 rounded border-[var(--border)] text-[var(--color-carbon)] accent-[var(--color-carbon)]" /> Practical
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input type="checkbox" checked={formData.hasTutorial || false} onChange={(e) => updateField('hasTutorial', e.target.checked)} className="w-4 h-4 rounded border-[var(--border)] text-[var(--color-carbon)] accent-[var(--color-carbon)]" /> Tutorial
                </label>
              </div>
            </>
          )}

          {tab === 'classes' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Class Name *</label><input className={inputClass} value={formData.className || ''} onChange={(e) => updateField('className', e.target.value)} placeholder="e.g. SE" /></div>
                <div><label className={labelClass}>Division *</label><input className={inputClass} value={formData.division || ''} onChange={(e) => updateField('division', e.target.value)} placeholder="e.g. A" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Department *</label>
                  <select className={inputClass} value={formData.deptId || ''} onChange={(e) => updateField('deptId', e.target.value)}>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.deptName}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Term *</label>
                  <select className={inputClass} value={formData.termId || ''} onChange={(e) => updateField('termId', e.target.value)}>
                    {terms.map((t) => <option key={t.id} value={t.id}>{t.semester}, {t.academicYear}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === 'batches' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Batch Name *</label><input className={inputClass} value={formData.batchName || ''} onChange={(e) => updateField('batchName', e.target.value)} placeholder="e.g. B1" /></div>
                <div><label className={labelClass}>Batch Size *</label><input className={inputClass} type="number" value={formData.batchSize ?? 30} onChange={(e) => updateField('batchSize', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Class *</label>
                  <select className={inputClass} value={formData.classId || ''} onChange={(e) => updateField('classId', e.target.value)}>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.className} {c.division}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Subject *</label>
                  <select className={inputClass} value={formData.subjectId || ''} onChange={(e) => updateField('subjectId', e.target.value)}>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelClass}>Assigned Faculty *</label>
                <select className={inputClass} value={formData.facultyId || ''} onChange={(e) => updateField('facultyId', e.target.value)}>
                  {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </>
          )}

          {tab === 'strength' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Class *</label>
                  <select className={inputClass} value={formData.classId || ''} onChange={(e) => updateField('classId', e.target.value)}>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.className} {c.division}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Subject *</label>
                  <select className={inputClass} value={formData.subjectId || ''} onChange={(e) => updateField('subjectId', e.target.value)}>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelClass}>Student Count *</label><input className={inputClass} type="number" value={formData.studentCount ?? 0} onChange={(e) => updateField('studentCount', e.target.value)} /></div>
            </>
          )}

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
