import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Resolve the absolute path to scheduleData.json regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DATA_FILE  = path.resolve(__dirname, '../../../../web/src/data/scheduleData.json');

// ─── GET /api/v1/schedule-data ───────────────────────────────────────────────
// Returns the full schedule array from disk.
// Auth: any authenticated user (faculty, HOD, super_admin)
router.get(
  '/',
  authenticate,
  (req: Request, res: Response): void => {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'scheduleData.json not found on server' } });
        return;
      }
      const raw  = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      res.json({ data });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'READ_ERROR', message: err.message } });
    }
  }
);

// ─── PUT /api/v1/schedule-data ───────────────────────────────────────────────
// Replaces the entire scheduleData.json with the supplied array.
// Auth: super_admin or dept_admin only
router.put(
  '/',
  authenticate,
  requireRole('super_admin', 'dept_admin'),
  (req: Request, res: Response): void => {
    try {
      const body = req.body;

      // Basic validation — must be a non-empty array
      if (!Array.isArray(body) || body.length === 0) {
        res.status(400).json({
          error: { code: 'INVALID_PAYLOAD', message: 'Request body must be a non-empty array of faculty schedule objects' }
        });
        return;
      }

      // Each entry must at least have a facultyName and schedule object
      for (const entry of body) {
        if (typeof entry.facultyName !== 'string' || typeof entry.schedule !== 'object') {
          res.status(400).json({
            error: { code: 'INVALID_PAYLOAD', message: 'Each entry must have "facultyName" (string) and "schedule" (object)' }
          });
          return;
        }
      }

      // Write atomically — write to a temp file then rename
      const tmp = DATA_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(body, null, 2), 'utf-8');
      fs.renameSync(tmp, DATA_FILE);

      res.json({ message: 'Schedule data saved successfully', count: body.length });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'WRITE_ERROR', message: err.message } });
    }
  }
);

export default router;
