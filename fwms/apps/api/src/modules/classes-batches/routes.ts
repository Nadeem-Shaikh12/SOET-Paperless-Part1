import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma.js';
import { authenticate, requireRole, requireDeptScope } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { classesBatchesService } from './service.js';
import {
  createClassDivisionSchema,
  updateClassDivisionSchema,
  createBatchSchema,
  createStudentStrengthSchema,
} from '@fwms/shared';

const router = Router();

router.use(authenticate);

// ─── Classes ───

router.get('/classes', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : (req.query.deptId ? parseInt(req.query.deptId as string) : undefined);
    const termId = req.query.termId ? parseInt(req.query.termId as string) : undefined;
    const classes = await classesBatchesService.listClasses(deptId, termId);
    res.json(classes);
  } catch (err) { next(err); }
});

router.post('/classes', requireRole('super_admin', 'dept_admin'), requireDeptScope, validateBody(createClassDivisionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role === 'dept_admin' && req.body.deptId !== req.user!.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot create class in another department' } });
      return;
    }
    const cls = await classesBatchesService.createClass(req.body);
    res.status(201).json(cls);
  } catch (err) { next(err); }
});

// ─── Batches ───

router.get('/classes/batches', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : (req.query.deptId ? parseInt(req.query.deptId as string) : undefined);
    const termId = req.query.termId ? parseInt(req.query.termId as string) : undefined;
    const batches = await classesBatchesService.listAllBatches(deptId, termId);
    res.json(batches);
  } catch (err) { next(err); }
});

router.get('/classes/:id/batches', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await classesBatchesService.listBatches(parseInt(req.params.id));
    res.json(batches);
  } catch (err) { next(err); }
});

router.post('/classes/:id/batches', requireRole('super_admin', 'dept_admin'), validateBody(createBatchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = parseInt(req.params.id);
    // Ideally we should check deptScope here, ensuring the class belongs to req.user!.deptId
    const { batch, isOversized } = await classesBatchesService.createBatch(classId, req.body);
    res.status(201).json({ batch, isOversized });
  } catch (err) { next(err); }
});

// ─── Student Strength ───

router.get('/student-strength', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : (req.query.deptId ? parseInt(req.query.deptId as string) : undefined);
    const termId = req.query.termId ? parseInt(req.query.termId as string) : undefined;
    const strengths = await classesBatchesService.listStudentStrengths(deptId, termId);
    res.json(strengths);
  } catch (err) { next(err); }
});

router.post('/student-strength', requireRole('super_admin', 'dept_admin', 'faculty'), validateBody(createStudentStrengthSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Faculty submitting their updated count for approval
    const strength = await classesBatchesService.submitStudentStrengthUpdate(req.body, req.user!.userId);
    res.status(201).json(strength);
  } catch (err) { next(err); }
});

// ─── Delete Routes ───
router.delete('/classes/:id', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.classDivision.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/classes/batches/:id', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.batch.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/student-strength/:id', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.studentStrength.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
