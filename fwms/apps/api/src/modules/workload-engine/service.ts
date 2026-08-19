import prisma from '../../lib/prisma.js';

class WorkloadEngineService {
  /**
   * Calculate theory, practical, tutorial and total hours for a single allocation.
   * Assumes subject has been loaded with multipliers.
   */
  calculateAllocationHours(subject: any, numBatches: number = 0) {
    let theoryHours = 0;
    let practicalHours = 0;
    let tutorialHours = 0;

    // If numBatches === 0, it's a Class-level allocation (Theory)
    if (subject.hasTheory && numBatches === 0) {
      theoryHours = Number(subject.creditHours) * Number(subject.theoryMultiplier);
    }

    // If numBatches > 0, it's a Batch-level allocation (Practical)
    if (subject.hasPractical && numBatches > 0) {
      practicalHours = Number(subject.creditHours) * Number(subject.practicalMultiplier) * numBatches;
    }

    if (subject.hasTutorial && numBatches > 0) {
      tutorialHours = Number(subject.tutorialHours || 0) * numBatches;
    } else if (subject.hasTutorial && numBatches === 0) {
       // Assuming tutorials might be at class level if no batch
       tutorialHours = Number(subject.tutorialHours || 0);
    }

    const totalHours = theoryHours + practicalHours + tutorialHours;

    return {
      theoryHours,
      practicalHours,
      totalHours,
    };
  }

  /**
   * Calculate the total weekly hours for a faculty member for a given term.
   * Only includes approved allocations that haven't passed their effective end date.
   */
  async calculateFacultyTotalHours(facultyId: number, termId: number) {
    const allocations = await prisma.allocation.findMany({
      where: {
        facultyId,
        termId,
        status: { in: ['approved', 'pending_approval', 'draft', 'escalated_to_super_admin'] },
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: new Date() } },
        ],
      },
    });

    const total = allocations.reduce((sum, alloc) => sum + Number(alloc.totalHours), 0);
    return total;
  }

  /**
   * Recalculate hours for all allocations that use a specific subject.
   * Called when subject multipliers are updated.
   */
  async recalculateForSubject(subjectId: number) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return;

    const allocations = await prisma.allocation.findMany({
      where: { subjectId },
    });

    for (const alloc of allocations) {
      // Note: This simplistic recalculation assumes 1 batch per allocation row.
      // If batchId is present, numBatches is 1. If classId is present without batchId, it's a theory allocation.
      const numBatches = alloc.batchId ? 1 : 0; 
      
      const { theoryHours, practicalHours, totalHours } = this.calculateAllocationHours(subject, numBatches);
      
      await prisma.allocation.update({
        where: { id: alloc.id },
        data: { theoryHours, practicalHours, totalHours },
      });
    }
  }
}

export const workloadEngineService = new WorkloadEngineService();
