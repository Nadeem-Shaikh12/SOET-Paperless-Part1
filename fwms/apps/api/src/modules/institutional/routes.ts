import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { institutionalService } from './service.js';
import {
  createSchoolSchema,
  updateSchoolSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createAcademicTermSchema,
  normsSchema,
} from '@fwms/shared';

const router = Router();

// All institutional routes require authentication
router.use(authenticate);

// ─── Schools (Super Admin only) ───

router.get('/schools', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schools = await institutionalService.listSchools();
    res.json(schools);
  } catch (err) { next(err); }
});

router.get('/schools/:id', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await institutionalService.getSchool(parseInt(req.params.id));
    res.json(school);
  } catch (err) { next(err); }
});

router.post('/schools', requireRole('super_admin'), validateBody(createSchoolSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await institutionalService.createSchool(req.body);
    res.status(201).json(school);
  } catch (err) { next(err); }
});

router.put('/schools/:id', requireRole('super_admin'), validateBody(updateSchoolSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await institutionalService.updateSchool(parseInt(req.params.id), req.body);
    res.json(school);
  } catch (err) { next(err); }
});

router.delete('/schools/:id', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await institutionalService.deactivateSchool(parseInt(req.params.id));
    res.json({ message: 'School deactivated' });
  } catch (err) { next(err); }
});

// ─── Departments ───

router.get('/departments', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
    const departments = await institutionalService.listDepartments(schoolId);
    res.json(departments);
  } catch (err) { next(err); }
});

router.get('/departments/:id', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await institutionalService.getDepartment(parseInt(req.params.id));
    res.json(department);
  } catch (err) { next(err); }
});

router.post('/departments', requireRole('super_admin'), validateBody(createDepartmentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await institutionalService.createDepartment(req.body);
    res.status(201).json(department);
  } catch (err) { next(err); }
});

router.put('/departments/:id', requireRole('super_admin'), validateBody(updateDepartmentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await institutionalService.updateDepartment(parseInt(req.params.id), req.body);
    res.json(department);
  } catch (err) { next(err); }
});

// ─── Academic Terms ───

router.get('/academic-terms', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const terms = await institutionalService.listAcademicTerms();
    res.json(terms);
  } catch (err) { next(err); }
});

router.get('/academic-terms/:id', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await institutionalService.getAcademicTerm(parseInt(req.params.id));
    res.json(term);
  } catch (err) { next(err); }
});

router.post('/academic-terms', requireRole('super_admin'), validateBody(createAcademicTermSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await institutionalService.createAcademicTerm(req.body);
    res.status(201).json(term);
  } catch (err) { next(err); }
});

// ─── Norms ───

router.get('/norms', requireRole('super_admin', 'dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termId = req.query.termId ? parseInt(req.query.termId as string) : undefined;
    const norms = await institutionalService.listNorms(termId);
    res.json(norms);
  } catch (err) { next(err); }
});

router.put('/norms', requireRole('super_admin'), validateBody(normsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const norm = await institutionalService.upsertNorms(req.body);
    res.json(norm);
  } catch (err) { next(err); }
});

// ─── Delete Routes ───
router.delete('/departments/:id', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await import('../../lib/prisma.js').then(m => m.default.department.delete({ where: { id: parseInt(req.params.id as string) } }));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/academic-terms/:id', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await import('../../lib/prisma.js').then(m => m.default.academicTerm.delete({ where: { id: parseInt(req.params.id) } }));
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/norms/:id', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await import('../../lib/prisma.js').then(m => m.default.norms.delete({ where: { id: parseInt(req.params.id) } }));
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
