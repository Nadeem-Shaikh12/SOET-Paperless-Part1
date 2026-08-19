import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import {
  CreateSchoolRequest,
  UpdateSchoolRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreateAcademicTermRequest,
  NormsRequest,
} from '@fwms/shared';

class InstitutionalService {
  // ─── Schools ───

  async listSchools() {
    return prisma.school.findMany({
      include: { _count: { select: { departments: true } } },
      orderBy: { schoolName: 'asc' },
    });
  }

  async getSchool(id: number) {
    const school = await prisma.school.findUnique({
      where: { id },
      include: { departments: { include: { hod: { select: { id: true, name: true } } } } },
    });
    if (!school) throw ApiError.notFound('School not found');
    return school;
  }

  async createSchool(data: CreateSchoolRequest) {
    return prisma.school.create({ data: { schoolName: data.schoolName, deanName: data.deanName } });
  }

  async updateSchool(id: number, data: UpdateSchoolRequest) {
    await this.getSchool(id);
    return prisma.school.update({ where: { id }, data: { schoolName: data.schoolName, deanName: data.deanName } });
  }

  async deactivateSchool(id: number) {
    await this.getSchool(id);
    return prisma.school.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Departments ───

  async listDepartments(schoolId?: number) {
    return prisma.department.findMany({
      where: schoolId ? { schoolId } : undefined,
      include: {
        school: { select: { id: true, schoolName: true } },
        hod: { select: { id: true, name: true, email: true } },
        _count: { select: { faculty: true, subjects: true } },
      },
      orderBy: { deptName: 'asc' },
    });
  }

  async getDepartment(id: number) {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        school: true,
        hod: { select: { id: true, name: true, email: true, designation: true } },
      },
    });
    if (!dept) throw ApiError.notFound('Department not found');
    return dept;
  }

  async createDepartment(data: CreateDepartmentRequest) {
    // Validate school exists
    const school = await prisma.school.findUnique({ where: { id: data.schoolId } });
    if (!school) throw ApiError.badRequest('School not found');

    return prisma.department.create({
      data: {
        deptName: data.deptName,
        schoolId: data.schoolId,
        hodId: data.hodId ?? null,
        defaultBatchSize: data.defaultBatchSize ?? 30,
      },
    });
  }

  async updateDepartment(id: number, data: UpdateDepartmentRequest) {
    await this.getDepartment(id);

    // If assigning HOD, update the faculty's user role to dept_admin
    if (data.hodId) {
      const faculty = await prisma.faculty.findUnique({ where: { id: data.hodId } });
      if (!faculty) throw ApiError.badRequest('Faculty member not found');

      // Update their UserAuth role to dept_admin
      await prisma.userAuth.updateMany({
        where: { linkedId: data.hodId },
        data: { role: 'dept_admin' },
      });
    }

    return prisma.department.update({
      where: { id },
      data: {
        ...(data.deptName !== undefined && { deptName: data.deptName }),
        ...(data.hodId !== undefined && { hodId: data.hodId }),
        ...(data.defaultBatchSize !== undefined && { defaultBatchSize: data.defaultBatchSize }),
      },
    });
  }

  // ─── Academic Terms ───

  async listAcademicTerms() {
    return prisma.academicTerm.findMany({
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }

  async getAcademicTerm(id: number) {
    const term = await prisma.academicTerm.findUnique({ where: { id } });
    if (!term) throw ApiError.notFound('Academic term not found');
    return term;
  }

  async createAcademicTerm(data: CreateAcademicTermRequest) {
    return prisma.academicTerm.create({
      data: {
        academicYear: data.academicYear,
        semester: data.semester,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'active',
      },
    });
  }

  async getActiveTerm() {
    return prisma.academicTerm.findFirst({ where: { status: 'active' } });
  }

  // ─── Norms ───

  async listNorms(termId?: number) {
    return prisma.norms.findMany({
      where: termId ? { effectiveTermId: termId } : undefined,
      include: { effectiveTerm: { select: { id: true, academicYear: true, semester: true } } },
      orderBy: { designation: 'asc' },
    });
  }

  async upsertNorms(data: NormsRequest) {
    return prisma.norms.upsert({
      where: {
        designation_effectiveTermId: {
          designation: data.designation as any,
          effectiveTermId: data.effectiveTermId,
        },
      },
      create: {
        designation: data.designation as any,
        minWeeklyHours: data.minWeeklyHours,
        maxWeeklyHours: data.maxWeeklyHours,
        defaultTheoryMultiplier: data.defaultTheoryMultiplier,
        defaultPracticalMultiplier: data.defaultPracticalMultiplier,
        slaDaysForHodReview: data.slaDaysForHodReview,
        effectiveTermId: data.effectiveTermId,
      },
      update: {
        minWeeklyHours: data.minWeeklyHours,
        maxWeeklyHours: data.maxWeeklyHours,
        defaultTheoryMultiplier: data.defaultTheoryMultiplier,
        defaultPracticalMultiplier: data.defaultPracticalMultiplier,
        slaDaysForHodReview: data.slaDaysForHodReview,
      },
    });
  }

  async getNormsForDesignation(designation: string, termId: number) {
    return prisma.norms.findUnique({
      where: {
        designation_effectiveTermId: {
          designation: designation as any,
          effectiveTermId: termId,
        },
      },
    });
  }
}

export const institutionalService = new InstitutionalService();
