import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { allocationsService } from './service.js';
import { createAllocationSchema, updateAllocationSchema } from '@fwms/shared';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termId = req.query.termId ? parseInt(req.query.termId as string) : undefined;
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : (req.query.deptId ? parseInt(req.query.deptId as string) : undefined);
    const facultyId = req.user!.role === 'faculty' ? req.user!.facultyId! : (req.query.facultyId ? parseInt(req.query.facultyId as string) : undefined);
    
    const allocations = await allocationsService.listAllocations(termId, deptId, facultyId);
    res.json(allocations);
  } catch (err) { next(err); }
});

router.get('/:id', requireRole('super_admin', 'dept_admin', 'faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const allocation = await allocationsService.getAllocation(id);
    
    if (req.user!.role === 'faculty' && req.user!.facultyId !== allocation.facultyId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another faculty\'s allocation' } });
      return;
    }
    
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== allocation.faculty.deptId) {
       res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another department\'s allocation' } });
       return;
    }
    
    res.json(allocation);
  } catch (err) { next(err); }
});

router.post('/', requireRole('dept_admin', 'super_admin'), validateBody(createAllocationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allocation = await allocationsService.createAllocation(req.body, req.user!.userId);
    res.status(201).json(allocation);
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('dept_admin', 'super_admin'), validateBody(updateAllocationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allocation = await allocationsService.updateAllocation(parseInt(req.params.id), req.body, req.user!.userId);
    res.json(allocation);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('dept_admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await allocationsService.deleteAllocation(parseInt(req.params.id), req.user!.userId);
    res.json({ message: 'Allocation deleted' });
  } catch (err) { next(err); }
});

export default router;
