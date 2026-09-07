import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Loader2, CheckCircle,
  AlertCircle, UserPlus, X
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

const DAYS    = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const TIMES   = ['10:00-11:00', '11:00-12:00', '12:45-1:45', '1:45-2:45', '3:00-4:00', '4:00-5:00'];

// ─── helpers ────────────────────────────────────────────────────────────────

function emptyEntry(time = '') {
  return { time, activity: '', location: '', floor: '' };
}

function emptyFaculty() {
  const schedule = {};
  DAYS.forEach(d => { schedule[d] = []; });
  return { facultyName: '', department: '', schedule };
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ScheduleEditorPage() {
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [result,    setResult]    = useState(null);   // { ok, msg }
  const [expanded,  setExpanded]  = useState({});     // facultyIndex → day → bool
  const [activeDay, setActiveDay] = useState({});     // facultyIndex → day string

  // ── fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    apiClient('/schedule-data')
      .then(res => {
        setData(res.data);
        // Default active day for each faculty to MONDAY
        const defaults = {};
        res.data.forEach((_, i) => { defaults[i] = 'MONDAY'; });
        setActiveDay(defaults);
      })
      .catch(err => setFetchErr(err.message || 'Failed to load schedule data'))
      .finally(() => setLoading(false));
  }, []);

  // ── save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      await apiClient('/schedule-data', { method: 'PUT', body: JSON.stringify(data) });
      setResult({ ok: true, msg: 'Schedule data saved to file successfully!' });
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  // ── faculty CRUD ──────────────────────────────────────────────────────────
  const addFaculty = () => {
    setData(prev => [...prev, emptyFaculty()]);
    setActiveDay(prev => ({ ...prev, [data.length]: 'MONDAY' }));
  };

  const removeFaculty = (idx) => {
    setData(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFacultyField = (idx, field, value) => {
    setData(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // ── entry CRUD ────────────────────────────────────────────────────────────
  const addEntry = (fIdx, day) => {
    setData(prev => {
      const next = prev.map((f, i) => {
        if (i !== fIdx) return f;
        const dayEntries = [...(f.schedule[day] || []), emptyEntry()];
        return { ...f, schedule: { ...f.schedule, [day]: dayEntries } };
      });
      return next;
    });
  };

  const removeEntry = (fIdx, day, eIdx) => {
    setData(prev => {
      const next = prev.map((f, i) => {
        if (i !== fIdx) return f;
        const dayEntries = f.schedule[day].filter((_, j) => j !== eIdx);
        return { ...f, schedule: { ...f.schedule, [day]: dayEntries } };
      });
      return next;
    });
  };

  const updateEntry = useCallback((fIdx, day, eIdx, field, value) => {
    setData(prev => {
      const next = prev.map((f, i) => {
        if (i !== fIdx) return f;
        const dayEntries = f.schedule[day].map((e, j) =>
          j === eIdx ? { ...e, [field]: value } : e
        );
        return { ...f, schedule: { ...f.schedule, [day]: dayEntries } };
      });
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-signal-orange)]" />
      <span className="ml-3 text-[var(--color-slate)]">Loading schedule data…</span>
    </div>
  );

  if (fetchErr) return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" /> {fetchErr}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] font-heading" style={{ letterSpacing: '-0.02em' }}>
            Schedule Editor
          </h1>
          <p className="text-[var(--color-slate)] mt-1 text-sm">
            Add, edit, or remove faculty schedule entries. Changes are written directly to the source file.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="sch-editor-add-faculty"
            onClick={addFaculty}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--color-graphite)] hover:bg-[var(--color-fog)] transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Faculty
          </button>
          <button
            id="sch-editor-save"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-carbon)] text-white text-sm font-medium hover:bg-[var(--color-graphite)] transition-all disabled:opacity-50"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save to File</>}
          </button>
        </div>
      </div>

      {/* ── Result banner ───────────────────────────────────── */}
      {result && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
          result.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {result.ok
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {result.msg}
        </div>
      )}

      {/* ── Faculty cards ────────────────────────────────────── */}
      <div className="space-y-4">
        {data.length === 0 && (
          <div className="text-center py-16 text-[var(--color-slate)] text-sm">
            No faculty entries. Click <strong>Add Faculty</strong> to get started.
          </div>
        )}

        {data.map((faculty, fIdx) => {
          const day          = activeDay[fIdx] || 'MONDAY';
          const dayEntries   = faculty.schedule[day] || [];
          const totalSlots   = DAYS.reduce((acc, d) => acc + (faculty.schedule[d]?.length || 0), 0);

          return (
            <div
              key={fIdx}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-cards)] overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] bg-[var(--color-fog)]/40">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-1">
                      Faculty Name
                    </label>
                    <input
                      id={`faculty-name-${fIdx}`}
                      type="text"
                      value={faculty.facultyName}
                      placeholder="e.g. Dr. Jane Smith (JS)"
                      onChange={e => updateFacultyField(fIdx, 'facultyName', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--color-slate)] uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <input
                      id={`faculty-dept-${fIdx}`}
                      type="text"
                      value={faculty.department}
                      placeholder="e.g. Computer Science and Engineering"
                      onChange={e => updateFacultyField(fIdx, 'department', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--color-slate)]">{totalSlots} slots</span>
                  <button
                    id={`remove-faculty-${fIdx}`}
                    onClick={() => removeFaculty(fIdx)}
                    className="p-1.5 rounded-lg text-[var(--color-slate)] hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Remove faculty"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day tabs */}
              <div className="flex overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)]">
                {DAYS.map(d => {
                  const count = faculty.schedule[d]?.length || 0;
                  return (
                    <button
                      key={d}
                      id={`day-tab-${fIdx}-${d}`}
                      onClick={() => setActiveDay(prev => ({ ...prev, [fIdx]: d }))}
                      className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                        day === d
                          ? 'border-[var(--color-signal-orange)] text-[var(--color-signal-orange)]'
                          : 'border-transparent text-[var(--color-graphite)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {d.slice(0, 3)}
                      {count > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-carbon)] text-white text-[9px]">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Entries for the active day */}
              <div className="p-4 space-y-2">
                {dayEntries.length === 0 && (
                  <p className="text-[var(--color-slate)] text-xs py-2 text-center">
                    No entries for {day}. Add one below.
                  </p>
                )}

                {dayEntries.map((entry, eIdx) => (
                  <div key={eIdx} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-fog)]/50 border border-[var(--border)]">
                    {/* Time slot */}
                    <select
                      id={`entry-time-${fIdx}-${day}-${eIdx}`}
                      value={entry.time}
                      onChange={e => updateEntry(fIdx, day, eIdx, 'time', e.target.value)}
                      className="px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                    >
                      <option value="">— Time —</option>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      {/* Allow custom time too */}
                      {entry.time && !TIMES.includes(entry.time) && (
                        <option value={entry.time}>{entry.time}</option>
                      )}
                    </select>
                    {/* Activity */}
                    <input
                      id={`entry-activity-${fIdx}-${day}-${eIdx}`}
                      type="text"
                      value={entry.activity}
                      placeholder="Activity / Subject"
                      onChange={e => updateEntry(fIdx, day, eIdx, 'activity', e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                    />
                    {/* Location */}
                    <input
                      id={`entry-location-${fIdx}-${day}-${eIdx}`}
                      type="text"
                      value={entry.location}
                      placeholder="Location / Room"
                      onChange={e => updateEntry(fIdx, day, eIdx, 'location', e.target.value)}
                      className="w-32 px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                    />
                    {/* Floor (optional) */}
                    <input
                      id={`entry-floor-${fIdx}-${day}-${eIdx}`}
                      type="text"
                      value={entry.floor}
                      placeholder="Floor"
                      onChange={e => updateEntry(fIdx, day, eIdx, 'floor', e.target.value)}
                      className="w-20 px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] outline-none focus:border-[var(--color-signal-orange)] transition-colors"
                    />
                    <button
                      id={`remove-entry-${fIdx}-${day}-${eIdx}`}
                      onClick={() => removeEntry(fIdx, day, eIdx)}
                      className="p-1.5 rounded-lg text-[var(--color-slate)] hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  id={`add-entry-${fIdx}-${day}`}
                  onClick={() => addEntry(fIdx, day)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--color-slate)] hover:border-[var(--color-signal-orange)] hover:text-[var(--color-signal-orange)] transition-all w-full justify-center mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add slot for {day.slice(0, 3)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom save bar */}
      {data.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] p-4 flex justify-end gap-3 shadow-lg">
          <span className="text-xs text-[var(--color-slate)] self-center">
            {data.length} faculty · unsaved changes will be lost on refresh
          </span>
          <button
            id="sch-editor-save-bottom"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--color-carbon)] text-white text-sm font-medium hover:bg-[var(--color-graphite)] transition-all disabled:opacity-50"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save to File</>}
          </button>
        </div>
      )}
    </div>
  );
}
