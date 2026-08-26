import { useState, useMemo, useCallback, useEffect } from 'react';
import { Pencil, Save, X, Plus, Trash2, RefreshCw, Printer } from 'lucide-react';

type ReportRow = {
  id?: number;
  sortOrder: number;
  programClass: string;
  subjectName: string;
  divisions: number;
  theoryHrsPerWeek: number;
  totalTheoryHrs: number;
  batches: number;
  practicalHrsPerWeek: number;
  totalPracticalHrs: number;
  tutorialHrsPerWeek: number;
  totalTeachingHours: number;
  creditsL: number;
  creditsP: number;
  creditsT: number;
  noteMarker?: string | null;
};

type ReportData = {
  id: number;
  deptId: number;
  termId: number;
  title: string;
  notes?: string | null;
  department: {
    deptName: string;
    school: { schoolName: string };
  };
  term: {
    academicYear: string;
    semester: string;
  };
  rows: ReportRow[];
};

type Props = {
  report: ReportData;
  onSave: (reportId: number, data: { title?: string; notes?: string; rows: ReportRow[] }) => Promise<void>;
  onRegenerate: () => Promise<void>;
  saving: boolean;
};

// Helper to compute derived fields
function computeRow(row: ReportRow): ReportRow {
  const totalTheoryHrs = row.divisions * row.theoryHrsPerWeek;
  const totalPracticalHrs = row.batches * row.practicalHrsPerWeek;
  const totalTeachingHours = totalTheoryHrs + totalPracticalHrs + row.tutorialHrsPerWeek;
  return { ...row, totalTheoryHrs, totalPracticalHrs, totalTeachingHours };
}

function emptyRow(sortOrder: number): ReportRow {
  return {
    sortOrder,
    programClass: '',
    subjectName: '',
    divisions: 1,
    theoryHrsPerWeek: 0,
    totalTheoryHrs: 0,
    batches: 0,
    practicalHrsPerWeek: 0,
    totalPracticalHrs: 0,
    tutorialHrsPerWeek: 0,
    totalTeachingHours: 0,
    creditsL: 0,
    creditsP: 0,
    creditsT: 0,
    noteMarker: null,
  };
}

