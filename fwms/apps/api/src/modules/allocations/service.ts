import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import { CreateAllocationRequest, UpdateAllocationRequest } from '@fwms/shared';
import { conflictEngineService } from '../conflict-engine/service.js';
import { workloadEngineService } from '../workload-engine/service.js';

class AllocationsService {
  async listAllocations(termId?: number, deptId?: number, facultyId?: number) {
    return prisma.allocation.findMany({
      where: {
        ...(termId && { termId }),
        ...(facultyId && { facultyId }),
        ...(deptId && { faculty: { deptId } }),
      },
      include: {
        faculty: { select: { name: true, designation: true } },
        subject: { select: { subjectCode: true, subjectName: true } },
        classDivision: { select: { className: true, division: true } },
        batch: { select: { batchName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllocation(id: number) {
    const allocation = await prisma.allocation.findUnique({
      where: { id },
      include: {
        faculty: true,
        subject: true,
        classDivision: true,
        batch: true,
        approvalLogs: true,
      },
    });
    if (!allocation) throw ApiError.notFound('Allocation not found');
    return allocation;
  }

  async createAllocation(data: CreateAllocationRequest, requestedBy: number) {
    // 1. Validate subject exists
    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject) throw ApiError.badRequest('Subject not found');

    // 2. Check for Double Booking (Hard constraint)
    await conflictEngineService.checkDoubleBooking(
      data.facultyId,
      data.subjectId,
      data.termId,
      data.classId,
      data.batchId
    );

    // 3. Calculate Hours
    const numBatches = data.batchId ? 1 : 0;
    const { theoryHours, practicalHours, totalHours } = workloadEngineService.calculateAllocationHours(subject, numBatches);

    // 4. Check Workload Norms (Overload/Underload)
    const { isOverloaded, projectedTotal, maxNorm } = await conflictEngineService.checkWorkloadNorms(
      data.facultyId,
      data.termId,
      totalHours
    );

    // If it requires SA override, mark it. HOD can still submit, but it flags it for SA.
    const requiresSaOverride = isOverloaded;

    // 5. Save Allocation
    return prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.create({
        data: {
          facultyId: data.facultyId,
          subjectId: data.subjectId,
          classId: data.classId,
          batchId: data.batchId,
          termId: data.termId,
          theoryHours,
          practicalHours,
          totalHours,
          effectiveStartDate: new Date(data.effectiveStartDate),
          effectiveEndDate: data.effectiveEndDate ? new Date(data.effectiveEndDate) : null,
          status: 'draft',
          requiresSaOverride,
        },
      });

      // 6. Create Audit Log
      await tx.approvalLog.create({
        data: {
          entityType: 'allocation',
          entityId: allocation.id,
          requestedBy,
          fromStatus: 'none',
          toStatus: 'draft',
          changeType: 'created',
          allocationId: allocation.id,
          remarks: isOverloaded ? `Projected hours (${projectedTotal}) exceeds norm (${maxNorm}). Requires Super Admin override.` : undefined,
        },
      });

      return allocation;
    });
  }

  async updateAllocation(id: number, data: UpdateAllocationRequest, requestedBy: number) {
    const existing = await this.getAllocation(id);

    // Only allow updating drafts or returned allocations easily
    // If it's approved, an update might actually mean creating a new version or returning it to draft
    // For MVP, allow updating draft/returned.
    if (existing.status === 'pending_approval') {
      throw ApiError.badRequest('Cannot update an allocation that is pending approval');
    }

    const subjectId = data.subjectId ?? existing.subjectId;
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw ApiError.badRequest('Subject not found');

    const facultyId = data.facultyId ?? existing.facultyId;
    const termId = data.termId ?? existing.termId;
    const classId = data.classId !== undefined ? data.classId : existing.classId;
    const batchId = data.batchId !== undefined ? data.batchId : existing.batchId;

    // Double booking check
    await conflictEngineService.checkDoubleBooking(
      facultyId,
      subjectId,
      termId,
      classId,
      batchId,
      id
    );

    // Calc Hours
    const numBatches = batchId ? 1 : 0;
    const { theoryHours, practicalHours, totalHours } = workloadEngineService.calculateAllocationHours(subject, numBatches);

    // Norms check
    const { isOverloaded, projectedTotal, maxNorm } = await conflictEngineService.checkWorkloadNorms(
      facultyId,
      termId,
      totalHours,
      id
    );

    return prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.update({
        where: { id },
        data: {
          facultyId,
          subjectId,
          classId,
          batchId,
          termId,
          theoryHours,
          practicalHours,
          totalHours,
          ...(data.effectiveStartDate && { effectiveStartDate: new Date(data.effectiveStartDate) }),
          ...(data.effectiveEndDate !== undefined && { effectiveEndDate: data.effectiveEndDate ? new Date(data.effectiveEndDate) : null }),
          requiresSaOverride: isOverloaded,
        },
      });

      await tx.approvalLog.create({
        data: {
          entityType: 'allocation',
          entityId: allocation.id,
          requestedBy,
          fromStatus: existing.status,
          toStatus: existing.status,
          changeType: 'updated',
          allocationId: allocation.id,
          remarks: isOverloaded ? `Projected hours (${projectedTotal}) exceeds norm (${maxNorm}). Requires Super Admin override.` : undefined,
        },
      });

      return allocation;
    });
  }

  async deleteAllocation(id: number, requestedBy: number) {
    const existing = await this.getAllocation(id);
    if (existing.status !== 'draft') {
      throw ApiError.badRequest('Can only delete draft allocations. Approved allocations must be ended with an effective end date.');
    }

    return prisma.$transaction(async (tx) => {
      await tx.approvalLog.deleteMany({ where: { allocationId: id } });
      await tx.allocation.delete({ where: { id } });
    });
  }
}

export const allocationsService = new AllocationsService();
