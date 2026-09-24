const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Mechanical Teaching Load 2026-27 (Odd & Even) (1) (2).xlsx');
const workbook = xlsx.readFile(filePath);

const parsedData = [];

function parseSheet(sheetName, term) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let currentClass = '';
  
  for (let i = 9; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // Check if row has course name (col 2)
    const title = row[2];
    if (!title || typeof title !== 'string' || title.trim() === '') continue;
    if (title.toLowerCase().includes('total')) continue;

    if (row[1] && typeof row[1] === 'string' && row[1].trim() !== '') {
      currentClass = row[1].trim();
    }
    
    if (!currentClass) continue;

    let program = '';
    if (currentClass.includes('(I)')) program = 'integrated';
    else if (currentClass.includes('(R)')) program = 'regular';
    else program = 'regular'; // default

    let yearStr = '';
    let semester = ''; // optional to guess, but we can map year and term to semester
    
    if (currentClass.includes('FE') || currentClass.includes('FY')) yearStr = '1st Year';
    else if (currentClass.includes('SE') || currentClass.includes('SY')) yearStr = '2nd Year';
    else if (currentClass.includes('TE') || currentClass.includes('TY')) yearStr = '3rd Year';
    else if (currentClass.includes('BE') || currentClass.includes('B.Tech') || currentClass.includes('Final')) yearStr = '4th Year';
    else if (currentClass.includes('Fifth')) yearStr = '5th Year';
    else if (currentClass.includes('Sixth')) yearStr = '6th Year';
    
    // Calculate semester based on year and term
    if (yearStr) {
      const yearNum = parseInt(yearStr[0]);
      if (!isNaN(yearNum)) {
        if (term === 'Odd') {
          semester = String((yearNum - 1) * 2 + 1) + (((yearNum - 1) * 2 + 1) === 1 ? 'st' : ((yearNum - 1) * 2 + 1) === 3 ? 'rd' : 'th');
        } else {
          semester = String((yearNum - 1) * 2 + 2) + (((yearNum - 1) * 2 + 2) === 2 ? 'nd' : 'th');
        }
      }
    }

    // Credits L, P, T are usually at indices 12, 13, 14, or we can just grab from 5, 7.
    // Let's use 5 for L, 7 for P if 12/13 are empty.
    const lHrs = row[5] || 0;
    const pHrs = row[7] || 0;
    const credits = (row[12] || 0) + (row[13] || 0) + (row[14] || 0) || (lHrs + pHrs/2);
    
    // Mock the missing data for the table layout (eval, code, nature, category)
    const category = 'PCC';
    const code = 'MECH' + Math.floor(100 + Math.random() * 900);
    const nature = pHrs > 0 && lHrs === 0 ? 'Practical' : 'Lecture';
    
    parsedData.push({
      program,
      year: yearStr,
      term,
      semester,
      classLabel: currentClass,
      
      category,
      code,
      title: title.replace(/[*#]/g, '').trim(),
      nature,
      credits: credits,
      l: lHrs || '-',
      p: pHrs || '-',
      evalInt: 60,
      evalExt: 40,
      evalTot: 100,
      passInt: 24,
      passExt: 16,
      passTot: 40
    });
  }
}

parseSheet('Part-1', 'Odd');
parseSheet('Part-2', 'Even');

fs.writeFileSync(path.join(__dirname, 'mechanical_subjects.json'), JSON.stringify(parsedData, null, 2));
console.log('Successfully wrote', parsedData.length, 'subjects to mechanical_subjects.json');