export function WorkloadReportDocument({ report, onSave, onRegenerate, saving }: Props) {
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState<ReportRow[]>([]);
  const [editTitle, setEditTitle] = useState(report.title);
  const [editNotes, setEditNotes] = useState(report.notes || '');

  useEffect(() => {
    setEditRows(report.rows.map(r => ({ ...r })));
    setEditTitle(report.title);
    setEditNotes(report.notes || '');
  }, [report]);

  const displayRows = editing ? editRows : report.rows;

  // Totals
  const totals = useMemo(() => {
    return displayRows.reduce(
      (acc, row) => {
        acc.totalTheory += row.totalTheoryHrs;
        acc.totalPractical += row.totalPracticalHrs;
        acc.totalTutorial += row.tutorialHrsPerWeek;
        acc.totalTeaching += row.totalTeachingHours;
        acc.totalCreditsL += row.creditsL;
        acc.totalCreditsP += row.creditsP;
        acc.totalCreditsT += row.creditsT;
        return acc;
      },
      { totalTheory: 0, totalPractical: 0, totalTutorial: 0, totalTeaching: 0, totalCreditsL: 0, totalCreditsP: 0, totalCreditsT: 0 }
    );
  }, [displayRows]);

  const startEditing = () => {
    setEditRows(report.rows.map(r => ({ ...r })));
    setEditTitle(report.title);
    setEditNotes(report.notes || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditRows(report.rows.map(r => ({ ...r })));
    setEditing(false);
  };

  const handleSave = async () => {
    await onSave(report.id, { title: editTitle, notes: editNotes, rows: editRows });
    setEditing(false);
  };

  const updateCell = useCallback((index: number, field: keyof ReportRow, value: string | number) => {
    setEditRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };
      updated[index] = computeRow(row);
      return updated;
    });
  }, []);

  const addRow = useCallback(() => {
    setEditRows(prev => [...prev, emptyRow(prev.length + 1)]);
  }, []);

  const deleteRow = useCallback((index: number) => {
    setEditRows(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Group rows by programClass for the grouped display
  const groupedRows = useMemo(() => {
    const groups: { programClass: string; rows: (ReportRow & { globalIndex: number })[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;

    displayRows.forEach((row, index) => {
      if (!currentGroup || currentGroup.programClass !== row.programClass) {
        currentGroup = { programClass: row.programClass, rows: [] };
        groups.push(currentGroup);
      }
      currentGroup.rows.push({ ...row, globalIndex: index });
    });

    return groups;
  }, [displayRows]);

  const semester = report.term.semester;
  const semesterPart = semester.toLowerCase().includes('odd') ? 'Part 1' : 'Part 2';

  return (
    <div className="workload-report-wrapper">
      {/* Toolbar — hidden during print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-xl font-bold text-[var(--foreground)] font-heading" style={{ letterSpacing: '-0.02em' }}>
          Teaching Workload Report
        </h1>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-carbon)] text-white hover:bg-[var(--color-graphite)] transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all"
                title="Regenerate from current subjects/classes data"
              >
                <RefreshCw className="w-4 h-4" /> Regenerate
              </button>
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-carbon)] text-white hover:bg-[var(--color-graphite)] transition-all"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-cards)] shadow-sm p-8 print:border-none print:shadow-none print:p-0 print:rounded-none">

        {/* Header */}
        <div className="text-center mb-6 border-b border-[var(--border)] pb-6">
          <h2 className="text-lg font-bold text-[var(--foreground)] uppercase tracking-wide">
            MGM University, Chhatrapati Sambhajinagar
          </h2>
          <p className="text-sm text-[var(--color-graphite)] mt-1">
            Academic Year {report.term.academicYear} ({semesterPart})
          </p>
          <p className="text-sm text-[var(--color-graphite)] mt-0.5">
            {report.department.school.schoolName}
          </p>
          <p className="text-sm font-semibold text-[var(--foreground)] mt-1">
            {report.department.deptName}
          </p>
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="mt-2 text-base font-bold text-center border-b border-[var(--color-signal-orange)] bg-transparent outline-none text-[var(--foreground)] w-64"
            />
          ) : (
            <h3 className="text-base font-bold text-[var(--foreground)] mt-2 underline underline-offset-4">
              {report.title}
            </h3>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse workload-table">
            <thead>
              <tr className="bg-[var(--color-fog)]">
                <th rowSpan={2} className="wr-th">Sr.<br/>No.</th>
                <th rowSpan={2} className="wr-th min-w-[100px]">Program /<br/>Class</th>
                <th rowSpan={2} className="wr-th min-w-[140px]">Name of Course /<br/>Subject</th>
                <th colSpan={3} className="wr-th">Theory</th>
                <th colSpan={3} className="wr-th">Practical</th>
                <th rowSpan={2} className="wr-th">Tutorial<br/>Hrs/wk</th>
                <th rowSpan={2} className="wr-th">Total<br/>Teaching<br/>Hours</th>
                <th colSpan={3} className="wr-th">Credits</th>
                {editing && <th rowSpan={2} className="wr-th print:hidden">Actions</th>}
              </tr>
              <tr className="bg-[var(--color-fog)]">
                <th className="wr-th">Div.</th>
                <th className="wr-th">Hrs/<br/>wk</th>
                <th className="wr-th">Total</th>
                <th className="wr-th">Batch</th>
                <th className="wr-th">Hrs/<br/>wk</th>
                <th className="wr-th">Total</th>
                <th className="wr-th">L</th>
                <th className="wr-th">P</th>
                <th className="wr-th">T</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group, gIdx) => (
                group.rows.map((row, rIdx) => {
                  const srNo = row.globalIndex + 1;
                  return (
                    <tr key={`${gIdx}-${rIdx}`} className="hover:bg-[var(--color-fog)]/50 transition-colors">
                      <td className="wr-td text-center font-medium">{srNo}</td>

                      {/* Program/Class */}
                      <td className="wr-td">
                        {editing ? (
                          <input type="text" value={row.programClass} onChange={e => updateCell(row.globalIndex, 'programClass', e.target.value)}
                            className="wr-input w-full" />
                        ) : (
                          <span className="font-medium">{row.programClass}</span>
                        )}
                      </td>

                      {/* Subject Name */}
                      <td className="wr-td">
                        {editing ? (
                          <input type="text" value={row.subjectName} onChange={e => updateCell(row.globalIndex, 'subjectName', e.target.value)}
                            className="wr-input w-full" />
                        ) : (
                          <>
                            {row.subjectName}
                            {row.noteMarker && <sup className="text-[var(--color-signal-orange)] font-bold ml-0.5">{row.noteMarker}</sup>}
                          </>
                        )}
                      </td>

                      {/* Theory: Divisions */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" value={row.divisions} onChange={e => updateCell(row.globalIndex, 'divisions', parseInt(e.target.value) || 0)}
                            className="wr-input w-14 text-center" />
                        ) : row.divisions}
                      </td>

                      {/* Theory: Hrs/wk */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" step="0.5" value={row.theoryHrsPerWeek} onChange={e => updateCell(row.globalIndex, 'theoryHrsPerWeek', parseFloat(e.target.value) || 0)}
                            className="wr-input w-14 text-center" />
                        ) : row.theoryHrsPerWeek}
                      </td>

                      {/* Theory: Total (computed) */}
                      <td className="wr-td text-center font-medium bg-[var(--color-fog)]/30">
                        {row.totalTheoryHrs}
                      </td>

                      {/* Practical: Batches */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" value={row.batches} onChange={e => updateCell(row.globalIndex, 'batches', parseInt(e.target.value) || 0)}
                            className="wr-input w-14 text-center" />
                        ) : row.batches}
                      </td>

                      {/* Practical: Hrs/wk */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" step="0.5" value={row.practicalHrsPerWeek} onChange={e => updateCell(row.globalIndex, 'practicalHrsPerWeek', parseFloat(e.target.value) || 0)}
                            className="wr-input w-14 text-center" />
                        ) : row.practicalHrsPerWeek}
                      </td>

                      {/* Practical: Total (computed) */}
                      <td className="wr-td text-center font-medium bg-[var(--color-fog)]/30">
                        {row.totalPracticalHrs}
                      </td>

                      {/* Tutorial */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" step="0.5" value={row.tutorialHrsPerWeek} onChange={e => updateCell(row.globalIndex, 'tutorialHrsPerWeek', parseFloat(e.target.value) || 0)}
                            className="wr-input w-14 text-center" />
                        ) : row.tutorialHrsPerWeek}
                      </td>

                      {/* Total Teaching Hours (computed) */}
                      <td className="wr-td text-center font-bold bg-[var(--color-fog)]/50">
                        {row.totalTeachingHours}
                      </td>

                      {/* Credits L */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" step="0.5" value={row.creditsL} onChange={e => updateCell(row.globalIndex, 'creditsL', parseFloat(e.target.value) || 0)}
                            className="wr-input w-12 text-center" />
                        ) : row.creditsL}
                      </td>

                      {/* Credits P */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" step="0.5" value={row.creditsP} onChange={e => updateCell(row.globalIndex, 'creditsP', parseFloat(e.target.value) || 0)}
                            className="wr-input w-12 text-center" />
                        ) : row.creditsP}
                      </td>

                      {/* Credits T */}
                      <td className="wr-td text-center">
                        {editing ? (
                          <input type="number" step="0.5" value={row.creditsT} onChange={e => updateCell(row.globalIndex, 'creditsT', parseFloat(e.target.value) || 0)}
                            className="wr-input w-12 text-center" />
                        ) : row.creditsT}
                      </td>

                      {/* Note Marker (edit mode only shows as small input) */}
                      {editing && (
                        <td className="wr-td text-center print:hidden">
                          <div className="flex items-center gap-1">
                            <input type="text" value={row.noteMarker || ''} onChange={e => updateCell(row.globalIndex, 'noteMarker', e.target.value)}
                              className="wr-input w-8 text-center" placeholder="*" title="Note marker (e.g. *, **)" />
                            <button onClick={() => deleteRow(row.globalIndex)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete row">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ))}

              {/* Add Row button in edit mode */}
              {editing && (
                <tr className="print:hidden">
                  <td colSpan={15} className="p-2 text-center">
                    <button onClick={addRow}
                      className="flex items-center gap-1.5 mx-auto px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-[var(--color-slate)] text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all">
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </td>
                </tr>
              )}

              {/* Totals Row */}
              <tr className="bg-[var(--color-fog)] font-bold border-t-2 border-[var(--color-carbon)]">
                <td colSpan={3} className="wr-td text-right uppercase text-[var(--color-graphite)]">Total</td>
                <td className="wr-td text-center">—</td>
                <td className="wr-td text-center">—</td>
                <td className="wr-td text-center">{totals.totalTheory}</td>
                <td className="wr-td text-center">—</td>
                <td className="wr-td text-center">—</td>
                <td className="wr-td text-center">{totals.totalPractical}</td>
                <td className="wr-td text-center">{totals.totalTutorial}</td>
                <td className="wr-td text-center text-[var(--color-signal-orange)]">{totals.totalTeaching}</td>
                <td className="wr-td text-center">{totals.totalCreditsL}</td>
                <td className="wr-td text-center">{totals.totalCreditsP}</td>
                <td className="wr-td text-center">{totals.totalCreditsT}</td>
                {editing && <td className="wr-td print:hidden" />}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div className="mt-6 space-y-1">
          {editing ? (
            <div>
              <label className="text-xs font-medium text-[var(--color-slate)] mb-1 block">Footnotes</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                className="w-full text-xs p-2 border border-[var(--border)] rounded-lg bg-[var(--color-fog)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                placeholder="e.g. * Load taken by other Department&#10;** Load of other Departments taken by faculties of this department"
              />
            </div>
          ) : (
            <>
              {(report.notes || '* Load taken by other Department\n** Load of other Departments taken by faculties of this department').split('\n').map((line, i) => (
                <p key={i} className="text-xs text-[var(--color-slate)] italic">{line}</p>
              ))}
            </>
          )}
        </div>

        {/* Signature Section */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="h-12 border-b border-[var(--border)]" />
            <p className="text-xs font-medium text-[var(--color-graphite)] mt-2">Head of Department</p>
          </div>
          <div>
            <div className="h-12 border-b border-[var(--border)]" />
            <p className="text-xs font-medium text-[var(--color-graphite)] mt-2">Head of Institute</p>
          </div>
          <div>
            <div className="h-12 border-b border-[var(--border)]" />
            <p className="text-xs font-medium text-[var(--color-graphite)] mt-2">Dean</p>
          </div>
        </div>
      </div>

      {/* Component-scoped styles */}
      <style>{`
        .wr-th {
          padding: 6px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 11px;
          border: 1px solid var(--border);
          color: var(--color-graphite);
          white-space: nowrap;
        }
        .wr-td {
          padding: 5px 8px;
          border: 1px solid var(--border);
          font-size: 12px;
          color: var(--foreground);
          vertical-align: middle;
        }
        .wr-input {
          padding: 2px 4px;
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 11px;
          background: var(--surface);
          color: var(--foreground);
          outline: none;
          transition: border-color 0.2s;
        }
        .wr-input:focus {
          border-color: var(--color-signal-orange);
        }

        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
