import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, requireDeptScope } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { facultyService } from './service.js';
import {
  createFacultySchema,
  updateFacultySchema,
  deactivateFacultySchema,
} from '@fwms/shared';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('super_admin', 'dept_admin'), requireDeptScope, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // HODs will automatically have this filtered by requireDeptScope if they provide deptId
    // If not, we should filter by their own deptId
    const deptId = req.user!.role === 'dept_admin' ? req.user!.deptId! : (req.query.deptId ? parseInt(req.query.deptId as string) : undefined);
    const faculty = await facultyService.listFaculty(deptId);
    res.json(faculty);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facultyId = parseInt(req.params.id);
    // Role check: F can only see self, HOD can see own dept, SA can see all
    if (req.user!.role === 'faculty' && req.user!.facultyId !== facultyId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another faculty member\'s data' } });
      return;
    }
    const faculty = await facultyService.getFaculty(facultyId);
    
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== faculty.deptId) {
       res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another department\'s faculty' } });
       return;
    }
    
    res.json(faculty);
  } catch (err) { next(err); }
});

router.post('/', requireRole('super_admin', 'dept_admin'), requireDeptScope, validateBody(createFacultySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // HOD can only create faculty in their own department
    if (req.user!.role === 'dept_admin' && req.body.deptId !== req.user!.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot create faculty in another department' } });
      return;
    }
    const faculty = await facultyService.createFaculty(req.body);
    res.status(201).json(faculty);
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('super_admin', 'dept_admin'), validateBody(updateFacultySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facultyId = parseInt(req.params.id);
    const faculty = await facultyService.getFaculty(facultyId);
    
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== faculty.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot update faculty in another department' } });
      return;
    }

    const updated = await facultyService.updateFaculty(facultyId, req.body);
    res.json(updated);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireRole('super_admin', 'dept_admin'), validateBody(deactivateFacultySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facultyId = parseInt(req.params.id);
    const faculty = await facultyService.getFaculty(facultyId);
    
    if (req.user!.role === 'dept_admin' && req.user!.deptId !== faculty.deptId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot update faculty in another department' } });
      return;
    }

    // Since this endpoint is used for both deactivating and activating depending on the body (which we simplify here)
    // Actually the schema is for deactivate. Let's assume this is strictly for deactivating.
    const deactivated = await facultyService.deactivateFaculty(facultyId, req.body.effectiveEndDate);
    res.json(deactivated);
  } catch (err) { next(err); }
});

export default router;
