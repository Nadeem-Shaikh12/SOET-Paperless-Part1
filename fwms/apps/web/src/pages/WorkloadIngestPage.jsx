import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/auth';
import { apiClient, getAccessToken } from '../lib/api-client';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import {
  UploadCloud,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X,
  Eye,
  Download,
  Sparkles,
  Info,
  ArrowLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────




// ─── Component ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export default function IngestPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [step, setStep] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState(null);

  const [previewData, setPreviewData] = useState(null);
  const [importedReport, setImportedReport] = useState(null);

  const isAdmin = user?.role === 'super_admin';

  // ── Load meta using apiClient (handles auth automatically) ────────────────

  useEffect(() => {
    const load = async () => {
      setMetaLoading(true);
      try {
        const termsList = await apiClient('/institutional/academic-terms');
        setTerms(termsList || []);

        // Auto-select the active term
        const active = (termsList || []).find((t) => t.status === 'active');
        if (active) setSelectedTermId(active.id);
        else if (termsList && termsList.length > 0) setSelectedTermId(termsList[0].id);

        if (isAdmin) {
          const deptsList = await apiClient('/institutional/departments');
          setDepartments(deptsList || []);
        } else if (user?.deptId) {
          setSelectedDeptId(user.deptId);
        }
      } catch (err) {
        setError(err?.message || 'Failed to load terms/departments');
      } finally {
        setMetaLoading(false);
      }
    };
    load();
  }, [isAdmin, user?.deptId]);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((f) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!allowed.includes(f.type) && !f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
      setError('Only JPEG, PNG, WEBP, PDF, XLSX, or CSV files are accepted.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File must be under 20 MB.');
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ── Submit (uses getAccessToken() from api-client) ─────────────────────────

  const resolvedDeptId = selectedDeptId || user?.deptId;

  const doIngest = async (dryRun) => {
    if (!file || !selectedTermId || !resolvedDeptId) {
      setError('Please select a term, department, and file before proceeding.');
      return null;
    }

    let ocrText = '';
    if (file.type.startsWith('image/')) {
      try {
        setLoadingMessage('Compressing image for OCR...');
        const resizedDataUrl = await resizeImage(file, 1600, 1600);

        setLoadingMessage('Extracting text locally (this may take a moment)...');
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(resizedDataUrl);
        ocrText = ret.data.text;
        await worker.terminate();
      } catch (err) {
        console.error('OCR Error:', err);
        throw new Error('Failed to perform local text extraction on the image.');
      }
    }

    setLoadingMessage('Analyzing with Gemini...');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('termId', String(selectedTermId));
    fd.append('deptId', String(resolvedDeptId));
    fd.append('dryRun', String(dryRun));
    if (ocrText) {
      fd.append('ocrText', ocrText);
    }

    const token = getAccessToken();

    const res = await fetch(`${API_BASE}/workload-report/ingest`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Request failed');
    return data;
  };

  const handlePreview = async () => {
    if (!file || !selectedTermId || !resolvedDeptId) {
      setError('Please select a term, department, and file before previewing.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await doIngest(true);
      if (!data) return;
      setPreviewData(data.data);
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Unexpected error during AI extraction');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doIngest(false);
      if (!data) return;
      setImportedReport(data.report);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Unexpected error during import');
    } finally {
      setLoading(false);
    }
  };

  const termLabel = (t: TermOption) =>
    `${t.academicYear} — Sem ${t.semester}${t.status === 'active' ? ' (Active)' : ''}`;

  const isPreviewReady = !!file && !!selectedTermId && !!resolvedDeptId;

  // ── Client-side Image Resizer ──────────────────────────────────────────────
  const resizeImage = (file, maxWidth = 1600, maxHeight = 1600) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(URL.createObjectURL(file)); // fallback to original
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing.'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSync = async () => {
    if (!importedReport) return;
    setIsSyncing(true);
    setError(null);
    try {
      const res = await apiClient(`/workload-report/${importedReport.id}/sync`, {
        method: 'POST',
      });
      if (res.error) throw new Error(res.error.message || 'Failed to sync');
      
      // Navigate to allocations or subjects page
      navigate('/allocations');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to publish workload');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workload-report')}
            className="p-2 rounded-lg hover:bg-[var(--color-fog)] text-[var(--color-graphite)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] font-heading flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[var(--color-signal-orange)]" />
              AI Document Import
            </h1>
            <p className="text-sm text-[var(--color-slate)] mt-0.5">
              Upload a scanned workload document or an Excel spreadsheet — AI / Algorithms will extract all data automatically
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
          <Info className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Free tier: 15 req/min · 1500/day</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'success'] as const).map((s, i) => {
          const done = (step === 'preview' && s === 'upload') || (step === 'success' && s !== 'success');
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                active ? 'bg-[var(--color-carbon)] text-white' : done ? 'bg-green-500 text-white' : 'bg-[var(--color-fog)] text-[var(--color-slate)]'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={active ? 'font-semibold text-[var(--foreground)] capitalize' : 'text-[var(--color-slate)] capitalize'}>
                {s === 'upload' ? 'Upload & Configure' : s === 'preview' ? 'AI Preview' : 'Import Complete'}
              </span>
              {i < 2 && <div className="w-8 h-px bg-[var(--border)]" />}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-5">

          {/* Config row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Term selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Academic Term
              </label>
              {metaLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--color-slate)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading terms…
                </div>
              ) : (
                <select
                  id="ingest-term-select"
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] disabled:opacity-50"
                  disabled={terms.length === 0}
                >
                  {terms.length === 0 ? (
                    <option value="">No terms available</option>
                  ) : (
                    <>
                      <option value="">Select term…</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>{termLabel(t)}</option>
                      ))}
                    </>
                  )}
                </select>
              )}
            </div>

            {/* Department selector (admin only; HOD auto-set) */}
            {isAdmin ? (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Department
                </label>
                {metaLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--color-slate)]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading departments…
                  </div>
                ) : (
                  <select
                    id="ingest-dept-select"
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] disabled:opacity-50"
                    disabled={departments.length === 0}
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments available</option>
                    ) : (
                      <>
                        <option value="">Select department…</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.deptName}</option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Department
                </label>
                <div className="h-10 px-3 flex items-center rounded-lg border border-[var(--border)] bg-[var(--color-fog)] text-sm text-[var(--color-graphite)]">
                  Your department (auto-selected)
                </div>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? 'border-[var(--color-signal-orange)] bg-orange-50'
                : file
                ? 'border-green-400 bg-green-50'
                : 'border-[var(--border)] hover:border-[var(--color-carbon)] hover:bg-[var(--color-fog)]'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="ingest-file-input"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {file ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[var(--foreground)]">{file.name}</p>
                  <p className="text-sm text-[var(--color-slate)] mt-1">
                    {(file.size / 1024).toFixed(1)} KB · {file.type}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-100 text-[var(--color-slate)] hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-fog)] flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 text-[var(--color-graphite)]" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-[var(--foreground)]">
                    Drop your document here or click to browse
                  </p>
                  <p className="text-sm text-[var(--color-slate)] mt-1">
                    Supports JPEG, PNG, WEBP, PDF, XLSX, CSV · Max 20 MB
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Tip */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Tip:</strong> Upload a clear, well-lit scan of the Workload Sheet, or an Excel/CSV file for 100% accuracy.
              Subjects with <strong>*</strong> (load taken by other dept) and <strong>**</strong> (load from other depts) are
              correctly flagged. A preview step lets you review all extracted data before it is saved.
            </p>
          </div>

          {/* Validation summary — shows what's missing */}
          {(!selectedTermId || !resolvedDeptId || !file) && (
            <div className="flex flex-wrap gap-2">
              {!selectedTermId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3" /> Select a term
                </span>
              )}
              {isAdmin && !selectedDeptId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3" /> Select a department
                </span>
              )}
              {!file && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3" /> Upload a file
                </span>
              )}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end">
            <button
              id="ingest-preview-btn"
              onClick={handlePreview}
              disabled={loading || !isPreviewReady}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-carbon)] text-white font-semibold text-sm hover:bg-[var(--color-graphite)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {loadingMessage || 'Processing...'}</>
              ) : (
                <><Eye className="w-4 h-4" /> Preview Extracted Data</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && previewData && (
        <div className="space-y-5">

          {/* Meta cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Document Type', value: previewData.documentType?.replace('_', ' ') || '—' },
              { label: 'Academic Year', value: previewData.academicYear || '—' },
              { label: 'Semester / Part', value: previewData.semesterPart || '—' },
              { label: 'Quality', value: previewData.extractionMetadata?.documentQuality?.replace(/_/g, ' ') || '—' },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <p className="text-xs text-[var(--color-slate)] uppercase tracking-wide">{m.label}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)] capitalize">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Department / School from document */}
          {(previewData.school || previewData.department) && (
            <div className="px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]">
              <span className="text-[var(--color-slate)]">Detected from document: </span>
              <strong>{previewData.school}</strong>
              {previewData.department && <> — <strong>{previewData.department}</strong></>}
            </div>
          )}

          {/* Warnings */}
          {previewData.extractionMetadata?.warningFlags?.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Extraction warnings</p>
                <ul className="mt-1 space-y-0.5">
                  {previewData.extractionMetadata.warningFlags.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700">• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Subjects table */}
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)] mb-3">
              Extracted Subjects ({previewData.subjects?.length ?? 0})
            </h2>

            {(!previewData.subjects || previewData.subjects.length === 0) ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <p className="text-sm font-medium text-[var(--foreground)]">No subjects detected</p>
                <p className="text-xs text-[var(--color-slate)]">
                  The AI could not find subject rows in this document. Try a clearer scan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-[var(--color-carbon)] text-white">
                      {['#', 'Program/Class', 'Subject Name', 'Div', 'Theory/wk', 'Total Theory', 'Batches', 'Prac/wk', 'Total Prac', 'Tutorial', 'Total Hrs', 'L', 'P', 'T', 'Flags'].map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.subjects.map((s, i) => (
                      <tr key={i} className={`border-t border-[var(--border)] ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--background)]'}`}>
                        <td className="px-2 py-2 text-[var(--color-slate)]">{s.srNo}</td>
                        <td className="px-2 py-2 font-medium text-[var(--foreground)] whitespace-nowrap">{s.programClass}</td>
                        <td className="px-2 py-2 text-[var(--foreground)] max-w-[200px] truncate" title={s.subjectName}>
                          {s.subjectName}
                          {s.isAuditCourse && (
                            <span className="ml-1 text-[10px] font-bold text-purple-500 bg-purple-50 px-1 rounded">AUDIT</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">{s.noOfDivisions}</td>
                        <td className="px-2 py-2 text-center">{s.theoryHrsPerWeek}</td>
                        <td className="px-2 py-2 text-center">{s.totalTheoryHrs}</td>
                        <td className="px-2 py-2 text-center">{s.noOfBatches}</td>
                        <td className="px-2 py-2 text-center">{s.practicalHrsPerWeek}</td>
                        <td className="px-2 py-2 text-center">{s.totalPracticalHrs}</td>
                        <td className="px-2 py-2 text-center">{s.tutorialHrsPerWeek}</td>
                        <td className="px-2 py-2 text-center font-bold text-[var(--color-signal-orange)]">
                          {s.totalTeachingHours}
                        </td>
                        <td className="px-2 py-2 text-center">{s.creditL}</td>
                        <td className="px-2 py-2 text-center">{s.creditP}</td>
                        <td className="px-2 py-2 text-center">{s.creditT}</td>
                        <td className="px-2 py-2 text-center text-[11px] font-bold space-x-1">
                          {s.isLoadTakenByOtherDept && <span className="text-blue-500" title="Load taken by other dept">*</span>}
                          {s.isLoadFromOtherDept && <span className="text-green-600" title="Load from other dept">**</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  {previewData.subjects.length > 0 && (
                    <tfoot>
                      <tr className="bg-[var(--color-carbon)] text-white font-semibold">
                        <td colSpan={5} className="px-2 py-2 text-right">TOTAL</td>
                        <td className="px-2 py-2 text-center">
                          {previewData.subjects.reduce((s, r) => s + (r.totalTheoryHrs || 0), 0)}
                        </td>
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-center">
                          {previewData.subjects.reduce((s, r) => s + (r.totalPracticalHrs || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {previewData.subjects.reduce((s, r) => s + (r.tutorialHrsPerWeek || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center text-[var(--color-signal-orange)]">
                          {previewData.subjects.reduce((s, r) => s + (r.totalTeachingHours || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {previewData.subjects.reduce((s, r) => s + (r.creditL || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {previewData.subjects.reduce((s, r) => s + (r.creditP || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {previewData.subjects.reduce((s, r) => s + (r.creditT || 0), 0)}
                        </td>
                        <td className="px-2 py-2" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-slate)]">
            <span><span className="font-bold text-blue-500">*</span> = Load taken by another department</span>
            <span><span className="font-bold text-green-600">**</span> = Load from another department</span>
            <span><span className="font-bold text-purple-500">AUDIT</span> = Audit course (0 credits)</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => { setStep('upload'); setPreviewData(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Upload
            </button>
            <button
              id="ingest-confirm-btn"
              onClick={handleConfirmImport}
              disabled={loading || !previewData?.subjects?.length}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Download className="w-4 h-4" /> Confirm & Import {previewData.subjects?.length ?? 0} Rows</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Success ── */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center gap-6 py-16">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Import Successful!</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2">
              {previewData?.subjects?.length ?? importedReport?.rows?.length ?? 0} subject rows have been saved to the Workload Report.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setPreviewData(null);
                setImportedReport(null);
                setError(null);
              }}
              className="px-4 py-2 rounded-lg text-sm border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--color-fog)] transition-colors"
            >
              Import Another
            </button>
            <button
              onClick={() => navigate('/workload-report')}
              className="px-4 py-2 rounded-lg text-sm bg-[var(--color-carbon)] text-white font-semibold hover:bg-[var(--color-graphite)] transition-colors"
            >
              View Report
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-5 py-2 rounded-lg text-sm bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publish to Master Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
