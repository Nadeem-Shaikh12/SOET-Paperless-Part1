import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import { authService } from '../auth/service.js';
import { CreateFacultyRequest, UpdateFacultyRequest } from '@fwms/shared';
import logger from '../../lib/logger.js';

class FacultyService {
  async listFaculty(deptId?: number) {
    return prisma.faculty.findMany({
      where: deptId ? { deptId } : undefined,
      include: {
        department: { select: { id: true, deptName: true, hodId: true } },
        userAuth: { select: { role: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFaculty(id: number) {
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, deptName: true, hodId: true } },
        userAuth: { select: { role: true } },
        allocations: {
          where: { status: 'approved' },
          include: { subject: { select: { subjectCode: true, subjectName: true } } },
        },
      },
    });
    if (!faculty) throw ApiError.notFound('Faculty member not found');
    return faculty;
  }

  async createFaculty(data: CreateFacultyRequest) {
    // Check email uniqueness
    const existing = await prisma.faculty.findUnique({ where: { email: data.email } });
    if (existing) throw ApiError.conflict('A faculty member with this email already exists');

    // Use the provided initial password or generate a temporary one
    const password = data.initialPassword || this.generateTempPassword();
    const hashedPassword = await authService.hashPassword(password);

    // Create faculty + linked UserAuth in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.create({
        data: {
          name: data.name,
          email: data.email,
          designation: data.designation as any,
          deptId: data.deptId,
          employmentType: data.employmentType as any,
        },
      });

      await tx.userAuth.create({
        data: {
          username: data.email,
          passwordHash: hashedPassword,
          role: data.isHod ? 'dept_admin' : 'faculty',
          linkedId: faculty.id,
          mustChangePassword: !data.initialPassword, // If admin set a password, don't force change
        },
      });

      if (data.isHod) {
        // Demote previous HOD of this department
        const dept = await tx.department.findUnique({ where: { id: data.deptId } });
        if (dept && dept.hodId) {
          await tx.userAuth.updateMany({
            where: { linkedId: dept.hodId },
            data: { role: 'faculty' },
          });
        }

        // Set as HOD
        await tx.department.update({
          where: { id: data.deptId },
          data: { hodId: faculty.id },
        });
      }

      return faculty;
    });

    logger.info({ facultyId: result.id, email: data.email }, 'Faculty account created');

    return { ...result, tempPassword: data.initialPassword ? undefined : password };
  }

  async updateFaculty(id: number, data: UpdateFacultyRequest) {
    const existingFaculty = await this.getFaculty(id);
    
    return prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.designation !== undefined && { designation: data.designation as any }),
          ...(data.employmentType !== undefined && { employmentType: data.employmentType as any }),
        },
      });

      if (data.isHod !== undefined) {
        if (data.isHod) {
          // Demote previous HOD of this department
          const dept = await tx.department.findUnique({ where: { id: existingFaculty.deptId } });
          if (dept && dept.hodId && dept.hodId !== id) {
            await tx.userAuth.updateMany({
              where: { linkedId: dept.hodId },
              data: { role: 'faculty' },
            });
          }

          // Set as HOD
          await tx.department.update({
            where: { id: existingFaculty.deptId },
            data: { hodId: id },
          });

          // Promote this user's auth
          await tx.userAuth.updateMany({
            where: { linkedId: id },
            data: { role: 'dept_admin' },
          });
        } else {
          // Unchecking HOD status
          const dept = await tx.department.findUnique({ where: { id: existingFaculty.deptId } });
          if (dept && dept.hodId === id) {
            await tx.department.update({
              where: { id: existingFaculty.deptId },
              data: { hodId: null },
            });
          }

          // Demote this user's auth back to faculty
          await tx.userAuth.updateMany({
            where: { linkedId: id },
            data: { role: 'faculty' },
          });
        }
      }

      return faculty;
    });
  }

  async deactivateFaculty(id: number, effectiveEndDate: string) {
    await this.getFaculty(id);

    return prisma.$transaction(async (tx) => {
      // Update faculty status
      const faculty = await tx.faculty.update({
        where: { id },
        data: {
          status: 'inactive',
          effectiveEndDate: new Date(effectiveEndDate),
        },
      });

      // Disable login
      await tx.userAuth.updateMany({
        where: { linkedId: id },
        data: { status: 'inactive' },
      });

      return faculty;
    });
  }

  async activateFaculty(id: number) {
    return prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.update({
        where: { id },
        data: { status: 'active', effectiveEndDate: null },
      });

      await tx.userAuth.updateMany({
        where: { linkedId: id },
        data: { status: 'active' },
      });

      return faculty;
    });
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const facultyService = new FacultyService();
