import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar, Search, Pencil, Save, X,
  Printer, FileSpreadsheet, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import * as xlsx from 'xlsx';
import { apiClient } from '../../lib/api-client';

export function FacultyScheduleReport() {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveResult,   setSaveResult]   = useState(null); // { ok, msg }

  // ── fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    apiClient('/schedule-data')
      .then((res) => {
        setScheduleData(res.data);
        setFetchError(null);
      })
      .catch((err) => setFetchError(err.message || 'Failed to load schedule data'))
      .finally(() => setLoading(false));
  }, []);

  // Local edit buffer
  const [editData, setEditData] = useState([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDept,    setSelectedDept]    = useState('');

  const currentDay = useMemo(() => {
    const date = new Date(selectedDate);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }, [selectedDate]);

  const timeSlots = [
    '10:00-11:00',
    '11:00-12:00',
    '12:00-12:45',
    '12:45-1:45',
    '1:45-2:45',
    '2:45-3:00',
    '3:00-4:00',
    '4:00-5:00',
  ];

  // Seed edit buffer when entering edit mode
  useEffect(() => {
    if (editing) {
      setEditData(JSON.parse(JSON.stringify(scheduleData)));
    }
  }, [editing, scheduleData]);

  const activeData = editing ? editData : scheduleData;

  const filteredData = useMemo(() => {
    return activeData.filter((faculty) => {
      const matchFaculty = selectedFaculty
        ? faculty.facultyName.toLowerCase().includes(selectedFaculty.toLowerCase())
        : true;
      const matchDept = selectedDept ? faculty.department === selectedDept : true;
      return matchFaculty && matchDept;
    });
  }, [selectedFaculty, selectedDept, activeData]);

  const departments = Array.from(new Set(scheduleData.map((f) => f.department)));

  const getStatusColor = (activity) => {
    if (!activity) return 'bg-[var(--color-fog)] border-transparent text-[var(--color-slate)]';
    const lower = activity.toLowerCase();
    if (lower === 'available') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (lower.includes('meeting') || lower.includes('admin'))
      return 'bg-amber-50 border-amber-200 text-amber-800';
    if (lower.includes('lab') || lower.includes('practical'))
      return 'bg-blue-50 border-blue-200 text-blue-800';
    return 'bg-[#ff682c]/10 border-[#ff682c]/20 text-[#ff682c]';
  };

  // ── handlers ──────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  const handleDownloadExcel = () => {
    const headerRow = ['Faculty Name', 'Department', ...timeSlots];
    const rows = [headerRow];
    filteredData.forEach((faculty) => {
      const dailySchedule = faculty.schedule[currentDay] || [];
      const row = [faculty.facultyName, faculty.department];
      timeSlots.forEach((time) => {
        const cellData = dailySchedule.find((e) => e.time === time);
        row.push(
          cellData
            ? `${cellData.activity} ${cellData.location ? '(' + cellData.location + ')' : ''}`.trim()
            : ''
        );
      });
      rows.push(row);
    });
    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook  = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Faculty Schedule');
    xlsx.writeFile(workbook, `Faculty_Schedule_${currentDay}_${selectedDate}.xlsx`);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      await apiClient('/schedule-data', {
        method: 'PUT',
        body: JSON.stringify(editData),
      });
      setScheduleData(editData);
      setEditing(false);
      setSaveResult({ ok: true, msg: 'Schedule saved to file successfully.' });
    } catch (err) {
      setSaveResult({ ok: false, msg: err.message || 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveResult(null), 4000);
    }
  };

  const cancelEditing = () => setEditing(false);

  const updateCell = useCallback(
    (facultyName, time, field, value) => {
      setEditData((prev) => {
        const updated = [...prev];
        const fIndex = updated.findIndex((f) => f.facultyName === facultyName);
        if (fIndex === -1) return updated;
        const faculty = { ...updated[fIndex] };
        const daySchedule = [...(faculty.schedule[currentDay] || [])];
        let entryIndex = daySchedule.findIndex((e) => e.time === time);
        if (entryIndex === -1) {
          daySchedule.push({ time, activity: '', location: '', floor: '' });
          entryIndex = daySchedule.length - 1;
        } else {
          daySchedule[entryIndex] = { ...daySchedule[entryIndex] };
        }
        daySchedule[entryIndex][field] = value;
        faculty.schedule = { ...faculty.schedule, [currentDay]: daySchedule };
        updated[fIndex] = faculty;
        return updated;
      });
    },
    [currentDay]
  );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 print:space-y-0">

      {/* Save result banner */}
      {saveResult && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
            saveResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {saveResult.ok
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {saveResult.msg}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-signal-orange)]" />
          <span className="ml-3 text-[var(--color-slate)] text-sm">Loading schedule data…</span>
        </div>
      )}

      {/* Fetch error */}
      {!loading && fetchError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Main content — only when data is ready */}
      {!loading && !fetchError && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden mb-6">
            <div>
              <h1
                className="text-xl font-bold text-[var(--foreground)] font-heading"
                style={{ letterSpacing: '-0.02em' }}
              >
                Faculty Schedule Report
                <span className="ml-3 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-[var(--color-carbon)] text-[var(--background)] text-xs font-semibold">
                  {filteredData.length} Staff Members
                </span>
              </h1>
              <p className="text-sm text-[var(--color-slate)] mt-1">
                Day-wise timeline view of faculty activities and locations.
              </p>
            </div>

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
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Download Excel
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-carbon)] text-white hover:bg-[var(--color-graphite)] transition-all"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-cards)] grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden mb-6">
            <div>
              <label className="block text-xs font-medium text-[var(--color-slate)] mb-1">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-carbon)]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-slate)] mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-slate)] mb-1">Search Faculty</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-carbon)]" />
                <input
                  type="text"
                  placeholder="Filter by faculty name..."
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Document */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-cards)] shadow-sm p-8 print:border-none print:shadow-none print:p-0 print:rounded-none">

            {/* Header */}
            <div className="text-center mb-6 border-b border-[var(--border)] pb-6">
              <h2 className="text-lg font-bold text-[var(--foreground)] uppercase tracking-wide">
                MGM University, Chhatrapati Sambhajinagar
              </h2>
              <p className="text-sm text-[var(--color-graphite)] mt-1">School of Engineering and Technology</p>
              <p className="text-sm text-[var(--color-graphite)] mt-0.5">
                Faculty Schedule - {selectedDept || 'All Departments'}
              </p>
              <h3 className="text-base font-bold text-[var(--foreground)] mt-2 underline underline-offset-4">
                Report Date: {selectedDate} ({currentDay})
              </h3>
            </div>

            {/* Report Matrix */}
            <div className="overflow-x-auto">
              {timeSlots.length === 0 ? (
                <div className="p-12 text-center print:hidden">
                  <p className="text-[var(--color-slate)] text-base">No schedule data available for {currentDay}.</p>
                </div>
              ) : (
                <div className="min-w-[800px]">
                  <table className="w-full text-xs border-collapse schedule-table">
                    <thead>
                      <tr className="bg-[var(--color-fog)]">
                        <th className="sch-th sticky left-0 z-20 bg-[var(--surface)] min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          Faculty
                        </th>
                        {timeSlots.map((time) => (
                          <th key={time} className="sch-th min-w-[140px]">{time}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((faculty) => {
                        const dailySchedule = faculty.schedule[currentDay] || [];
                        return (
                          <tr
                            key={faculty.facultyName}
                            className="hover:bg-[var(--color-fog)]/50 transition-colors group"
                          >
                            <td className="sch-td sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--color-fog)]/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <p className="font-semibold text-[var(--foreground)]">{faculty.facultyName}</p>
                              <p className="text-[10px] text-[var(--color-slate)]">{faculty.department}</p>
                            </td>

                            {timeSlots.map((time) => {
                              // Break slots
                              if (time === '12:00-12:45') {
                                return (
                                  <td
                                    key={`${faculty.facultyName}-${time}`}
                                    className="sch-td text-center align-middle bg-[var(--color-fog)]/50"
                                  >
                                    <div className="p-2 flex flex-col justify-center items-center rounded h-full border border-dashed border-[var(--border)] bg-transparent text-[var(--color-slate)]">
                                      <span className="font-bold text-[10px] tracking-[0.1em] uppercase">Lunch Break</span>
                                    </div>
                                  </td>
                                );
                              }
                              if (time === '2:45-3:00') {
                                return (
                                  <td
                                    key={`${faculty.facultyName}-${time}`}
                                    className="sch-td text-center align-middle bg-[var(--color-fog)]/50"
                                  >
                                    <div className="p-2 flex flex-col justify-center items-center rounded h-full border border-dashed border-[var(--border)] bg-transparent text-[var(--color-slate)]">
                                      <span className="font-bold text-[10px] tracking-[0.1em] uppercase">Short Break</span>
                                    </div>
                                  </td>
                                );
                              }

                              const cellData = dailySchedule.find((e) => e.time === time);

                              return (
                                <td
                                  key={`${faculty.facultyName}-${time}`}
                                  className="sch-td text-center align-middle"
                                >
                                  {editing ? (
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        value={cellData?.activity || ''}
                                        placeholder="Activity"
                                        onChange={(e) => updateCell(faculty.facultyName, time, 'activity', e.target.value)}
                                        className="sch-input w-full"
                                      />
                                      <input
                                        type="text"
                                        value={cellData?.location || ''}
                                        placeholder="Location"
                                        onChange={(e) => updateCell(faculty.facultyName, time, 'location', e.target.value)}
                                        className="sch-input w-full"
                                      />
                                    </div>
                                  ) : (
                                    cellData && cellData.activity ? (
                                      <div className={`p-2 flex flex-col justify-center items-center rounded h-full ${getStatusColor(cellData.activity)}`}>
                                        <span className="font-semibold">{cellData.activity}</span>
                                        {cellData.activity !== 'Available' && (
                                          <div className="flex flex-col items-center opacity-80 mt-1">
                                            <span className="text-[10px] truncate">{cellData.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <></>
                                    )
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredData.length === 0 && (
                    <div className="p-12 text-center print:hidden">
                      <p className="text-[var(--color-slate)] text-base">No faculty found matching the current filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Signature */}
            <div className="mt-16 grid grid-cols-3 gap-8 text-center pb-8">
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
            .sch-th {
              padding: 8px 12px;
              text-align: center;
              font-weight: 600;
              font-size: 11px;
              border: 1px solid var(--border);
              color: var(--color-graphite);
              white-space: nowrap;
            }
            .sch-td {
              padding: 6px;
              border: 1px solid var(--border);
              font-size: 11px;
              color: var(--foreground);
              vertical-align: middle;
            }
            .sch-input {
              padding: 2px 4px;
              border: 1px solid var(--border);
              border-radius: 4px;
              font-size: 10px;
              background: var(--surface);
              color: var(--foreground);
              outline: none;
              transition: border-color 0.2s;
            }
            .sch-input:focus {
              border-color: var(--color-signal-orange);
            }
            @media print {
              .print\\:hidden        { display: none !important; }
              .print\\:border-none   { border: none !important; }
              .print\\:shadow-none   { box-shadow: none !important; }
              .print\\:p-0          { padding: 0 !important; }
              .print\\:rounded-none  { border-radius: 0 !important; }
              .print\\:mb-0         { margin-bottom: 0 !important; }
              .schedule-table       { zoom: 0.8; }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
