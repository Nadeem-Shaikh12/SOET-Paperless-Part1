import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

/**
 * Runs daily at midnight.
 * Finds all pending approvals that have exceeded their department's SLA norms.
 * Escalates them to Super Admin.
 */
export function initSlaEscalationJob() {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running SLA Escalation Job...');

    try {
      // 1. Get all pending allocations
      const pendingAllocations = await prisma.allocation.findMany({
        where: { status: 'pending_approval' },
        include: {
          faculty: { select: { designation: true } },
          approvalLogs: {
            where: { toStatus: 'pending_approval' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      let escalatedCount = 0;

      for (const alloc of pendingAllocations) {
        if (alloc.approvalLogs.length === 0) continue;
        
        const submittedDate = alloc.approvalLogs[0].createdAt;
        
        // Find norm for SLA days
        const norm = await prisma.norms.findUnique({
          where: {
            designation_effectiveTermId: {
              designation: alloc.faculty.designation,
              effectiveTermId: alloc.termId,
            },
          },
        });

        const slaDays = norm ? norm.slaDaysForHodReview : 3; // default 3 days
        
        // Check if exceeded
        const cutoffDate = new Date(submittedDate);
        cutoffDate.setDate(cutoffDate.getDate() + slaDays);

        if (new Date() > cutoffDate) {
          // Escalate
          await prisma.$transaction(async (tx) => {
            await tx.allocation.update({
              where: { id: alloc.id },
              data: { status: 'escalated_to_super_admin' },
            });

            await tx.approvalLog.create({
              data: {
                entityType: 'allocation',
                entityId: alloc.id,
                requestedBy: 1, // Assume SA or System has ID 1 for now, or make requestedBy nullable/system
                fromStatus: 'pending_approval',
                toStatus: 'escalated_to_super_admin',
                changeType: 'sla_escalation',
                allocationId: alloc.id,
                slaEscalated: true,
                remarks: `System: Auto-escalated after exceeding ${slaDays} days SLA.`,
              },
            });
          });
          escalatedCount++;
        }
      }

      logger.info(`SLA Escalation Job completed. Escalated ${escalatedCount} allocations.`);
    } catch (err) {
      logger.error({ err }, 'Error in SLA Escalation Job');
    }
  });
}
