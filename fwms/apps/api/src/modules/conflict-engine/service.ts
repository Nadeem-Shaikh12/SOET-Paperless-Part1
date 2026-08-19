import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import { workloadEngineService } from '../workload-engine/service.js';

class ConflictEngineService {
  /**
   * Check for double booking.
   * Throws ApiError.conflict if there's a double booking.
   */
  async checkDoubleBooking(
    facultyId: number,
    subjectId: number,
    termId: number,
    classId?: number | null,
    batchId?: number | null,
    excludeAllocationId?: number
  ) {
    const existing = await prisma.allocation.findFirst({
      where: {
        subjectId,
        termId,
        ...(classId && { classId }),
        ...(batchId && { batchId }),
        status: { in: ['approved', 'pending_approval'] },
        ...(excludeAllocationId && { id: { not: excludeAllocationId } }),
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: new Date() } },
        ],
      },
      include: { faculty: true },
    });

    if (existing && existing.facultyId !== facultyId) {
      throw ApiError.conflict(
        `Double booking conflict: This class/batch is already assigned to ${existing.faculty.name}.`
      );
    }
  }

  /**
   * Check workload norms (overload/underload).
   * Returns { isOverloaded, isUnderloaded, currentTotal, projectedTotal, maxNorm, minNorm }
   */
  async checkWorkloadNorms(
    facultyId: number,
    termId: number,
    newAllocationTotalHours: number,
    excludeAllocationId?: number
  ) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
    });
    if (!faculty) throw ApiError.notFound('Faculty not found');

    const norms = await prisma.norms.findUnique({
      where: {
        designation_effectiveTermId: {
          designation: faculty.designation,
          effectiveTermId: termId,
        },
      },
    });

    if (!norms) {
      // If no norms defined for this designation/term, we can't check overload
      return { isOverloaded: false, isUnderloaded: false, currentTotal: 0, projectedTotal: newAllocationTotalHours, maxNorm: 0, minNorm: 0 };
    }

    // Get current total hours (excluding the allocation being updated, if any)
    let currentTotal = await workloadEngineService.calculateFacultyTotalHours(facultyId, termId);
    
    if (excludeAllocationId) {
       const alloc = await prisma.allocation.findUnique({ where: { id: excludeAllocationId }});
       if (alloc && alloc.status === 'approved') {
          currentTotal -= Number(alloc.totalHours);
       }
    }

    const projectedTotal = currentTotal + newAllocationTotalHours;

    const maxNorm = Number(norms.maxWeeklyHours);
    const minNorm = Number(norms.minWeeklyHours);

    const isOverloaded = projectedTotal > maxNorm;
    const isUnderloaded = projectedTotal < minNorm;

    return {
      isOverloaded,
      isUnderloaded,
      currentTotal,
      projectedTotal,
      maxNorm,
      minNorm,
    };
  }
}

export const conflictEngineService = new ConflictEngineService();
