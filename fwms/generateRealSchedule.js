const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/data/CSE_SOET_W-26-wef_17.8.2026_Personal.xlsx');
const workbook = xlsx.readFile(filePath);

const result = [];

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (json.length === 0) return;

  // Look for faculty name and department
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

  // If it doesn't have "Name of faculty", maybe it's still a faculty sheet if it's named like 'VSR' and has 'Day' row?
  // Let's rely on dayRowIndex. Class timetables have "Class :" or "Class Time Table"
  if (!isFacultySheet) return; // Strict skip if not a faculty sheet
  if (dayRowIndex === -1) return; // Skip if no timetable structure

  const timeSlots = json[dayRowIndex].map(s => s ? s.trim() : '').filter(s => s && s.toLowerCase() !== 'day');
  
  const schedule = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = dayRowIndex + 1; i < json.length; i++) {
    const row = json[i] || [];
    const dayStr = (row[0] || '').toString().toLowerCase().trim();
    if (days.includes(dayStr)) {
      const dayName = dayStr.toUpperCase();
      schedule[dayName] = [];
      
      // Map columns
      for (let col = 1; col < row.length; col++) {
        if (!timeSlots[col - 1]) continue;
        
        let cellVal = row[col];
        if (!cellVal || (typeof cellVal === 'string' && cellVal.toLowerCase().includes('recess'))) continue;
        
        // Clean cellVal
        cellVal = cellVal.toString().trim();
        if (!cellVal) continue;

        // Try to parse activity and location. Usually separated by \n
        const parts = cellVal.split('\n').map(p => p.trim()).filter(Boolean);
        let activity = parts[0] || cellVal;
        
        // Remove trailing multiple spaces and initials like (PKD) from activity
        activity = activity.replace(/\s{2,}.*?$/, '').trim();
        
        let location = parts.length > 1 ? parts[1] : '';
        // Sometime location is in parts[2] if parts[1] is empty
        if (parts.length > 2 && !location) location = parts[2];
        
        schedule[dayName].push({
          time: timeSlots[col - 1],
          activity: activity,
          location: location.replace(/\r/g, ''),
          floor: ''
        });
      }
    }
  }

  if (Object.keys(schedule).length > 0) {
    result.push({
      facultyName,
      department,
      schedule
    });
  }
});

const outputPath = path.join(__dirname, 'apps/web/src/data/scheduleData.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Successfully generated scheduleData.json with ${result.length} faculty entries.`);
