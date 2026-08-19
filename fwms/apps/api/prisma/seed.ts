import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Super Admin
  const hashedSaPassword = await bcrypt.hash('Admin@123', 12);
  const sa = await prisma.userAuth.upsert({
    where: { username: 'admin@mgm.edu' },
    update: {},
    create: {
      username: 'admin@mgm.edu',
      passwordHash: hashedSaPassword,
      role: 'super_admin',
      mustChangePassword: true,
    },
  });
  console.log(`✅ Super Admin created (admin@mgm.edu / Admin@123)`);

  // 2. Create School
  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: {},
    create: {
      schoolName: 'School of Engineering and Technology',
      deanName: 'Dr. A. B. Smith',
    },
  });
  console.log(`✅ School created: ${school.schoolName}`);

  // 3. Create Departments
  const deptCSE = await prisma.department.upsert({
    where: { id: 1 },
    update: {},
    create: {
      deptName: 'Computer Science and Engineering',
      schoolId: school.id,
      defaultBatchSize: 20,
    },
  });
  
  const deptIT = await prisma.department.upsert({
    where: { id: 2 },
    update: {},
    create: {
      deptName: 'Information Technology',
      schoolId: school.id,
      defaultBatchSize: 20,
    },
  });
  console.log(`✅ Departments created (CSE, IT)`);

  // 4. Create Academic Term
  const term = await prisma.academicTerm.upsert({
    where: { id: 1 },
    update: {},
    create: {
      academicYear: '2024-25',
      semester: 'Odd',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-15'),
      status: 'active',
    },
  });
  console.log(`✅ Academic Term created: ${term.academicYear} ${term.semester}`);

  // 5. Create Default Norms
  const norms = [
    { desig: 'Professor', min: 8, max: 14, tm: 1.0, pm: 2.0 },
    { desig: 'Associate_Professor', min: 10, max: 16, tm: 1.0, pm: 2.0 },
    { desig: 'Assistant_Professor', min: 12, max: 18, tm: 1.0, pm: 2.0 },
  ];

  for (const n of norms) {
    await prisma.norms.upsert({
      where: {
        designation_effectiveTermId: {
          designation: n.desig as any,
          effectiveTermId: term.id,
        },
      },
      update: {},
      create: {
        designation: n.desig as any,
        minWeeklyHours: n.min,
        maxWeeklyHours: n.max,
        defaultTheoryMultiplier: n.tm,
        defaultPracticalMultiplier: n.pm,
        slaDaysForHodReview: 3,
        effectiveTermId: term.id,
      },
    });
  }
  console.log(`✅ Standard UGC Norms configured`);

  // 6. Create Dummy Faculty for Testing
  const hodHashedPassword = await bcrypt.hash('Hod@123', 12);
  const facultyHashedPassword = await bcrypt.hash('Faculty@123', 12);

  // HOD CSE
  const hodFaculty = await prisma.faculty.upsert({
    where: { email: 'hod.cse@mgm.edu' },
    update: {},
    create: {
      name: 'Dr. Jane Doe',
      email: 'hod.cse@mgm.edu',
      designation: 'Professor',
      deptId: deptCSE.id,
      employmentType: 'Permanent',
    },
  });

  await prisma.userAuth.upsert({
    where: { username: 'hod.cse@mgm.edu' },
    update: {},
    create: {
      username: 'hod.cse@mgm.edu',
      passwordHash: hodHashedPassword,
      role: 'dept_admin',
      linkedId: hodFaculty.id,
      mustChangePassword: true,
    },
  });

  // Assign HOD to department
  await prisma.department.update({
    where: { id: deptCSE.id },
    data: { hodId: hodFaculty.id },
  });

  // Asst Prof CSE
  const asstProf = await prisma.faculty.upsert({
    where: { email: 'john.smith@mgm.edu' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'john.smith@mgm.edu',
      designation: 'Assistant_Professor',
      deptId: deptCSE.id,
      employmentType: 'Permanent',
    },
  });

  await prisma.userAuth.upsert({
    where: { username: 'john.smith@mgm.edu' },
    update: {},
    create: {
      username: 'john.smith@mgm.edu',
      passwordHash: facultyHashedPassword,
      role: 'faculty',
      linkedId: asstProf.id,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Test Faculty created:
      HOD CSE: hod.cse@mgm.edu / Hod@123
      Asst Prof: john.smith@mgm.edu / Faculty@123`);

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
