import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Full Portal Data Synchronization...');

  // 1. Password Hashes
  const adminPassHash = await bcrypt.hash('Admin@123', 10);
  const hodPassHash = await bcrypt.hash('Hod@123', 10);
  const facultyPassHash = await bcrypt.hash('Password123!', 10);

  // 2. School
  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: { schoolName: 'School of Engineering and Technology', deanName: 'Dr. S. C. Tamane' },
    create: {
      id: 1,
      schoolName: 'School of Engineering and Technology',
      deanName: 'Dr. S. C. Tamane',
      isActive: true,
    },
  });
  console.log(`✅ School synced: ${school.schoolName}`);

  // 3. Departments
  const departmentsData = [
    { id: 1, name: 'Computer Science and Engineering', batchSize: 20 },
    { id: 2, name: 'Information Technology', batchSize: 20 },
    { id: 3, name: 'Mechanical Engineering', batchSize: 20 },
    { id: 4, name: 'Civil Engineering', batchSize: 20 },
    { id: 5, name: 'Electrical & Electronics Engineering', batchSize: 20 },
  ];

  for (const d of departmentsData) {
    await prisma.department.upsert({
      where: { id: d.id },
      update: { deptName: d.name, schoolId: school.id, defaultBatchSize: d.batchSize, isActive: true },
      create: {
        id: d.id,
        deptName: d.name,
        schoolId: school.id,
        defaultBatchSize: d.batchSize,
        isActive: true,
      },
    });
  }
  console.log(`✅ 5 Departments synced (CSE, IT, Mechanical, Civil, Electrical & Electronics)`);

  // 4. Academic Terms
  const termsData = [
    { id: 1, year: '2024-25', sem: 'Odd', status: 'active' as const, start: '2024-08-01', end: '2024-12-15' },
    { id: 2, year: '2026-27', sem: 'Odd', status: 'active' as const, start: '2026-07-01', end: '2026-11-30' },
    { id: 3, year: '2026-27', sem: 'Even', status: 'archived' as const, start: '2026-12-15', end: '2027-05-15' },
  ];

  for (const t of termsData) {
    await prisma.academicTerm.upsert({
      where: { id: t.id },
      update: { academicYear: t.year, semester: t.sem, status: t.status, startDate: new Date(t.start), endDate: new Date(t.end) },
      create: {
        id: t.id,
        academicYear: t.year,
        semester: t.sem,
        status: t.status,
        startDate: new Date(t.start),
        endDate: new Date(t.end),
      },
    });
  }
  console.log(`✅ Academic Terms synced (2024-25 Odd, 2026-27 Odd, 2026-27 Even)`);

  // 5. Workload Norms for all terms
  const normsConfig = [
    { desig: 'Professor' as const, min: 8, max: 14, tm: 1.0, pm: 2.0 },
    { desig: 'Associate_Professor' as const, min: 10, max: 16, tm: 1.0, pm: 2.0 },
    { desig: 'Assistant_Professor' as const, min: 12, max: 18, tm: 1.0, pm: 2.0 },
  ];

  for (const t of [1, 2, 3]) {
    for (const n of normsConfig) {
      await prisma.norms.upsert({
        where: { designation_effectiveTermId: { designation: n.desig, effectiveTermId: t } },
        update: { minWeeklyHours: n.min, maxWeeklyHours: n.max, defaultTheoryMultiplier: n.tm, defaultPracticalMultiplier: n.pm, slaDaysForHodReview: 3 },
        create: {
          designation: n.desig,
          effectiveTermId: t,
          minWeeklyHours: n.min,
          maxWeeklyHours: n.max,
          defaultTheoryMultiplier: n.tm,
          defaultPracticalMultiplier: n.pm,
          slaDaysForHodReview: 3,
        },
      });
    }
  }
  console.log(`✅ UGC Workload Norms synced across all terms`);

  // 6. Super Admin
  await prisma.userAuth.upsert({
    where: { username: 'admin@mgm.edu' },
    update: { passwordHash: adminPassHash, role: 'super_admin', status: 'active' },
    create: {
      username: 'admin@mgm.edu',
      passwordHash: adminPassHash,
      role: 'super_admin',
      mustChangePassword: false,
      status: 'active',
    },
  });
  console.log(`✅ Super Admin synced: admin@mgm.edu / Admin@123`);

  // 7. Faculty Seeding
  // Load scheduleData.json for CSE faculty
  const schedulePath = path.resolve(__dirname, '../web/src/data/scheduleData.json');
  const cseScheduleData: any[] = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));

  // Mechanical faculty from Excel
  const mechPath = path.resolve(__dirname, '../web/src/data/Mechanical Teaching Load 2026-27 (Odd & Even) (1) (2).xlsx');
  const mechWb = xlsx.readFile(mechPath);
  const mechSheet = mechWb.Sheets['Load distribution Part-1'];
  const mechData = xlsx.utils.sheet_to_json(mechSheet, { header: 1 });

  const mechTeachersList: Array<{ name: string; desig: string; courses: any[] }> = [];
  let currentMechTeacher = '';
  let currentMechDesig = '';
  let currentCourses: any[] = [];

  for (let r = 11; r < mechData.length; r++) {
    const row: any = mechData[r];
    if (!row) continue;
    if (row[1]) {
      if (currentMechTeacher && currentCourses.length > 0) {
        mechTeachersList.push({ name: currentMechTeacher, desig: currentMechDesig, courses: [...currentCourses] });
      }
      currentMechTeacher = String(row[1]).trim();
      currentMechDesig = String(row[2] || 'Assistant Professor').trim();
      currentCourses = [];
    }
    if (!currentMechTeacher) continue;
    if (currentMechTeacher.toLowerCase().includes('total') || currentMechTeacher.toLowerCase().includes('remaining')) break;

    const th = Number(row[6]) || 0;
    const pr = Number(row[7]) || 0;
    const course = row[5] ? String(row[5]).trim() : '';
    const cls = row[4] ? String(row[4]).trim() : '';
    if (course) {
      currentCourses.push({ class: cls, course, th, pr, total: th + pr });
    }
  }
  if (currentMechTeacher && currentCourses.length > 0) {
    mechTeachersList.push({ name: currentMechTeacher, desig: currentMechDesig, courses: [...currentCourses] });
  }

  // Seed CSE Faculty
  const cseFacultyMap = new Map<string, number>(); // name -> facultyId
  for (const cse of cseScheduleData) {
    const name = cse.facultyName.trim();
    const email = name.replace(/[^a-zA-Z]/g, '').toLowerCase() + '@mgmu.ac.in';
    const isProf = name.includes('Dr.') || name.includes('Parminder') || name.includes('Kawarkhe');
    const desig = isProf ? 'Professor' : 'Assistant_Professor';
    const isHod = name.toLowerCase().includes('parminder');

    const fac = await prisma.faculty.upsert({
      where: { email },
      update: { name, deptId: 1, designation: desig, status: 'active' },
      create: {
        name,
        email,
        designation: desig,
        deptId: 1,
        employmentType: 'Permanent',
        status: 'active',
        userAuth: {
          create: {
            username: email,
            passwordHash: isHod ? hodPassHash : facultyPassHash,
            role: isHod ? 'dept_admin' : 'faculty',
            mustChangePassword: false,
            status: 'active',
          },
        },
      },
    });

    // Make sure userAuth exists and has correct role
    await prisma.userAuth.upsert({
      where: { username: email },
      update: { role: isHod ? 'dept_admin' : 'faculty', status: 'active', linkedId: fac.id },
      create: {
        username: email,
        passwordHash: isHod ? hodPassHash : facultyPassHash,
        role: isHod ? 'dept_admin' : 'faculty',
        linkedId: fac.id,
        mustChangePassword: false,
        status: 'active',
      },
    });

    if (isHod) {
      await prisma.department.update({ where: { id: 1 }, data: { hodId: fac.id } });
    }

    cseFacultyMap.set(name, fac.id);
  }
  console.log(`✅ ${cseFacultyMap.size} CSE Faculty synced with accounts (HOD: Dr. Parminder Kaur)`);

  // Seed Mechanical Faculty
  const mechFacultyMap = new Map<string, number>();
  for (const mech of mechTeachersList) {
    const name = mech.name.trim();
    const email = name.replace(/[^a-zA-Z]/g, '').toLowerCase() + '@mgmu.ac.in';
    const isHod = mech.desig.toLowerCase().includes('hod') || name.toLowerCase().includes('siddiqui');
    const desig = isHod ? 'Professor' : 'Assistant_Professor';

    const fac = await prisma.faculty.upsert({
      where: { email },
      update: { name, deptId: 3, designation: desig, status: 'active' },
      create: {
        name,
        email,
        designation: desig,
        deptId: 3,
        employmentType: 'Permanent',
        status: 'active',
        userAuth: {
          create: {
            username: email,
            passwordHash: isHod ? hodPassHash : facultyPassHash,
            role: isHod ? 'dept_admin' : 'faculty',
            mustChangePassword: false,
            status: 'active',
          },
        },
      },
    });

    await prisma.userAuth.upsert({
      where: { username: email },
      update: { role: isHod ? 'dept_admin' : 'faculty', status: 'active', linkedId: fac.id },
      create: {
        username: email,
        passwordHash: isHod ? hodPassHash : facultyPassHash,
        role: isHod ? 'dept_admin' : 'faculty',
        linkedId: fac.id,
        mustChangePassword: false,
        status: 'active',
      },
    });

    if (isHod) {
      await prisma.department.update({ where: { id: 3 }, data: { hodId: fac.id } });
    }

    mechFacultyMap.set(name, fac.id);
  }
  console.log(`✅ ${mechFacultyMap.size} Mechanical Faculty synced with accounts (HOD: Mr. Siddiqui J.A.)`);

  // Seed Civil and Electrical Key Faculty
  const otherFaculty = [
    { name: 'Dr. P. S. Patil', email: 'patilps@mgmu.ac.in', deptId: 4, desig: 'Professor' as const, isHod: true },
    { name: 'Dr. V. S. Rajguru', email: 'rajguruvs@mgmu.ac.in', deptId: 4, desig: 'Professor' as const, isHod: false },
    { name: 'Mr. D. A. Patil', email: 'patilda@mgmu.ac.in', deptId: 4, desig: 'Assistant_Professor' as const, isHod: false },
    { name: 'Mr. J. M. Sonawane', email: 'sonawanejm@mgmu.ac.in', deptId: 5, desig: 'Assistant_Professor' as const, isHod: true },
    { name: 'Mr. S. V. Kulkarni', email: 'kulkarnisv@mgmu.ac.in', deptId: 5, desig: 'Assistant_Professor' as const, isHod: false },
    { name: 'Mr. K. G. Pawar', email: 'pawarkg@mgmu.ac.in', deptId: 5, desig: 'Assistant_Professor' as const, isHod: false },
  ];

  for (const ofc of otherFaculty) {
    const fac = await prisma.faculty.upsert({
      where: { email: ofc.email },
      update: { name: ofc.name, deptId: ofc.deptId, designation: ofc.desig, status: 'active' },
      create: {
        name: ofc.name,
        email: ofc.email,
        designation: ofc.desig,
        deptId: ofc.deptId,
        employmentType: 'Permanent',
        status: 'active',
        userAuth: {
          create: {
            username: ofc.email,
            passwordHash: ofc.isHod ? hodPassHash : facultyPassHash,
            role: ofc.isHod ? 'dept_admin' : 'faculty',
            mustChangePassword: false,
            status: 'active',
          },
        },
      },
    });

    await prisma.userAuth.upsert({
      where: { username: ofc.email },
      update: { role: ofc.isHod ? 'dept_admin' : 'faculty', status: 'active', linkedId: fac.id },
      create: {
        username: ofc.email,
        passwordHash: ofc.isHod ? hodPassHash : facultyPassHash,
        role: ofc.isHod ? 'dept_admin' : 'faculty',
        linkedId: fac.id,
        mustChangePassword: false,
        status: 'active',
      },
    });

    if (ofc.isHod) {
      await prisma.department.update({ where: { id: ofc.deptId }, data: { hodId: fac.id } });
    }
  }
  console.log(`✅ Civil and Electrical Faculty synced (HODs configured)`);

  // 8. Classes and Divisions
  const classesList = [
    // CSE
    { name: 'FY', div: 'A', deptId: 1 },
    { name: 'SE', div: 'A', deptId: 1 },
    { name: 'TE', div: 'A', deptId: 1 },
    { name: 'BE', div: 'A', deptId: 1 },
    { name: 'FY (I)', div: 'A', deptId: 1 },
    { name: 'SE (I)', div: 'A', deptId: 1 },
    { name: 'TE (I)', div: 'A', deptId: 1 },
    { name: 'FO (I)', div: 'A', deptId: 1 },
    { name: 'FI (I)', div: 'A', deptId: 1 },
    // Mechanical
    { name: 'FE (R)', div: 'A', deptId: 3 },
    { name: 'SE (RA)', div: 'A', deptId: 3 },
    { name: 'TE (RA)', div: 'A', deptId: 3 },
    { name: 'BE (RA)', div: 'A', deptId: 3 },
    { name: 'SE (I)', div: 'A', deptId: 3 },
    { name: 'TE (I) RAI', div: 'A', deptId: 3 },
    { name: 'FO (I) RAI', div: 'A', deptId: 3 },
    { name: 'FI (I) RAI', div: 'A', deptId: 3 },
    // Civil & Electrical
    { name: 'SE (CE)', div: 'A', deptId: 4 },
    { name: 'TE (CE)', div: 'A', deptId: 4 },
    { name: 'SE (EE)', div: 'A', deptId: 5 },
    { name: 'TE (EE)', div: 'A', deptId: 5 },
  ];

  const classMap = new Map<string, number>(); // `${name}_${div}_${deptId}_${termId}` -> classId

  for (const termId of [1, 2]) {
    for (const c of classesList) {
      const createdCls = await prisma.classDivision.upsert({
        where: {
          className_division_deptId_termId: {
            className: c.name,
            division: c.div,
            deptId: c.deptId,
            termId,
          },
        },
        update: {},
        create: {
          className: c.name,
          division: c.div,
          deptId: c.deptId,
          termId,
        },
      });
      classMap.set(`${c.name}_${c.div}_${c.deptId}_${termId}`, createdCls.id);
      classMap.set(`${c.name}_${c.deptId}_${termId}`, createdCls.id);
    }
  }
  console.log(`✅ Classes & Divisions synced across Term 1 & 2`);

  // 9. Master Subjects Seeding
  // Load cse_subjects.json & mechanical_subjects.json
  const cseSubjPath = path.resolve(__dirname, '../web/src/data/cse_subjects.json');
  const mechSubjPath = path.resolve(__dirname, '../web/src/data/mechanical_subjects.json');
  const cseSubjectsJson: any[] = JSON.parse(fs.readFileSync(cseSubjPath, 'utf-8'));
  const mechSubjectsJson: any[] = JSON.parse(fs.readFileSync(mechSubjPath, 'utf-8'));

  const subjectMap = new Map<string, number>(); // `${code}_${termId}` -> subjectId

  for (const termId of [1, 2]) {
    // Seed CSE Subjects
    for (const s of cseSubjectsJson) {
      const code = (s.code || s.subjectCode || `CS-${s.srNo}`).trim().toUpperCase();
      const name = (s.title || s.subjectName || code).trim();
      const hasTh = (s.thHrs || 0) > 0 || (s.hasTheory ?? true);
      const hasPr = (s.prHrs || 0) > 0 || (s.hasPractical ?? false);
      const credits = Number(s.credL || s.creditHours || 3);

      const subj = await prisma.subject.upsert({
        where: { subjectCode_termId: { subjectCode: code, termId } },
        update: { subjectName: name, deptId: 1, hasTheory: hasTh, hasPractical: hasPr, creditHours: credits, isActive: true },
        create: {
          subjectCode: code,
          subjectName: name,
          deptId: 1,
          termId,
          hasTheory: hasTh,
          hasPractical: hasPr,
          creditHours: credits,
          isActive: true,
        },
      });
      subjectMap.set(`${code}_${termId}`, subj.id);
      subjectMap.set(`${name.toLowerCase()}_${termId}`, subj.id);
    }

    // Seed Mechanical Subjects
    for (const s of mechSubjectsJson) {
      const code = (s.code || s.subjectCode || `ME-${s.srNo || Math.floor(Math.random() * 1000)}`).trim().toUpperCase();
      const name = (s.title || s.subjectName || code).trim();
      const hasTh = (s.thHrs || s.l || 0) > 0 || (s.hasTheory ?? true);
      const hasPr = (s.prHrs || s.p || 0) > 0 || (s.hasPractical ?? false);
      const credits = Number(s.credL || s.credits || 3);

      const subj = await prisma.subject.upsert({
        where: { subjectCode_termId: { subjectCode: code, termId } },
        update: { subjectName: name, deptId: 3, hasTheory: hasTh, hasPractical: hasPr, creditHours: credits, isActive: true },
        create: {
          subjectCode: code,
          subjectName: name,
          deptId: 3,
          termId,
          hasTheory: hasTh,
          hasPractical: hasPr,
          creditHours: credits,
          isActive: true,
        },
      });
      subjectMap.set(`${code}_${termId}`, subj.id);
      subjectMap.set(`${name.toLowerCase()}_${termId}`, subj.id);
    }

    // Key Civil & Electrical Subjects
    const civilSubs = [
      { code: 'CE-SA', name: 'Structural Analysis', deptId: 4, hasTh: true, hasPr: true, credits: 4 },
      { code: 'CE-FM', name: 'Fluid Mechanics', deptId: 4, hasTh: true, hasPr: true, credits: 4 },
      { code: 'CE-SUR', name: 'Surveying & Geomatics', deptId: 4, hasTh: true, hasPr: true, credits: 4 },
    ];
    for (const cs of civilSubs) {
      const subj = await prisma.subject.upsert({
        where: { subjectCode_termId: { subjectCode: cs.code, termId } },
        update: { subjectName: cs.name, deptId: cs.deptId, hasTheory: cs.hasTh, hasPractical: cs.hasPr, creditHours: cs.credits, isActive: true },
        create: { subjectCode: cs.code, subjectName: cs.name, deptId: cs.deptId, termId, hasTheory: cs.hasTh, hasPractical: cs.hasPr, creditHours: cs.credits, isActive: true },
      });
      subjectMap.set(`${cs.code}_${termId}`, subj.id);
    }

    const eeSubs = [
      { code: 'EE-CS', name: 'Control Systems', deptId: 5, hasTh: true, hasPr: true, credits: 4 },
      { code: 'EE-PE', name: 'Power Electronics', deptId: 5, hasTh: true, hasPr: true, credits: 4 },
      { code: 'EE-EM', name: 'Electrical Machines', deptId: 5, hasTh: true, hasPr: true, credits: 4 },
    ];
    for (const es of eeSubs) {
      const subj = await prisma.subject.upsert({
        where: { subjectCode_termId: { subjectCode: es.code, termId } },
        update: { subjectName: es.name, deptId: es.deptId, hasTheory: es.hasTh, hasPractical: es.hasPr, creditHours: es.credits, isActive: true },
        create: { subjectCode: es.code, subjectName: es.name, deptId: es.deptId, termId, hasTheory: es.hasTh, hasPractical: es.hasPr, creditHours: es.credits, isActive: true },
      });
      subjectMap.set(`${es.code}_${termId}`, subj.id);
    }
  }
  console.log(`✅ Master Subjects synced across CSE, Mechanical, Civil, EE`);

  // 10. Allocations Seeding
  // Clear existing allocations to rebuild clean synchronized state
  await prisma.approvalLog.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.studentStrength.deleteMany({});

  console.log('🧹 Cleared old allocations, batches, and strength records for clean sync');

  let allocationCount = 0;
  const pendingAllocations: number[] = [];

  for (const termId of [1, 2]) {
    // A) Seed CSE Allocations from scheduleData.json
    for (const cse of cseScheduleData) {
      const fId = cseFacultyMap.get(cse.facultyName.trim());
      if (!fId) continue;

      const courses = cse.courses || [];
      for (let idx = 0; idx < courses.length; idx++) {
        const c = courses[idx];
        const code = (c.code || `CS-${idx}`).trim().toUpperCase();
        let subId = subjectMap.get(`${code}_${termId}`) || subjectMap.get(`${c.title?.toLowerCase()}_${termId}`);
        if (!subId) {
          // create subject on the fly if needed
          const newSub = await prisma.subject.create({
            data: {
              subjectCode: code,
              subjectName: c.title || code,
              deptId: 1,
              termId,
              hasTheory: (c.theoryHrs || 0) > 0,
              hasPractical: (c.practicalHrs || 0) > 0,
              creditHours: (c.theoryHrs || 0) + (c.practicalHrs || 0) / 2 || 3,
            },
          });
          subId = newSub.id;
          subjectMap.set(`${code}_${termId}`, subId);
        }

        // Match Class
        const defaultClassId = classMap.get(`SE_1_${termId}`) || classMap.get(`FY_1_${termId}`);

        // Status: 90% approved, a few pending_approval for workflow demonstration
        const status = (allocationCount % 12 === 0) ? 'pending_approval' : (allocationCount % 15 === 0) ? 'draft' : 'approved';

        const thHrs = Number(c.theoryHrs || 0);
        const prHrs = Number(c.practicalHrs || 0);
        const totHrs = thHrs + prHrs;

        const alloc = await prisma.allocation.create({
          data: {
            facultyId: fId,
            subjectId: subId,
            classId: defaultClassId,
            termId,
            theoryHours: thHrs,
            practicalHours: prHrs,
            totalHours: totHrs,
            effectiveStartDate: new Date(),
            status,
          },
        });
        allocationCount++;

        if (status === 'pending_approval') {
          pendingAllocations.push(alloc.id);
        }
      }
    }

    // B) Seed Mechanical Allocations from mechTeachersList
    for (const mech of mechTeachersList) {
      const fId = mechFacultyMap.get(mech.name.trim());
      if (!fId) continue;

      for (let idx = 0; idx < mech.courses.length; idx++) {
        const c = mech.courses[idx];
        const cleanName = c.course.replace(/[*#]/g, '').trim();
        const code = `ME-${cleanName.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${idx}`;
        let subId = subjectMap.get(`${cleanName.toLowerCase()}_${termId}`);
        if (!subId) {
          const newSub = await prisma.subject.create({
            data: {
              subjectCode: code,
              subjectName: cleanName,
              deptId: 3,
              termId,
              hasTheory: c.th > 0,
              hasPractical: c.pr > 0,
              creditHours: c.th + c.pr / 2 || 3,
            },
          });
          subId = newSub.id;
          subjectMap.set(`${cleanName.toLowerCase()}_${termId}`, subId);
        }

        const classKey = c.class ? `${c.class}_3_${termId}` : `FE (R)_3_${termId}`;
        const clsId = classMap.get(classKey) || classMap.get(`FE (R)_3_${termId}`);

        const status = (allocationCount % 11 === 0) ? 'pending_approval' : 'approved';

        const alloc = await prisma.allocation.create({
          data: {
            facultyId: fId,
            subjectId: subId,
            classId: clsId,
            termId,
            theoryHours: c.th,
            practicalHours: c.pr,
            totalHours: c.total,
            effectiveStartDate: new Date(),
            status,
          },
        });
        allocationCount++;

        if (status === 'pending_approval') {
          pendingAllocations.push(alloc.id);
        }
      }
    }

    // C) Seed Civil and Electrical sample allocations
    for (const ofc of otherFaculty) {
      const fac = await prisma.faculty.findUnique({ where: { email: ofc.email } });
      if (!fac) continue;

      const subCode = ofc.deptId === 4 ? 'CE-SA' : 'EE-CS';
      const subId = subjectMap.get(`${subCode}_${termId}`);
      if (!subId) continue;

      const clsKey = ofc.deptId === 4 ? `SE (CE)_4_${termId}` : `SE (EE)_5_${termId}`;
      const clsId = classMap.get(clsKey);

      await prisma.allocation.create({
        data: {
          facultyId: fac.id,
          subjectId: subId,
          classId: clsId,
          termId,
          theoryHours: 4,
          practicalHours: 8,
          totalHours: 12,
          effectiveStartDate: new Date(),
          status: 'approved',
        },
      });
      allocationCount++;
    }
  }

  console.log(`✅ Seeded ${allocationCount} total allocations across all departments and terms!`);

  // 11. Batches & Student Strength
  for (const termId of [1, 2]) {
    const allSubjects = await prisma.subject.findMany({ where: { termId, hasPractical: true } });
    const allFaculty = await prisma.faculty.findMany({ where: { status: 'active' } });
    const allClasses = await prisma.classDivision.findMany({ where: { termId } });

    for (const sub of allSubjects.slice(0, 15)) {
      const cls = allClasses.find((c) => c.deptId === sub.deptId) || allClasses[0];
      const fac = allFaculty.find((f) => f.deptId === sub.deptId) || allFaculty[0];

      // Batches
      for (const bName of ['B1', 'B2', 'B3']) {
        await prisma.batch.create({
          data: {
            classId: cls.id,
            subjectId: sub.id,
            batchName: bName,
            batchSize: 20,
            facultyId: fac.id,
            termId,
          },
        });
      }

      // Student Strength
      await prisma.studentStrength.create({
        data: {
          classId: cls.id,
          subjectId: sub.id,
          studentCount: 60,
          termId,
          status: 'approved',
        },
      });
    }
  }
  console.log(`✅ Batches and Student Strengths synced`);

  // 12. Pending Approvals & Logs
  for (const allocId of pendingAllocations.slice(0, 5)) {
    const alloc = await prisma.allocation.findUnique({
      where: { id: allocId },
      include: { faculty: { include: { userAuth: true } } },
    });
    if (alloc && alloc.faculty.userAuth) {
      await prisma.approvalLog.create({
        data: {
          entityType: 'allocation',
          entityId: alloc.id,
          requestedBy: alloc.faculty.userAuth.id,
          fromStatus: 'draft',
          toStatus: 'pending_approval',
          changeType: 'New Allocation Request',
          allocationId: alloc.id,
          remarks: 'Workload assignment submitted for HOD approval',
        },
      });
    }
  }
  console.log(`✅ Real Approval Logs created for Approvals page`);

  // 13. Teaching Workload Reports (CSE & Mechanical)
  await prisma.workloadReportRow.deleteMany({});
  await prisma.workloadReport.deleteMany({});

  for (const termId of [1, 2]) {
    // CSE Report
    const cseReport = await prisma.workloadReport.create({
      data: {
        deptId: 1,
        termId,
        title: 'Teaching Workload — Computer Science and Engineering',
      },
    });

    const cseRows = cseSubjectsJson.map((s, idx) => ({
      reportId: cseReport.id,
      sortOrder: idx + 1,
      programClass: s.classLabel || 'Class',
      subjectName: `${s.code ? s.code + ': ' : ''}${s.title || ''}`,
      divisions: s.divisions || 1,
      theoryHrsPerWeek: s.thHrs || 0,
      totalTheoryHrs: (s.divisions || 1) * (s.thHrs || 0),
      batches: s.prBatches || 0,
      practicalHrsPerWeek: s.prHrs || 0,
      totalPracticalHrs: (s.prBatches || 0) * (s.prHrs || 0),
      tutorialHrsPerWeek: s.tutHrs || 0,
      totalTeachingHours: ((s.divisions || 1) * (s.thHrs || 0)) + ((s.prBatches || 0) * (s.prHrs || 0)) + (s.tutHrs || 0),
      creditsL: s.credL || 0,
      creditsP: s.credP || 0,
      creditsT: s.credT || 0,
      noteMarker: s.deptAndTeacher || null,
    }));

    await prisma.workloadReportRow.createMany({ data: cseRows });

    // Mechanical Report
    const mechReport = await prisma.workloadReport.create({
      data: {
        deptId: 3,
        termId,
        title: 'Teaching Workload — Mechanical Engineering',
      },
    });

    const mechRows = mechSubjectsJson.map((s, idx) => {
      const divs = s.divisions || 1;
      const thHrs = Number(s.thHrs || s.l) || 0;
      const batches = s.prBatches || (s.p > 0 ? 3 : 0);
      const prHrs = Number(s.prHrs || s.p) || 0;
      const tutHrs = Number(s.tutHrs) || 0;
      return {
        reportId: mechReport.id,
        sortOrder: idx + 1,
        programClass: s.classLabel || s.year || 'Class',
        subjectName: s.title || '',
        divisions: divs,
        theoryHrsPerWeek: thHrs,
        totalTheoryHrs: divs * thHrs,
        batches: batches,
        practicalHrsPerWeek: prHrs,
        totalPracticalHrs: batches * prHrs,
        tutorialHrsPerWeek: tutHrs,
        totalTeachingHours: (divs * thHrs) + (batches * prHrs) + tutHrs,
        creditsL: Number(s.credL || s.credits) || 0,
        creditsP: Number(s.credP) || 0,
        creditsT: Number(s.credT) || 0,
        noteMarker: s.deptAndTeacher || null,
      };
    });

    await prisma.workloadReportRow.createMany({ data: mechRows });
  }

  console.log(`✅ Workload Reports & Rows populated for CSE and Mechanical!`);
  console.log('🎉 Data Synchronization Finished Successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
