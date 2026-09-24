import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.userAuth.findMany({ select: { username: true, status: true, linkedFaculty: { select: { status: true } } } });
  console.table(users);
}
main().finally(() => prisma.$disconnect());
