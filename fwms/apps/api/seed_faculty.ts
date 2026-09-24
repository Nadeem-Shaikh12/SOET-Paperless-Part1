import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.resolve(__dirname, '../web/src/data/scheduleData.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const faculties = JSON.parse(rawData);

  let dept = await prisma.department.findFirst({
    where: { deptName: { contains: 'Computer Science' } }
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        deptName: 'Computer Science and Engineering',
        deptCode: 'CSE',
      }
    });
  }

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  for (const f of faculties) {
    const email = f.facultyName.replace(/[^a-zA-Z]/g, '').toLowerCase() + '@mgmu.ac.in';
    let existing = await prisma.faculty.findUnique({ where: { email } });
    if (!existing) {
       console.log(`Creating ${f.facultyName}`);
       const created = await prisma.faculty.create({
         data: {
           name: f.facultyName,
           email,
           designation: 'Assistant_Professor',
           deptId: dept.id,
           employmentType: 'Permanent',
           userAuth: {
             create: {
               username: email,
               passwordHash: hashedPassword,
               role: 'faculty',
               status: 'active',
             }
           }
         }
       });
       console.log('Created: ', created.id);
    } else {
       console.log(`Already exists: ${f.facultyName}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
