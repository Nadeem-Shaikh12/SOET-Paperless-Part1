import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.userAuth.update({ where: { username: 'hod.cse@mgm.edu' }, data: { status: 'active' } });
  await prisma.faculty.update({ where: { email: 'hod.cse@mgm.edu' }, data: { status: 'active' } });
  console.log('Reactivated hod.cse@mgm.edu');
}
main().finally(() => prisma.$disconnect());
