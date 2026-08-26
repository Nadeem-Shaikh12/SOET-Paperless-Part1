import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '..\/lib/api-client';
import { useAuthStore } from '..\/stores/auth';
import { DataTable } from '..\/components/ui/DataTable';
import { Modal } from '..\/components/ui/Modal';
import { Badge } from '..\/components/ui/Badge';
import { AccessDenied } from '..\/components/ui/AccessDenied';
import { Plus, Pencil, Trash2, Loader2, UserMinus, UserCheck, Crown } from 'lucide-react';

export default function FacultyPage() {
  const { user } = useAuthStore();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; faculty: any }>({ open: false, faculty: null });
  const [deactivateDate, setDeactivateDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fac, dept] = await Promise.all([
        apiClient<any[]>('/faculty'),
        apiClient<any[]>('/institutional/departments').catch(() => []),
      ]);
      setFaculty(fac);
      setDepartments(dept);
    } catch (err) {
      console.error('Failed to fetch faculty', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditItem(null);
    setFormData({
      name: '',
      email: '',
      designation: 'Assistant_Professor',
      deptId: departments[0]?.id || '',
      employmentType: 'Permanent',
      initialPassword: 'Changeme@123',
      isHod: false,
    });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      email: item.email,
      designation: item.designation,
      deptId: item.deptId,
      employmentType: item.employmentType,
      isHod: item.department?.hodId === item.id || item.userAuth?.role === 'dept_admin',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...formData, deptId: Number(formData.deptId) };
      if (editItem) {
        await apiClient(`/faculty/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiClient('/faculty', { method: 'POST', body: JSON.stringify(payload) });
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
    if (!confirm(`Are you sure you want to permanently delete ${item.name}? This will also remove their login account.`)) return;
    try {
      await apiClient(`/faculty/${item.id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateModal.faculty) return;
    setSaving(true);
    try {
      await apiClient(`/faculty/${deactivateModal.faculty.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ effectiveEndDate: deactivateDate || new Date().toISOString() }),
      });
      setDeactivateModal({ open: false, faculty: null });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (item: any) => {
    if (!confirm(`Are you sure you want to reactivate ${item.name}?`)) return;
    try {
      await apiClient(`/faculty/${item.id}/reactivate`, { method: 'PATCH' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate faculty');
    }
  };

  const updateField = (key: string, value: any) => setFormData((p: any) => ({ ...p, [key]: value }));
  const inputClass = 'w-full px-4 py-2.5 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all';
  const labelClass = 'block text-sm font-semibold text-[var(--foreground)] mb-1.5';

  const canManage = user?.role === 'super_admin' || user?.role === 'dept_admin';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" /></div>;
  }

  if (user?.role !== 'super_admin' && user?.role !== 'dept_admin') {
    return <AccessDenied message="Only administrators are allowed to view or manage faculty members." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>Faculty Management</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">Manage faculty members, their designations, and department affiliations.</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] text-white font-semibold text-sm rounded-[var(--radius-buttons)] transition-all">
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        )}
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Name', sortable: true, render: (r) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-carbon)] flex items-center justify-center text-white text-xs font-bold">{r.name.charAt(0)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[var(--foreground)]">{r.name}</p>
                  {(r.department?.hodId === r.id || r.userAuth?.role === 'dept_admin') && (
                    <Badge variant="warning">
                      <Crown className="w-3 h-3 mr-1 inline-block" /> HOD
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--foreground)] opacity-50">{r.email}</p>
              </div>
            </div>
          )},
          { key: 'designation', label: 'Designation', sortable: true, render: (r) => r.designation.replace('_', ' ') },
          { key: 'deptId', label: 'Department', sortable: true, render: (r) => departments.find((d) => d.id === r.deptId)?.deptName || `Dept #${r.deptId}` },
          { key: 'employmentType', label: 'Type', render: (r) => <Badge variant="info">{r.employmentType}</Badge> },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
        ]}
        data={faculty}
        searchKeys={['name', 'email']}
        searchPlaceholder="Search by name or email..."
        actions={canManage ? (row) => (
          <div className="flex gap-1">
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all" title="Edit"><Pencil className="w-4 h-4" /></button>
            {row.status === 'active' ? (
              <button onClick={() => setDeactivateModal({ open: true, faculty: row })} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 opacity-50 hover:opacity-100 transition-all" title="Deactivate"><UserMinus className="w-4 h-4" /></button>
            ) : (
              <button onClick={() => handleReactivate(row)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 opacity-50 hover:opacity-100 transition-all" title="Reactivate"><UserCheck className="w-4 h-4" /></button>
            )}
            <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-50 hover:opacity-100 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        ) : undefined}
      />

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Faculty' : 'Add Faculty'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Full Name *</label><input className={inputClass} value={formData.name || ''} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Dr. Priya Sharma" /></div>
            <div><label className={labelClass}>Email *</label><input className={inputClass} type="email" value={formData.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="e.g. priya@mgm.edu" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Designation *</label>
              <select className={inputClass} value={formData.designation || ''} onChange={(e) => updateField('designation', e.target.value)}>
                <option value="Professor">Professor</option>
                <option value="Associate_Professor">Associate Professor</option>
                <option value="Assistant_Professor">Assistant Professor</option>
              </select>
            </div>
            <div><label className={labelClass}>Department *</label>
              <select className={inputClass} value={formData.deptId || ''} onChange={(e) => updateField('deptId', e.target.value)}>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.deptName}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Employment Type *</label>
              <select className={inputClass} value={formData.employmentType || ''} onChange={(e) => updateField('employmentType', e.target.value)}>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Visiting">Visiting</option>
              </select>
            </div>
            {!editItem && (
              <div><label className={labelClass}>Login Password *</label><input className={inputClass} value={formData.initialPassword || ''} onChange={(e) => updateField('initialPassword', e.target.value)} placeholder="e.g. Faculty@123" /></div>
            )}
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.isHod || false} 
                onChange={(e) => updateField('isHod', e.target.checked)} 
                className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--color-carbon)] focus:ring-[var(--color-carbon)] bg-[var(--color-fog)] accent-[var(--color-carbon)]" 
              />
              <div>
                <span className="text-sm font-semibold text-[var(--foreground)]">Head of Department (HOD)</span>
                <p className="text-xs text-[var(--color-slate)] mt-0.5">
                  Promotes this faculty member to the Department Admin role. Any previous HOD for this department will be demoted to regular faculty.
                </p>
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] rounded-[var(--radius-buttons)] hover:bg-[var(--color-fog)] transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] rounded-[var(--radius-buttons)] transition-all disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Modal */}
      <Modal open={deactivateModal.open} onClose={() => setDeactivateModal({ open: false, faculty: null })} title="Deactivate Faculty" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground)] opacity-70">
            Are you sure you want to deactivate <span className="font-bold">{deactivateModal.faculty?.name}</span>? They will no longer be able to log in or be assigned new workload. Historical allocations will be preserved.
          </p>
          <div>
            <label className={labelClass}>Effective End Date</label>
            <input className={inputClass} type="date" value={deactivateDate} onChange={(e) => setDeactivateDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setDeactivateModal({ open: false, faculty: null })} className="px-4 py-2.5 text-sm font-medium text-[var(--foreground)] opacity-70 hover:opacity-100 rounded-xl hover:bg-[var(--surface-hover)] transition-all">Cancel</button>
            <button onClick={handleDeactivate} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Deactivate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
