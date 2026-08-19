import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import {
  CreateClassDivisionRequest,
  UpdateClassDivisionRequest,
  CreateBatchRequest,
  UpdateBatchRequest,
  CreateStudentStrengthRequest,
} from '@fwms/shared';

class ClassesBatchesService {
  // ─── Class / Division ───

  async listClasses(deptId?: number, termId?: number) {
    return prisma.classDivision.findMany({
      where: {
        ...(deptId && { deptId }),
        ...(termId && { termId }),
      },
      include: {
        department: { select: { deptName: true } },
        term: { select: { academicYear: true, semester: true } },
      },
      orderBy: [{ className: 'asc' }, { division: 'asc' }],
    });
  }

  async getClass(id: number) {
    const cls = await prisma.classDivision.findUnique({
      where: { id },
      include: {
        batches: { include: { faculty: { select: { name: true } }, subject: { select: { subjectName: true } } } },
        strengths: { include: { subject: { select: { subjectName: true } } } },
      },
    });
    if (!cls) throw ApiError.notFound('Class/Division not found');
    return cls;
  }

  async createClass(data: CreateClassDivisionRequest) {
    const existing = await prisma.classDivision.findUnique({
      where: {
        className_division_deptId_termId: {
          className: data.className,
          division: data.division,
          deptId: data.deptId,
          termId: data.termId,
        },
      },
    });
    if (existing) throw ApiError.conflict('This class and division already exists for this department and term');

    return prisma.classDivision.create({ data });
  }

  async updateClass(id: number, data: UpdateClassDivisionRequest) {
    await this.getClass(id);
    return prisma.classDivision.update({ where: { id }, data });
  }

  // ─── Batches ───

  async listBatches(classId: number) {
    return prisma.batch.findMany({
      where: { classId },
      include: {
        faculty: { select: { id: true, name: true } },
        subject: { select: { id: true, subjectName: true } },
      },
    });
  }

  async listAllBatches(deptId?: number, termId?: number) {
    return prisma.batch.findMany({
      where: {
        ...(termId && { termId }),
        ...(deptId && { classDivision: { deptId } }),
      },
      include: {
        faculty: { select: { id: true, name: true } },
        subject: { select: { id: true, subjectName: true } },
      },
    });
  }

  async createBatch(classId: number, data: Omit<CreateBatchRequest, 'classId'>) {
    // Validate class
    const cls = await prisma.classDivision.findUnique({ where: { id: classId }, include: { department: true } });
    if (!cls) throw ApiError.notFound('Class not found');

    // Check default batch size compliance (flag/warn, but don't block per PRD FR-CLS-03)
    const isOversized = data.batchSize > cls.department.defaultBatchSize;

    const batch = await prisma.batch.create({
      data: {
        classId,
        subjectId: data.subjectId,
        batchName: data.batchName,
        batchSize: data.batchSize,
        facultyId: data.facultyId,
        termId: data.termId,
      },
    });

    return { batch, isOversized };
  }

  // ─── Student Strength ───

  async listStudentStrengths(deptId?: number, termId?: number, facultyId?: number) {
    // For faculty view, we would filter by classes they are allocated to
    // But keeping it simple: just return all and let the client or routes filter
    return prisma.studentStrength.findMany({
      where: {
        ...(termId && { termId }),
        ...(deptId && { classDivision: { deptId } }),
      },
      include: {
        classDivision: { select: { className: true, division: true } },
        subject: { select: { subjectName: true, subjectCode: true } },
      },
    });
  }

  async submitStudentStrengthUpdate(data: CreateStudentStrengthRequest, userId: number) {
    return prisma.$transaction(async (tx) => {
      // Upsert the student strength record with status pending_approval
      const strength = await tx.studentStrength.upsert({
        where: {
          classId_subjectId_termId: {
            classId: data.classId,
            subjectId: data.subjectId,
            termId: data.termId,
          },
        },
        create: {
          classId: data.classId,
          subjectId: data.subjectId,
          termId: data.termId,
          studentCount: data.studentCount, // Ideally we store proposed count separately, but simplifying for MVP
          status: 'pending_approval',
          updatedBy: userId,
        },
        update: {
          studentCount: data.studentCount,
          status: 'pending_approval',
          updatedBy: userId,
        },
      });

      // Create an approval log entry
      await tx.approvalLog.create({
        data: {
          entityType: 'student_strength',
          entityId: strength.id,
          requestedBy: userId,
          fromStatus: 'draft',
          toStatus: 'pending_approval',
          changeType: 'student_count_update',
        },
      });

      return strength;
    });
  }
}

export const classesBatchesService = new ClassesBatchesService();
