import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { dashboardService } from './service.js';

const router = Router();

router.use(authenticate);

// Super Admin Dashboard
router.get('/superadmin', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termId = parseInt(req.query.termId as string) || 1; // Default to 1 if not provided
    const data = await dashboardService.getSuperAdminDashboard(termId);
    res.json(data);
  } catch (err) { next(err); }
});

// HOD Dashboard
router.get('/hod', requireRole('dept_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termId = parseInt(req.query.termId as string) || 1;
    const deptId = req.user!.deptId;
    if (!deptId) return res.status(400).json({ error: { message: 'User does not belong to a department' } });
    
    const data = await dashboardService.getHodDashboard(deptId, termId);
    res.json(data);
  } catch (err) { next(err); }
});

// Faculty Dashboard
router.get('/faculty', requireRole('faculty'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termId = parseInt(req.query.termId as string) || 1;
    const facultyId = req.user!.facultyId;
    if (!facultyId) return res.status(400).json({ error: { message: 'User is not linked to a faculty profile' } });
    
    const data = await dashboardService.getFacultyDashboard(facultyId, termId);
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
