import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { approvalsService } from './service.js';
import { approvalDecisionBaseSchema } from '@fwms/shared';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

// List pending approvals for HOD or SA
router.get('/pending', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : undefined;
    const approvals = await approvalsService.getPendingApprovals(req.user!.role, deptId);
    res.json(approvals);
  } catch (err) { next(err); }
});

// Submit an item for approval
router.post('/submit', requireRole('faculty', 'dept_admin'), validateBody(z.object({
  entityType: z.enum(['allocation', 'student_strength']),
  entityId: z.number().int().positive(),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { default: prisma } = await import('../../lib/prisma.js');
    if (req.body.entityType === 'allocation') {
      const alloc = await prisma.allocation.findUnique({ where: { id: req.body.entityId }, include: { faculty: true }});
      if (!alloc) return next(new Error('Allocation not found'));
      if (req.user!.role === 'dept_admin' && alloc.faculty.deptId !== req.user!.deptId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot submit allocation for another department' } });
        return;
      }
      if (req.user!.role === 'faculty' && alloc.facultyId !== req.user!.facultyId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot submit allocation for another faculty' } });
        return;
      }
    } else {
      const str = await prisma.studentStrength.findUnique({ where: { id: req.body.entityId }, include: { classDivision: true }});
      if (!str) return next(new Error('Student Strength not found'));
      if (req.user!.role === 'dept_admin' && str.classDivision.deptId !== req.user!.deptId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot submit student strength for another department' } });
        return;
      }
      if (req.user!.role === 'faculty') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Faculty cannot submit student strength' } });
        return;
      }
    }

    const result = await approvalsService.submitForApproval(req.body.entityType, req.body.entityId, req.user!.userId);
    res.json(result);
  } catch (err) { next(err); }
});

// Process a decision
router.post('/decide', requireRole('super_admin', 'dept_admin'), validateBody(z.object({
  entityType: z.enum(['allocation', 'student_strength']),
  entityId: z.number().int().positive(),
  decision: approvalDecisionBaseSchema.shape.decision,
  remarks: approvalDecisionBaseSchema.shape.remarks,
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role === 'dept_admin') {
      const { default: prisma } = await import('../../lib/prisma.js');
      if (req.body.entityType === 'allocation') {
        const alloc = await prisma.allocation.findUnique({ where: { id: req.body.entityId }, include: { faculty: true }});
        if (!alloc || alloc.faculty.deptId !== req.user!.deptId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot decide on allocation for another department' } });
          return;
        }
      } else {
        const str = await prisma.studentStrength.findUnique({ where: { id: req.body.entityId }, include: { classDivision: true }});
        if (!str || str.classDivision.deptId !== req.user!.deptId) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot decide on student strength for another department' } });
          return;
        }
      }
    }
    
    const result = await approvalsService.processDecision(
      req.body.entityType,
      req.body.entityId,
      req.user!.userId,
      req.user!.role,
      { decision: req.body.decision, remarks: req.body.remarks }
    );
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
