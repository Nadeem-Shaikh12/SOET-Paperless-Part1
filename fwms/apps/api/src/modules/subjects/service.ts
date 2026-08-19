import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import { CreateSubjectRequest, UpdateSubjectRequest } from '@fwms/shared';

class SubjectService {
  async listSubjects(deptId?: number, termId?: number, activeOnly = false) {
    return prisma.subject.findMany({
      where: {
        ...(deptId && { deptId }),
        ...(termId && { termId }),
        ...(activeOnly && { isActive: true }),
      },
      include: {
        department: { select: { deptName: true } },
      },
      orderBy: { subjectCode: 'asc' },
    });
  }

  async getSubject(id: number) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { department: { select: { id: true, deptName: true } } },
    });
    if (!subject) throw ApiError.notFound('Subject not found');
    return subject;
  }

  async createSubject(data: CreateSubjectRequest) {
    // Check if subject code exists in this term
    const existing = await prisma.subject.findFirst({
      where: { subjectCode: data.subjectCode, termId: data.termId },
    });
    if (existing) throw ApiError.conflict('Subject code already exists for this term');

    return prisma.subject.create({
      data: {
        subjectCode: data.subjectCode,
        subjectName: data.subjectName,
        deptId: data.deptId,
        hasTheory: data.hasTheory ?? true,
        hasPractical: data.hasPractical ?? false,
        hasTutorial: data.hasTutorial ?? false,
        creditHours: data.creditHours,
        theoryMultiplier: data.theoryMultiplier ?? 1.0,
        practicalMultiplier: data.practicalMultiplier ?? 2.0,
        tutorialHours: data.tutorialHours,
        termId: data.termId,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateSubject(id: number, data: UpdateSubjectRequest) {
    await this.getSubject(id);
    return prisma.subject.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async deactivateSubject(id: number) {
    await this.getSubject(id);
    return prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const subjectService = new SubjectService();
