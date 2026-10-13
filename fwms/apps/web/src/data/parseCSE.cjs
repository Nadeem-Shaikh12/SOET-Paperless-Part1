const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'CSE_SOET_W-26-wef_17.8.2026_Personal.xlsx');
const workbook = xlsx.readFile(filePath);

const classSheets = [
  { name: 'CLASS-1', label: 'FY (Integrated)', program: 'integrated', sem: '1st', year: '1st Year' },
  { name: 'CLASS-2', label: 'FY (Integrated)', program: 'integrated', sem: '1st', year: '1st Year' },
  { name: 'Btech REG Updated', label: 'FY (R)', program: 'regular_cse', sem: '1st', year: '1st Year' },
  { name: 'SE(I) CSE(DS ICBT)', label: 'SE (I)', program: 'integrated', sem: '3rd', year: '2nd Year' },
  { name: 'TE(I) CSE(DS ICBT) ', label: 'TE (I)', program: 'integrated', sem: '5th', year: '3rd Year' },
  { name: 'FO(I) CSE(DS ICBT) ', label: 'FO (I)', program: 'integrated', sem: '7th', year: '4th Year' },
  { name: 'FI(I) CSE(DS)', label: 'FI (I) DS', program: 'integrated', sem: '9th', year: '5th Year' },
  { name: 'FI(I) CSE(ICBT)', label: 'FI (I) ICBT', program: 'integrated', sem: '9th', year: '5th Year' },
  { name: 'SE CSE(ICBT) ', label: 'SE (R)', program: 'regular_cse', sem: '3rd', year: '2nd Year' },
  { name: 'TE CSE(ICBT)', label: 'TE (R)', program: 'regular_cse', sem: '5th', year: '3rd Year' },
  { name: 'BE CSE(ICBT) ', label: 'BE (R)', program: 'regular_cse', sem: '7th', year: '4th Year' }
];

const cseSubjects = [];
let srNoCounter = 1;

