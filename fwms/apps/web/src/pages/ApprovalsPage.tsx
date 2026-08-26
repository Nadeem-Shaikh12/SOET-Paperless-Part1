import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '..\/lib/api-client';
import { useAuthStore } from '..\/stores/auth';
import { DataTable } from '..\/components/ui/DataTable';
import { Modal } from '..\/components/ui/Modal';
import { Badge } from '..\/components/ui/Badge';
import { AccessDenied } from '..\/components/ui/AccessDenied';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ open: boolean; item: any; action: 'approved' | 'rejected' }>({ open: false, item: null, action: 'approved' });
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending items
      const data = await apiClient<any>(`/approvals/pending`);
      
      const items = [
        ...(data.allocations || []).map((a: any) => ({
          entityType: 'allocation',
          entityId: a.id,
          description: `Allocation: ${a.faculty?.name} - ${a.subject?.subjectCode} ${a.subject?.subjectName}`,
          status: a.status,
          date: a.updatedAt
        })),
        ...(data.strengths || []).map((s: any) => ({
          entityType: 'student_strength',
          entityId: s.id,
          description: `Student Strength: ${s.classDivision?.className} ${s.classDivision?.division} - ${s.subject?.subjectCode} (${s.studentCount} students)`,
          status: s.status,
          date: s.updatedAt
        }))
      ];
      
      setPendingItems(items);
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAction = (item: any, action: 'approved' | 'rejected') => {
    setActionModal({ open: true, item, action });
    setRemarks('');
  };

  const handleAction = async () => {
    if (!actionModal.item) return;
    setSaving(true);
    try {
      await apiClient('/approvals/decide', {
        method: 'POST',
        body: JSON.stringify({
          entityType: actionModal.item.entityType,
          entityId: actionModal.item.entityId,
          decision: actionModal.action,
          remarks
        }),
      });
      setActionModal({ open: false, item: null, action: 'approved' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const canReview = user?.role === 'super_admin' || user?.role === 'dept_admin';
  const inputClass = 'w-full px-4 py-2.5 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" /></div>;
  }

  if (user?.role !== 'super_admin' && user?.role !== 'dept_admin') {
    return <AccessDenied message="Only administrators are allowed to view or act on approval requests." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>Pending Approvals</h1>
        <p className="text-sm text-[var(--color-slate)] mt-1">Review and manage change requests from faculty members.</p>
      </div>

      <DataTable
        columns={[
          { key: 'entityType', label: 'Type', sortable: true, render: (r) => <Badge variant="info">{r.entityType.replace('_', ' ')}</Badge> },
          { key: 'description', label: 'Description', sortable: true },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status.replace(/_/g, ' ')}</Badge> },
          { key: 'date', label: 'Last Updated', sortable: true, render: (r) => new Date(r.date).toLocaleDateString() },
        ]}
        data={pendingItems}
        emptyMessage="No pending approval requests found."
        actions={canReview ? (row) => {
          return (
            <div className="flex gap-1">
              <button onClick={() => openAction(row, 'approved')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-all" title="Approve"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => openAction(row, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all" title="Reject"><XCircle className="w-4 h-4" /></button>
            </div>
          );
        } : undefined}
      />

      <Modal open={actionModal.open} onClose={() => setActionModal({ open: false, item: null, action: 'approved' })} title={actionModal.action === 'approved' ? 'Approve Request' : 'Reject Request'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground)] opacity-70">
            Are you sure you want to <span className="font-bold">{actionModal.action === 'approved' ? 'approve' : 'reject'}</span> this request?
          </p>
          <div className="p-3 bg-[var(--surface-hover)] rounded-lg text-sm border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)] block mb-1">Details:</span>
            {actionModal.item?.description}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1.5">Remarks (optional)</label>
            <textarea className={inputClass} rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add any comments..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setActionModal({ open: false, item: null, action: 'approved' })} className="px-4 py-2.5 text-sm font-medium text-[var(--foreground)] opacity-70 hover:opacity-100 rounded-xl hover:bg-[var(--surface-hover)] transition-all">Cancel</button>
            <button onClick={handleAction} disabled={saving}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition-all disabled:opacity-60 flex items-center gap-2 ${actionModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionModal.action === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
