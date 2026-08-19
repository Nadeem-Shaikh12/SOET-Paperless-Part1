import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, requireDeptScope } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { subjectService } from './service.js';
import { CreateSubjectRequest, UpdateSubjectRequest, createSubjectSchema, updateSubjectSchema } from '@fwms/shared';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : (req.query.deptId ? parseInt(req.query.deptId as string) : undefined);
    const termId = req.query.termId ? parseInt(req.query.termId as string) : undefined;
    const activeOnly = req.query.activeOnly === 'true';
    const subjects = await subjectService.listSubjects(deptId, termId, activeOnly);
    res.json(subjects);
  } catch (err) { next(err); }
});

router.get('/:id', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = parseInt(req.params.id);
    const subject = await subjectService.getSubject(subjectId);
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== subject.deptId) {
       res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another department\'s subject' } });
       return;
    }
    res.json(subject);
  } catch (err) { next(err); }
});

router.post('/', requireRole('super_admin', 'dept_admin'), requireDeptScope, validateBody(createSubjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role === 'dept_admin' && req.body.deptId !== req.user!.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot create subject in another department' } });
      return;
    }
    const subject = await subjectService.createSubject(req.body);
    res.status(201).json(subject);
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('super_admin', 'dept_admin'), validateBody(updateSubjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = parseInt(req.params.id);
    const subject = await subjectService.getSubject(subjectId);
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== subject.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot update subject in another department' } });
      return;
    }
    const updated = await subjectService.updateSubject(subjectId, req.body);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = parseInt(req.params.id);
    const subject = await subjectService.getSubject(subjectId);
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== subject.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot deactivate subject in another department' } });
      return;
    }
    await subjectService.deactivateSubject(subjectId);
    res.json({ message: 'Subject deactivated' });
  } catch (err) { next(err); }
});

export default router;