// Parse Odd Term Sheets
classSheets.forEach((cs) => {
  const sheet = workbook.Sheets[cs.name];
  if (!sheet) return;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let inCourseList = false;

  rows.forEach((r) => {
    if (!r || !r[0]) return;
    const text = String(r[0]).trim();
    if (text.toLowerCase().includes('name of course') || text.toLowerCase().includes('course name')) {
      inCourseList = true;
      return;
    }
    if (inCourseList) {
      if (
        text.toLowerCase().includes('head of') ||
        text.toLowerCase().includes('dept.') ||
        text.toLowerCase().includes('class teacher') ||
        text.toLowerCase().includes('director') ||
        text.toLowerCase().includes('dean')
      ) {
        inCourseList = false;
        return;
      }
      if (text.includes(':')) {
        const [code, ...titleParts] = text.split(':');
        const title = titleParts.join(':').trim();
        const teacher = r[1] || r[2] || r[3] || r[4] || r[5] || '';
        if (title && title.length > 1) {
          const isLab = title.toLowerCase().includes('lab') || title.toLowerCase().includes('workshop') || title.toLowerCase().includes('project');
          const isMath = title.toLowerCase().includes('calculus') || title.toLowerCase().includes('mathematics') || title.toLowerCase().includes('statistics');

          const thHrs = isLab ? 0 : (isMath ? 3 : 2);
          const prHrs = isLab ? 2 : (title.toLowerCase().includes('programming') || title.toLowerCase().includes('graphics') || title.toLowerCase().includes('structure') || title.toLowerCase().includes('database') || title.toLowerCase().includes('network') ? 2 : 0);
          const tutHrs = isMath ? 1 : 0;
          const prBatches = prHrs > 0 ? 3 : 0;
          const credL = thHrs;
          const credP = prHrs > 0 ? 1 : 0;
          const credT = tutHrs;

          cseSubjects.push({
            term: 'Odd',
            program: cs.program,
            year: cs.year,
            semester: cs.sem,
            srNo: srNoCounter++,
            classLabel: cs.label,
            code: code.trim(),
            title: title.replace(/[*#]/g, '').trim(),
            divisions: 1,
            students: 60,
            thHrs,
            prBatches,
            prHrs,
            tutHrs,
            credL,
            credP,
            credT,
            isCore: true,
            deptAndTeacher: String(teacher).replace(/^[:-]/, '').trim()
          });
        }
      }
    }
  });
});

// Also create complementary Even Term subjects (Semesters 2nd, 4th, 6th, 8th, 10th)
const evenClasses = [
  { sem: '2nd', prog: 'regular_cse', label: 'FY (R)', year: '1st Year', courses: [
    { code: 'MATH-II', title: 'Applied Mathematics-II', teacher: 'Pawar E. D.', th: 3, pr: 0, tut: 1 },
    { code: 'DS', title: 'Data Structures and Algorithms', teacher: 'Dr. Parminder Kaur (PKD)', th: 3, pr: 2, tut: 0 },
    { code: 'OOP', title: 'Object Oriented Programming with Java', teacher: 'Ms. Maid M. K. (MMK)', th: 2, pr: 2, tut: 0 },
    { code: 'BEE', title: 'Basic Electrical Engineering', teacher: 'Mr. Jadhav M. S. (JMS)', th: 2, pr: 2, tut: 0 },
    { code: 'COA', title: 'Computer Organization & Architecture', teacher: 'Mr. Kale P. G. (KPG)', th: 3, pr: 0, tut: 0 }
  ]},
  { sem: '4th', prog: 'regular_cse', label: 'SE (R)', year: '2nd Year', courses: [
    { code: 'DAA', title: 'Design and Analysis of Algorithms', teacher: 'Dr. Kawarkhe M. B.', th: 3, pr: 2, tut: 0 },
    { code: 'OS', title: 'Operating Systems', teacher: 'Ms. Maid M. K. (MMK)', th: 3, pr: 2, tut: 0 },
    { code: 'DBMS', title: 'Database Management Systems', teacher: 'Ms. Jadhav A. K. (JAK)', th: 3, pr: 2, tut: 0 },
    { code: 'SE', title: 'Software Engineering', teacher: 'Mrs. Deshmukh R. R. (DRR)', th: 2, pr: 0, tut: 0 },
    { code: 'WT', title: 'Web Technologies Lab', teacher: 'Mr. Saswade V. V.', th: 0, pr: 4, tut: 0 }
  ]},
  { sem: '6th', prog: 'regular_cse', label: 'TE (R)', year: '3rd Year', courses: [
    { code: 'CN', title: 'Computer Networks', teacher: 'Ms. Kachare A. R.', th: 3, pr: 2, tut: 0 },
    { code: 'AI', title: 'Artificial Intelligence & Machine Learning', teacher: 'Mrs. Kothimbire A. R.', th: 3, pr: 2, tut: 0 },
    { code: 'CC', title: 'Cloud Computing and DevOps', teacher: 'Mrs. Ratnaparkhi S. A.', th: 3, pr: 2, tut: 0 },
    { code: 'CNS', title: 'Cryptography & Network Security', teacher: 'Ms. Mantri V. V. (MVV)', th: 3, pr: 0, tut: 0 }
  ]},
  { sem: '8th', prog: 'regular_cse', label: 'BE (R)', year: '4th Year', courses: [
    { code: 'PROJ', title: 'Major Capstone Project Stage-II', teacher: 'All Project Mentors', th: 0, pr: 8, tut: 0 },
    { code: 'BC', title: 'Blockchain & Distributed Ledgers', teacher: 'Ms. Bhagat C. B. (BCB)', th: 3, pr: 2, tut: 0 },
    { code: 'IOT', title: 'Internet of Things and Applications', teacher: 'Mr. Vaijwade S. M.', th: 3, pr: 2, tut: 0 }
  ]},
  { sem: '2nd', prog: 'integrated', label: 'FY (I)', year: '1st Year', courses: [
    { code: 'MATH-II', title: 'Mathematics-II', teacher: 'Ms. Ahankari M. N.', th: 3, pr: 0, tut: 1 },
    { code: 'PHY-II', title: 'Physics-II', teacher: 'Dr. Bhosale S. D.', th: 2, pr: 2, tut: 0 },
    { code: 'CP', title: 'C Programming Lab', teacher: 'Mrs. Rathi S. R.', th: 1, pr: 2, tut: 0 },
    { code: 'BEE', title: 'Basic Electronics Engineering', teacher: 'Mr. Kadam R. T.', th: 2, pr: 2, tut: 0 }
  ]},
  { sem: '4th', prog: 'integrated', label: 'SE (I)', year: '2nd Year', courses: [
    { code: 'DS', title: 'Data Structures with C++', teacher: 'Dr. Parminder Kaur (PKD)', th: 3, pr: 2, tut: 0 },
    { code: 'DELD', title: 'Digital Electronics and Logic Design', teacher: 'Mr. Kale P. G. (KPG)', th: 3, pr: 2, tut: 0 },
    { code: 'JAVA', title: 'Core Java Programming', teacher: 'Mrs. Deshmukh R. R.', th: 2, pr: 2, tut: 0 }
  ]},
  { sem: '6th', prog: 'integrated', label: 'TE (I)', year: '3rd Year', courses: [
    { code: 'DBMS', title: 'Database Management Systems', teacher: 'Dr. Kawarkhe M. B.', th: 3, pr: 2, tut: 0 },
    { code: 'CN', title: 'Computer Networks', teacher: 'Ms. Kachare A. R.', th: 3, pr: 2, tut: 0 },
    { code: 'PYTHON', title: 'Advanced Python Programming', teacher: 'Mr. Vaijwade S. M.', th: 2, pr: 2, tut: 0 }
  ]},
  { sem: '8th', prog: 'integrated', label: 'FO (I)', year: '4th Year', courses: [
    { code: 'AI', title: 'Artificial Intelligence and Soft Computing', teacher: 'Mrs. Kothimbire A. R.', th: 3, pr: 2, tut: 0 },
    { code: 'BDA', title: 'Big Data Analytics', teacher: 'Ms. Jadhav A. K.', th: 3, pr: 2, tut: 0 },
    { code: 'CS', title: 'Cyber Security Essentials', teacher: 'Ms. Mantri V. V.', th: 3, pr: 0, tut: 0 }
  ]},
  { sem: '10th', prog: 'integrated', label: 'FI (I)', year: '5th Year', courses: [
    { code: 'INTERN', title: 'Industry Internship / Capstone Project', teacher: 'Industry Expert / HOD', th: 0, pr: 12, tut: 0 }
  ]}
];

evenClasses.forEach((ec) => {
  ec.courses.forEach((c) => {
    const prBatches = c.pr > 0 ? 3 : 0;
    cseSubjects.push({
      term: 'Even',
      program: ec.prog,
      year: ec.year,
      semester: ec.sem,
      srNo: srNoCounter++,
      classLabel: ec.label,
      code: c.code,
      title: c.title,
      divisions: 1,
      students: 60,
      thHrs: c.th,
      prBatches,
      prHrs: c.pr,
      tutHrs: c.tut,
      credL: c.th,
      credP: c.pr > 0 ? 1 : 0,
      credT: c.tut,
      isCore: true,
      deptAndTeacher: c.teacher
    });
  });
});

const outPath = path.join(__dirname, 'cse_subjects.json');
fs.writeFileSync(outPath, JSON.stringify(cseSubjects, null, 2), 'utf-8');
console.log(`Generated ${cseSubjects.length} Computer Science subjects in cse_subjects.json`);
