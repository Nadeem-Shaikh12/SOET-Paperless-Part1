import prisma from '../../lib/prisma.js';
import { ApiError } from '../../middleware/error-handler.js';
import { ApprovalDecisionRequest } from '@fwms/shared';
import logger from '../../lib/logger.js';

class ApprovalsService {
  /**
   * Submit an entity (e.g. Allocation) for approval.
   */
  async submitForApproval(entityType: 'allocation' | 'student_strength', entityId: number, requestedBy: number) {
    return prisma.$transaction(async (tx) => {
      let currentStatus: string;
      let requiresSaOverride = false;
      let modelDelegate: any;

      if (entityType === 'allocation') {
        const alloc = await tx.allocation.findUnique({ where: { id: entityId } });
        if (!alloc) throw ApiError.notFound('Allocation not found');
        currentStatus = alloc.status;
        requiresSaOverride = alloc.requiresSaOverride;
        modelDelegate = tx.allocation;
      } else {
        const str = await tx.studentStrength.findUnique({ where: { id: entityId } });
        if (!str) throw ApiError.notFound('Student Strength not found');
        currentStatus = str.status;
        modelDelegate = tx.studentStrength;
      }

      if (currentStatus !== 'draft' && currentStatus !== 'returned_for_clarification') {
        throw ApiError.badRequest('Can only submit draft or returned items');
      }

      const toStatus = requiresSaOverride ? 'escalated_to_super_admin' : 'pending_approval';

      // Update entity
      await modelDelegate.update({
        where: { id: entityId },
        data: { status: toStatus },
      });

      // Log
      await tx.approvalLog.create({
        data: {
          entityType,
          entityId,
          requestedBy,
          fromStatus: currentStatus,
          toStatus,
          changeType: 'submitted',
          allocationId: entityType === 'allocation' ? entityId : null,
        },
      });

      return { status: toStatus };
    });
  }

  /**
   * Process a decision on a pending item.
   */
  async processDecision(
    entityType: 'allocation' | 'student_strength',
    entityId: number,
    reviewerId: number,
    reviewerRole: string,
    data: ApprovalDecisionRequest
  ) {
    return prisma.$transaction(async (tx) => {
      let currentStatus: string;
      let modelDelegate: any;
      let requiresSaOverride = false;

      if (entityType === 'allocation') {
        const alloc = await tx.allocation.findUnique({ where: { id: entityId } });
        if (!alloc) throw ApiError.notFound('Allocation not found');
        currentStatus = alloc.status;
        requiresSaOverride = alloc.requiresSaOverride;
        modelDelegate = tx.allocation;
      } else {
        const str = await tx.studentStrength.findUnique({ where: { id: entityId } });
        if (!str) throw ApiError.notFound('Student Strength not found');
        currentStatus = str.status;
        modelDelegate = tx.studentStrength;
      }

      if (currentStatus !== 'pending_approval' && currentStatus !== 'escalated_to_super_admin') {
        throw ApiError.badRequest(`Cannot process decision. Item is currently ${currentStatus}`);
      }

      // SA Override constraint: HODs cannot approve/reject an SLA-escalated or SA-override item
      if (currentStatus === 'escalated_to_super_admin' && reviewerRole !== 'super_admin') {
        throw ApiError.forbidden('Only Super Admin can process this item (escalated or override required)');
      }

      // Update entity
      await modelDelegate.update({
        where: { id: entityId },
        data: { status: data.decision },
      });

      // Log
      await tx.approvalLog.create({
        data: {
          entityType,
          entityId,
          requestedBy: reviewerId, // The reviewer is requesting the status change
          reviewedBy: reviewerId,
          fromStatus: currentStatus,
          toStatus: data.decision,
          changeType: `decision_${data.decision}`,
          remarks: data.remarks,
          allocationId: entityType === 'allocation' ? entityId : null,
        },
      });

      // Notification (Simplistic inline logic for MVP)
      // Realistically we'd look up the original requester to notify them.
      
      return { status: data.decision };
    });
  }

  /**
   * Retrieve pending approvals for HOD or SA.
   */
  async getPendingApprovals(role: string, deptId?: number) {
    const allocationsWhere: any = {
      status: role === 'super_admin' ? { in: ['pending_approval', 'escalated_to_super_admin'] } : 'pending_approval',
    };
    if (deptId && role === 'dept_admin') {
      allocationsWhere.faculty = { deptId };
    }

    const allocations = await prisma.allocation.findMany({
      where: allocationsWhere,
      include: {
        faculty: { select: { name: true } },
        subject: { select: { subjectCode: true, subjectName: true } },
      },
    });

    const strengthsWhere: any = {
      status: 'pending_approval',
    };
    if (deptId && role === 'dept_admin') {
      strengthsWhere.classDivision = { deptId };
    }

    const strengths = await prisma.studentStrength.findMany({
      where: strengthsWhere,
      include: {
        classDivision: { select: { className: true, division: true } },
        subject: { select: { subjectCode: true, subjectName: true } },
      },
    });

    return { allocations, strengths };
  }
}

export const approvalsService = new ApprovalsService();
