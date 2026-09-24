import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import subjectsData from '../data/mechanical_subjects.json';

const ACADEMIC_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
const TERMS = ['Odd', 'Even'];
const DEPARTMENTS = ['Computer Science', 'Mechanical', 'Electrical', 'Civil', 'Electronics'];
const PROGRAMS = [
  { id: 'regular', name: 'Regular (4 Year Program)' },
  { id: 'integrated', name: 'Integrated (6 Year Program)' }
];
const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

export default function DataFetcherPage() {
  const tableRef = useRef(null);
  
  const [formData, setFormData] = useState({
    academicYear: '2026-2027',
    term: ['Odd'],
    department: 'Mechanical',
    program: ['regular_ra'],
    semester: ['3rd']
  });
  
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (formData.program.length === 0) {
      setRows([]);
      return;
    }

    const filtered = subjectsData.filter(s => {
      const matches = formData.program.some(selectedP => {
        if (selectedP === s.program) return true;
        if (s.program === 'regular' && selectedP.startsWith('regular')) return true;
        return false;
      });
      if (!matches) return false;
      if (formData.term.length > 0 && !formData.term.includes(s.term)) return false;
      if (formData.semester.length > 0 && !formData.semester.includes(s.semester)) return false;
      return true;
    });

    setRows(filtered.map(row => ({
      ...row,
      id: Math.random().toString(),
      isCore: true,
      deptAndTeacher: '',
      divisions: row.divisions || 1,
      students: row.students || 60,
      prBatches: row.prBatches !== undefined ? row.prBatches : (row.prHrs > 0 ? 3 : 0)
    })));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'department') {
        next.program = [];
        next.semester = [];
      }
      return next;
    });
  };

  const handleToggle = (field, id) => {
    setFormData(prev => {
      const current = prev[field];
      const isSelected = current.includes(id);
      const nextArr = isSelected 
        ? current.filter(item => item !== id)
        : [...current, id];
        
      const next = { ...prev, [field]: nextArr };
      
      if (field === 'program') {
        const hasRegular = nextArr.some(p => p.startsWith('regular'));
        if (hasRegular) {
          next.semester = next.semester.filter(s => !['9th', '10th', '11th', '12th'].includes(s));
        }
      }
      return next;
    });
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now().toString(),
        srNo: '',
        classLabel: '',
        title: '',
        divisions: 1,
        students: 60,
        thHrs: 0,
        prBatches: 3,
        prHrs: 0,
        tutHrs: 0,
        credL: 0,
        credP: 0,
        credT: 0,
        isCore: true,
        deptAndTeacher: ''
      }
    ]);
  };

  const handleRowChange = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleDeleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const availablePrograms = formData.department === 'Mechanical' ? [
    { id: 'integrated', name: 'B.Tech Integrated Robotics and AI' },
    { id: 'regular_ra', name: 'B.Tech Robotic and automation' },
    { id: 'regular_ma', name: 'B.Tech Mechanical and Automation' }
  ] : PROGRAMS;

  const hasRegular = formData.program.some(p => p.startsWith('regular'));
  let baseSemesters = hasRegular ? SEMESTERS.slice(0, 8) : SEMESTERS;
  let availableSemesters = [];
  
  if (formData.term.includes('Odd')) {
    availableSemesters = [...availableSemesters, ...baseSemesters.filter((_, i) => i % 2 === 0)];
  }
  if (formData.term.includes('Even')) {
    availableSemesters = [...availableSemesters, ...baseSemesters.filter((_, i) => i % 2 !== 0)];
  }
  
  // Keep semesters perfectly sorted
  availableSemesters = availableSemesters.sort((a, b) => SEMESTERS.indexOf(a) - SEMESTERS.indexOf(b));

  // Real-time calculated display data
  const displayData = rows.map((row) => {
    const divs = Number(row.divisions) || 0;
    const batches = Number(row.prBatches) || 0;
    const thHrs = Number(row.thHrs) || 0;
    const prHrs = Number(row.prHrs) || 0;
    const tutHrs = Number(row.tutHrs) || 0;

    const thTotal = divs * thHrs;
    const prTotal = batches * prHrs;
    const totalHrs = thTotal + prTotal + tutHrs;

    return {
      ...row,
      thTotal,
      prTotal,
      totalHrs
    };
  });

  // Calculations for TOTAL row
  const sumThTotal = displayData.reduce((s, r) => s + r.thTotal, 0);
  const sumPrTotal = displayData.reduce((s, r) => s + r.prTotal, 0);
  const sumTutHrs = displayData.reduce((s, r) => s + (Number(r.tutHrs) || 0), 0);
  const sumTotalHrs = displayData.reduce((s, r) => s + r.totalHrs, 0);
  const sumCredL = displayData.reduce((s, r) => s + (Number(r.credL) || 0), 0);
  const sumCredP = displayData.reduce((s, r) => s + (Number(r.credP) || 0), 0);
  const sumCredT = displayData.reduce((s, r) => s + (Number(r.credT) || 0), 0);

  const handleExport = () => {
    if (!tableRef.current) return;
    
    // Clone the table to avoid modifying the actual DOM
    const tableClone = tableRef.current.cloneNode(true);
    
    // Remove the Action column completely from the clone
    const trs = tableClone.querySelectorAll('tr');
    trs.forEach(tr => {
      // If it's a data row, the last cell is the action button
      if (tr.parentElement.tagName === 'TBODY' && !tr.classList.contains('bg-gray-50')) {
        tr.removeChild(tr.lastElementChild);
      }
    });
    // Remove the empty header column for Action
    const theadTrs = tableClone.querySelectorAll('thead tr');
    if (theadTrs.length > 1) {
      const lastTh = theadTrs[1].querySelector('th:last-child');
      if (lastTh && lastTh.innerText === 'Action') lastTh.remove();
    }

    // Replace all inputs with their values
    const inputs = tableClone.querySelectorAll('input');
    inputs.forEach(input => {
      const parent = input.parentNode;
      parent.textContent = input.value;
    });
    
    // Replace all selects with their selected text
    const selects = tableClone.querySelectorAll('select');
    selects.forEach(select => {
      const parent = select.parentNode;
      const selectedOption = select.options[select.selectedIndex];
      parent.textContent = selectedOption ? selectedOption.text : '';
    });
    
    // Extract Tailwind widths to inline styles for Excel (optional, but colgroup is better)
    const ths = tableClone.querySelectorAll('th');
    ths.forEach(th => {
      th.style.whiteSpace = 'normal';
    });

    let htmlContent = tableClone.outerHTML;
    
    // CRITICAL: Prevent Excel from splitting <br> into new rows!
    htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '<br style="mso-data-placement:same-cell;" />');

    // Enforce precise column widths for Excel (16 columns, removed Action)
    const colgroup = `
      <colgroup>
        <col width="50" />
        <col width="70" />
        <col width="300" />
        <col width="70" />
        <col width="70" />
        <col width="60" />
        <col width="70" />
        <col width="60" />
        <col width="60" />
        <col width="70" />
        <col width="60" />
        <col width="70" />
        <col width="50" />
        <col width="50" />
        <col width="50" />
        <col width="150" />
      </colgroup>
    `;
    htmlContent = htmlContent.replace(/<thead/i, colgroup + '<thead');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; font-family: "Calibri", sans-serif; font-size: 13px; text-align: center; }
        th, td { border: 1px solid black; padding: 4px; vertical-align: middle; white-space: normal; }
        th { font-weight: bold; background-color: #f9fafb; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .bg-gray-50 { background-color: #f9fafb; }
        .bg-gray-100 { background-color: #f3f4f6; }
        .italic { font-style: italic; }
      </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Teaching_Workload.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Top Filter Navigation */}
      <div className="bg-white border-b border-[var(--border)] shadow-sm -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-wrap items-center py-2 gap-1 lg:gap-2">
          {/* Academic Year */}
          <div className="relative group">
            <select name="academicYear" value={formData.academicYear} onChange={handleChange}
              className="appearance-none bg-transparent border-0 px-3 py-2 pr-8 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)] rounded-md cursor-pointer focus:ring-0 focus:outline-none transition-colors"
            >
              <option value="" disabled>Academic Year</option>
              {ACADEMIC_YEARS.map(ay => <option key={ay} value={ay}>{ay}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-slate)] pointer-events-none group-hover:text-[var(--color-carbon)]" />
          </div>

          <div className="w-px h-4 bg-[var(--border)] hidden sm:block mx-1"></div>

          {/* Term Checkbox Dropdown */}
          <div className="relative group">
            <button type="button"
              className="appearance-none bg-transparent border-0 px-3 py-2 pr-8 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)] rounded-md cursor-pointer focus:ring-0 focus:outline-none transition-colors flex items-center min-w-[120px]"
            >
              <span className="truncate">
                {formData.term.length === 0 ? 'Term' : `Terms (${formData.term.length})`}
              </span>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-slate)] pointer-events-none group-hover:text-[var(--color-carbon)]" />
            </button>
            <div className="absolute left-0 top-full mt-0 hidden group-hover:block w-[160px] bg-white border border-[var(--border)] shadow-xl rounded-md z-50 py-2">
              {TERMS.map(t => (
                <label key={t} className="flex items-center px-4 py-2 hover:bg-[var(--color-fog)] cursor-pointer">
                  <input type="checkbox" checked={formData.term.includes(t)} onChange={() => handleToggle('term', t)}
                    className="mr-3 w-4 h-4 rounded border-gray-300 text-[var(--color-signal-orange)] focus:ring-[var(--color-signal-orange)]"
                  />
                  <span className="text-sm text-[var(--color-graphite)]">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="w-px h-4 bg-[var(--border)] hidden sm:block mx-1"></div>

          {/* Department */}
          <div className="relative group">
            <select name="department" value={formData.department} onChange={handleChange}
              className="appearance-none bg-transparent border-0 px-3 py-2 pr-8 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)] rounded-md cursor-pointer focus:ring-0 focus:outline-none transition-colors max-w-[150px] truncate"
            >
              <option value="" disabled>Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-slate)] pointer-events-none group-hover:text-[var(--color-carbon)]" />
          </div>

          <div className="w-px h-4 bg-[var(--border)] hidden sm:block mx-1"></div>

          {/* Program Checkbox Dropdown */}
          <div className="relative group">
            <button type="button"
              className="appearance-none bg-transparent border-0 px-3 py-2 pr-8 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)] rounded-md cursor-pointer focus:ring-0 focus:outline-none transition-colors flex items-center min-w-[160px]"
            >
              <span className="truncate">
                {formData.program.length === 0 ? 'Program' : `Programs (${formData.program.length})`}
              </span>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-slate)] pointer-events-none group-hover:text-[var(--color-carbon)]" />
            </button>
            <div className="absolute left-0 top-full mt-0 hidden group-hover:block w-[280px] bg-white border border-[var(--border)] shadow-xl rounded-md z-50 py-2">
              {availablePrograms.map(p => (
                <label key={p.id} className="flex items-center px-4 py-2 hover:bg-[var(--color-fog)] cursor-pointer">
                  <input type="checkbox" checked={formData.program.includes(p.id)} onChange={() => handleToggle('program', p.id)}
                    className="mr-3 w-4 h-4 rounded border-gray-300 text-[var(--color-signal-orange)] focus:ring-[var(--color-signal-orange)]"
                  />
                  <span className="text-sm text-[var(--color-graphite)]">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {(formData.program.length > 0 && availableSemesters.length > 0) && (
            <>
              <div className="w-px h-4 bg-[var(--border)] hidden sm:block mx-1"></div>
              
              {/* Semester Checkbox Dropdown */}
              <div className="relative group">
                <button type="button"
                  className="appearance-none bg-transparent border-0 px-3 py-2 pr-8 text-sm font-medium text-[var(--color-graphite)] hover:text-[var(--color-carbon)] hover:bg-[var(--color-fog)] rounded-md cursor-pointer focus:ring-0 focus:outline-none transition-colors flex items-center min-w-[140px]"
                >
                  <span className="truncate">
                    {formData.semester.length === 0 ? 'Semester' : `Semesters (${formData.semester.length})`}
                  </span>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-slate)] pointer-events-none group-hover:text-[var(--color-carbon)]" />
                </button>
                <div className="absolute left-0 top-full mt-0 hidden group-hover:block w-[160px] max-h-[300px] overflow-y-auto bg-white border border-[var(--border)] shadow-xl rounded-md z-50 py-2">
                  {availableSemesters.map(s => (
                    <label key={s} className="flex items-center px-4 py-2 hover:bg-[var(--color-fog)] cursor-pointer">
                      <input type="checkbox" checked={formData.semester.includes(s)} onChange={() => handleToggle('semester', s)}
                        className="mr-3 w-4 h-4 rounded border-gray-300 text-[var(--color-signal-orange)] focus:ring-[var(--color-signal-orange)]"
                      />
                      <span className="text-sm text-[var(--color-graphite)]">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results Area */}
      <div className="bg-white p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-x-auto">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Teaching Workload</h2>
        </div>

        {displayData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-sans border-2 border-dashed border-gray-200 rounded-lg">
            No subjects found for the selected program.
          </div>
        ) : (
          <div className="mb-8 min-w-max">
            <table ref={tableRef} className="w-full text-[13px] border-collapse text-center text-black border border-black" style={{ fontFamily: '"Calibri", sans-serif' }}>
              <thead>
                <tr>
                  <th colSpan={16} className="border border-black py-2 font-bold text-[15px] leading-tight text-center">
                    MGM University<br/>
                    Chhatrapati Sambhajinagar<br/>
                    <span className="font-normal text-sm">Academic year {formData.academicYear} ({formData.term === 'Odd' ? 'Part 1' : 'Part 2'})</span><br/>
                    School of Engineering and Technology<br/>
                    Mechanical Engineering Department<br/>
                    <span className="underline">Teaching Workload</span>
                  </th>
                </tr>
                <tr className="bg-gray-50">
                  <th rowSpan={3} className="border border-black px-1 py-1 w-[40px]">Sr<br/>No.</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 w-[80px]">Class</th>
                  <th rowSpan={3} className="border border-black px-2 py-1 w-[200px]">Name of Course / Subject</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 w-[55px]">No. of<br/>Divisions</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 w-[55px]">No. of<br/>Students<br/>in class</th>
                  <th colSpan={6} className="border border-black px-1 py-1 font-bold">Teaching Scheme</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 w-[60px]">Total<br/>Teaching<br/>Hours</th>
                  <th colSpan={3} rowSpan={2} className="border border-black px-1 py-1">Credits for<br/>Course /<br/>Subject</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 w-[130px]">Core Faculty</th>
                </tr>
                <tr className="bg-gray-50">
                  <th colSpan={2} className="border border-black px-1 py-1">Theory (L)</th>
                  <th colSpan={3} className="border border-black px-1 py-1">Practical (P)</th>
                  <th className="border border-black px-1 py-1">Tutorial</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="border border-black px-1 py-1 w-[45px]">Hrs<br/>per<br/>week</th>
                  <th className="border border-black px-1 py-1 w-[45px]">Total<br/>(Hrs<br/>per<br/>week)</th>
                  <th className="border border-black px-1 py-1 w-[45px]">No. of<br/>Batches</th>
                  <th className="border border-black px-1 py-1 w-[45px]">Hrs<br/>per<br/>week</th>
                  <th className="border border-black px-1 py-1 w-[45px]">Total<br/>(Hrs<br/>per<br/>week)</th>
                  <th className="border border-black px-1 py-1 w-[45px]">Hrs per<br/>week</th>
                  <th className="border border-black px-1 py-1 w-[35px]">L</th>
                  <th className="border border-black px-1 py-1 w-[35px]">P</th>
                  <th className="border border-black px-1 py-1 w-[35px]">T</th>
                </tr>
                <tr className="italic text-xs bg-gray-100">
                  <th className="border border-black">1</th>
                  <th className="border border-black">2</th>
                  <th className="border border-black">3</th>
                  <th className="border border-black">4</th>
                  <th className="border border-black">5</th>
                  <th className="border border-black">6</th>
                  <th className="border border-black">7 (4*6)</th>
                  <th className="border border-black">8</th>
                  <th className="border border-black">9</th>
                  <th className="border border-black">10 (8*9)</th>
                  <th className="border border-black">11</th>
                  <th className="border border-black">12 (7+10+11)</th>
                  <th className="border border-black">13</th>
                  <th className="border border-black">14</th>
                  <th className="border border-black">15</th>
                  <th className="border border-black">16</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, index) => {
                  const showSrNo = index === 0 || row.srNo !== displayData[index - 1].srNo;
                  const showClass = index === 0 || row.classLabel !== displayData[index - 1].classLabel;
                  
                  let srNoRowSpan = 1;
                  if (showSrNo) {
                    for (let i = index + 1; i < displayData.length; i++) {
                      if (displayData[i].srNo === row.srNo) srNoRowSpan++;
                      else break;
                    }
                  }

                  let classRowSpan = 1;
                  if (showClass) {
                    for (let i = index + 1; i < displayData.length; i++) {
                      if (displayData[i].classLabel === row.classLabel) classRowSpan++;
                      else break;
                    }
                  }

                  return (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    {showSrNo && (
                      <td rowSpan={srNoRowSpan} className="border border-black px-1 py-1 align-middle">{row.srNo}</td>
                    )}
                    {showClass && (
                      <td rowSpan={classRowSpan} className="border border-black px-1 py-1 align-middle">{row.classLabel}</td>
                    )}
                    <td className="border border-black px-2 py-1 text-left">{row.title}</td>
                    <td className="border border-black px-1 py-1">
                      <input 
                        type="number" min="0" 
                        className="w-full text-center border border-gray-300 rounded p-0.5 text-[13px] focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                        value={row.divisions} 
                        onChange={e => handleRowChange(row.id, 'divisions', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black px-1 py-1">
                      <input 
                        type="number" min="0" 
                        className="w-full text-center border border-gray-300 rounded p-0.5 text-[13px] focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                        value={row.students} 
                        onChange={e => handleRowChange(row.id, 'students', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black px-1 py-1">
                      <input 
                        type="number" min="0" 
                        className="w-full text-center border border-gray-300 rounded p-0.5 text-[13px] focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                        value={row.thHrs} 
                        onChange={e => handleRowChange(row.id, 'thHrs', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black px-1 py-1 font-bold bg-gray-50/50">{row.thTotal}</td>
                    <td className="border border-black px-1 py-1">
                      <input 
                        type="number" min="0" 
                        className="w-full text-center border border-gray-300 rounded p-0.5 text-[13px] focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                        value={row.prBatches} 
                        onChange={e => handleRowChange(row.id, 'prBatches', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black px-1 py-1">
                      <input 
                        type="number" min="0" 
                        className="w-full text-center border border-gray-300 rounded p-0.5 text-[13px] focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                        value={row.prHrs} 
                        onChange={e => handleRowChange(row.id, 'prHrs', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black px-1 py-1 font-bold bg-gray-50/50">{row.prTotal}</td>
                    <td className="border border-black px-1 py-1">
                      <input 
                        type="number" min="0" 
                        className="w-full text-center border border-gray-300 rounded p-0.5 text-[13px] focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                        value={row.tutHrs} 
                        onChange={e => handleRowChange(row.id, 'tutHrs', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black px-1 py-1 font-bold bg-gray-50">{row.totalHrs}</td>
                    <td className="border border-black px-1 py-1">{row.credL}</td>
                    <td className="border border-black px-1 py-1">{row.credP}</td>
                    <td className="border border-black px-1 py-1">{row.credT}</td>
                    <td className="border border-black px-2 py-1">
                      <select 
                        className="w-full mb-1 text-xs border border-gray-300 rounded p-0.5 focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none bg-white cursor-pointer" 
                        value={row.isCore ? 'Yes' : 'No'} 
                        onChange={e => handleRowChange(row.id, 'isCore', e.target.value === 'Yes')}
                      >
                        <option value="Yes">Yes (Core)</option>
                        <option value="No">No (Other Dept)</option>
                      </select>
                      {!row.isCore && (
                        <input 
                          type="text" 
                          placeholder="Dept & Teacher Name" 
                          className="w-full text-xs border border-gray-300 rounded p-0.5 focus:ring-1 focus:ring-[var(--color-signal-orange)] outline-none" 
                          value={row.deptAndTeacher} 
                          onChange={e => handleRowChange(row.id, 'deptAndTeacher', e.target.value)} 
                        />
                      )}
                    </td>
                  </tr>
                )})}
                {/* Total Row */}
                <tr className="font-bold bg-gray-50">
                  <td colSpan={6} className="border border-black px-4 py-2 text-right">TOTAL</td>
                  <td className="border border-black px-1 py-2">{sumThTotal}</td>
                  <td className="border border-black px-1 py-2"></td>
                  <td className="border border-black px-1 py-2"></td>
                  <td className="border border-black px-1 py-2">{sumPrTotal}</td>
                  <td className="border border-black px-1 py-2">{sumTutHrs}</td>
                  <td className="border border-black px-1 py-2 text-blue-800">{sumTotalHrs}</td>
                  <td className="border border-black px-1 py-2">{sumCredL}</td>
                  <td className="border border-black px-1 py-2">{sumCredP}</td>
                  <td className="border border-black px-1 py-2">{sumCredT}</td>
                  <td className="border border-black px-1 py-2"></td>
                </tr>
              </tbody>
            </table>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
