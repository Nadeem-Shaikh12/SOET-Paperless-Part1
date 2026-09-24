const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/data/CSE_SOET_W-26-wef_17.8.2026_Personal.xlsx');
const workbook = xlsx.readFile(filePath);

const classBatchMapping = {};

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length === 0) return;

  const textContent = json.map(r => r.join(' ').toLowerCase()).join(' ');
  const isClassSheet = textContent.includes('class time table') && !textContent.includes('name of faculty');
  if (!isClassSheet) return;

  let dayRowIndex = -1;
  for (let i = 0; i < Math.min(json.length, 15); i++) {
    if (json[i] && json[i][0] && typeof json[i][0] === 'string' && json[i][0].toLowerCase().trim() === 'day') {
      dayRowIndex = i;
      break;
    }
  }

  if (dayRowIndex === -1) return;

  const timeSlots = json[dayRowIndex].map(s => s ? s.toString().trim() : '').filter(s => s && s.toLowerCase() !== 'day');
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let i = dayRowIndex + 1; i < json.length; i++) {
    const row = json[i] || [];
    const dayStr = (row[0] || '').toString().toLowerCase().trim();
    if (days.includes(dayStr)) {
      const dayName = dayStr.toUpperCase();
      for (let col = 1; col < row.length; col++) {
        if (!timeSlots[col - 1]) continue;
        let cellVal = row[col];
        if (!cellVal) continue;
        cellVal = cellVal.toString();
        
        const match = cellVal.match(/\(([A-Za-z0-9]+)\)/g);
        if (match) {
          match.forEach(m => {
            const initial = m.replace(/[()]/g, '');
            if (!classBatchMapping[initial]) classBatchMapping[initial] = {};
            if (!classBatchMapping[initial][dayName]) classBatchMapping[initial][dayName] = {};
            
            if (!classBatchMapping[initial][dayName][timeSlots[col - 1]]) {
              classBatchMapping[initial][dayName][timeSlots[col - 1]] = [];
            }
            
            let shortBatch = sheetName.trim();
            if (shortBatch.startsWith('FI(I)')) shortBatch = 'FI(I)';
            else if (shortBatch.startsWith('SE(I)')) shortBatch = 'SE(I)';
            else if (shortBatch.startsWith('TE(I)')) shortBatch = 'TE(I)';
            else if (shortBatch.startsWith('FO(I)')) shortBatch = 'FO(I)';
            else if (shortBatch.startsWith('SE CSE')) shortBatch = 'SE(R)';
            else if (shortBatch.startsWith('TE CSE')) shortBatch = 'TE(R)';
            else if (shortBatch.startsWith('BE CSE')) shortBatch = 'BE(R)';
            else if (shortBatch === 'Btech REG Updated') shortBatch = 'FY(R)';
            
            if (!classBatchMapping[initial][dayName][timeSlots[col - 1]].includes(shortBatch)) {
              classBatchMapping[initial][dayName][timeSlots[col - 1]].push(shortBatch);
            }
          });
        }
      }
    }
  }
});

const result = [];

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length === 0) return;

  let facultyName = sheetName;
  let department = 'Unknown Dept';
  let isFacultySheet = false;
  let dayRowIndex = -1;

  for (let i = 0; i < Math.min(json.length, 15); i++) {
    const rowStr = (json[i] || []).join(' ').toLowerCase();
    if (rowStr.includes('name of faculty')) {
      const cell = json[i].find(c => typeof c === 'string' && c.toLowerCase().includes('name of faculty'));
      if (cell) {
        facultyName = cell.split(':')[1]?.trim() || facultyName;
        isFacultySheet = true;
      }
    }
    if (rowStr.includes('department:')) {
      const cell = json[i].find(c => typeof c === 'string' && c.toLowerCase().includes('department:'));
      if (cell) {
        department = cell.split(':')[1]?.trim() || department;
      }
    }
    if (json[i] && json[i][0] && typeof json[i][0] === 'string' && json[i][0].toLowerCase().trim() === 'day') {
      dayRowIndex = i;
    }
  }

  if (!isFacultySheet || dayRowIndex === -1) return; 

  let facultyInitial = sheetName;
  const initialMatch = facultyName.match(/\(([A-Za-z0-9]+)\)/);
  if (initialMatch) {
    facultyInitial = initialMatch[1];
  }

  const timeSlots = json[dayRowIndex].map(s => s ? s.toString().trim() : '').filter(s => s && s.toLowerCase() !== 'day');
  const schedule = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = dayRowIndex + 1; i < json.length; i++) {
    const row = json[i] || [];
    const dayStr = (row[0] || '').toString().toLowerCase().trim();
    if (days.includes(dayStr)) {
      const dayName = dayStr.toUpperCase();
      schedule[dayName] = [];
      
      let ongoingLab = null;
      for (let col = 1; col <= timeSlots.length; col++) {
        if (!timeSlots[col - 1]) continue;
        
        let cellVal = row[col];
        const isRecess = timeSlots[col - 1] === '12:00-12:45' || timeSlots[col - 1] === '2:45-3:00' || (typeof cellVal === 'string' && cellVal.toLowerCase().includes('recess'));
        
        if (!cellVal || isRecess) {
          if (!isRecess && ongoingLab) {
            schedule[dayName].push({
              time: timeSlots[col - 1],
              activity: ongoingLab.activity,
              location: ongoingLab.location,
              floor: '',
              batch: ongoingLab.batch
            });
            ongoingLab = null;
          }
          continue;
        }
        
        cellVal = cellVal.toString().trim();
        if (!cellVal) {
          if (ongoingLab && !isRecess) {
            schedule[dayName].push({
              time: timeSlots[col - 1],
              activity: ongoingLab.activity,
              location: ongoingLab.location,
              floor: '',
              batch: ongoingLab.batch
            });
            ongoingLab = null;
          }
          continue;
        }

        const parts = cellVal.split('\n').map(p => p.trim()).filter(Boolean);
        let activity = parts[0] || cellVal;
        activity = activity.replace(/\s{2,}.*?$/, '').trim();
        
        let location = parts.length > 1 ? parts[1] : '';
        if (parts.length > 2 && !location) location = parts[2];
        
        let batch = '';
        if (classBatchMapping[facultyInitial] && classBatchMapping[facultyInitial][dayName] && classBatchMapping[facultyInitial][dayName][timeSlots[col - 1]]) {
           batch = classBatchMapping[facultyInitial][dayName][timeSlots[col - 1]].join(', ');
        }

        schedule[dayName].push({
          time: timeSlots[col - 1],
          activity: activity,
          location: location.replace(/\r/g, ''),
          floor: '',
          batch: batch
        });

        if (activity.toLowerCase().includes('lab') || activity.toLowerCase().includes('practical') || activity.toLowerCase().includes('pr.')) {
          ongoingLab = {
            activity: activity,
            location: location.replace(/\r/g, ''),
            batch: batch
          };
        } else {
          ongoingLab = null;
        }
      }
    }
  }

  if (Object.keys(schedule).length > 0) {
    result.push({ facultyName, department, schedule });
  }
});

const outputPath = path.join(__dirname, 'apps/web/src/data/scheduleData.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log('Successfully generated scheduleData.json with ' + result.length + ' faculty entries.');
