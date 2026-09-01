const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/data/CSE_SOET_W-26-wef_17.8.2026_Personal.xlsx');
const workbook = xlsx.readFile(filePath);

const sheetName = 'PSS'; 
const sheet = workbook.Sheets[sheetName];
const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log(JSON.stringify(json, null, 2));
