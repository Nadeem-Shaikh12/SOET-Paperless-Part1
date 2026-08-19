import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { workloadReportService } from './service.js';
import { geminiIngestService } from './ingest.service.js';

const router = Router();

// Multer: memory storage, accept images and PDFs up to 20 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, PDF, XLSX, or CSV files are allowed'));
    }
  },
});

router.use(authenticate);

// POST /workload-report/ingest — AI-powered document ingestion via Gemini
router.post(
  '/ingest',
  requireRole('super_admin', 'dept_admin'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: { message: 'No file uploaded' } });
      }

      const termId = req.body.termId ? parseInt(req.body.termId as string) : null;
      const deptId = req.body.deptId
        ? parseInt(req.body.deptId as string)
        : req.user!.deptId ?? null;
      const dryRun = req.body.dryRun === 'true' || req.body.dryRun === true;

      if (!termId) {
        return res.status(400).json({ error: { message: 'termId is required' } });
      }
      if (!deptId) {
        return res.status(400).json({ error: { message: 'deptId is required' } });
      }

      const ocrText = req.body.ocrText as string | undefined;

      // Call Gemini
      const extracted = await geminiIngestService.extract(
        file.buffer,
        file.mimetype,
        termId,
        deptId,
        ocrText
      );

      // Dry-run: return preview only, do not persist
      if (dryRun) {
        return res.json({
          success: true,
          preview: true,
          data: extracted,
        });
      }

      // If we have subject rows, map them to the existing report row format and save
      if (extracted.subjects && extracted.subjects.length > 0) {
        // Ensure report exists (auto-generate empty one if needed)
        let report = await workloadReportService.getReport(deptId, termId);
        if (!report) {
          report = await workloadReportService.generateReport(deptId, termId);
        }

        const rows = extracted.subjects.map((s, idx) => ({
          sortOrder: parseInt(String(s.srNo)) || idx + 1,
          programClass: s.programClass || '',
          subjectName: s.subjectName || '',
          divisions: s.noOfDivisions || 0,
          theoryHrsPerWeek: s.theoryHrsPerWeek || 0,
          totalTheoryHrs: s.totalTheoryHrs || 0,
          batches: s.noOfBatches || 0,
          practicalHrsPerWeek: s.practicalHrsPerWeek || 0,
          totalPracticalHrs: s.totalPracticalHrs || 0,
          tutorialHrsPerWeek: s.tutorialHrsPerWeek || 0,
          totalTeachingHours: s.totalTeachingHours || 0,
          creditsL: s.creditL || 0,
          creditsP: s.creditP || 0,
          creditsT: s.creditT || 0,
          noteMarker: s.isLoadTakenByOtherDept
            ? '*'
            : s.isLoadFromOtherDept
            ? '**'
            : null,
        }));

        const updatedReport = await workloadReportService.updateReport(report.id, {
          title: `Teaching Workload — ${extracted.academicYear ?? ''} ${extracted.semesterPart ?? ''}`.trim(),
          notes: `AI-imported from document. School: ${extracted.school}. Department: ${extracted.department}.`,
          rows,
        });

        return res.json({
          success: true,
          preview: false,
          report: updatedReport,
          extractionMetadata: extracted.extractionMetadata,
        });
      }

      return res.json({
        success: true,
        preview: false,
        message: 'No subjects found in the document',
        data: extracted,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /workload-report?deptId=X&termId=Y — Get report (auto-generate if none exists)
router.get(
  '/',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let deptId = req.query.deptId ? parseInt(req.query.deptId as string) : null;
      const termId = req.query.termId ? parseInt(req.query.termId as string) : null;

      if (!termId) {
        return res.status(400).json({ error: { message: 'termId is required' } });
      }

      // For HOD, use their own department
      if (!deptId && req.user!.deptId) {
        deptId = req.user!.deptId;
      }

      if (!deptId) {
        return res.status(400).json({ error: { message: 'deptId is required' } });
      }

      let report = await workloadReportService.getReport(deptId, termId);

      // Auto-generate if no report exists
      if (!report) {
        report = await workloadReportService.generateReport(deptId, termId);
      }

      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

// POST /workload-report/generate — Force regenerate from DB data
router.post(
  '/generate',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deptId, termId } = req.body;

      if (!deptId || !termId) {
        return res.status(400).json({ error: { message: 'deptId and termId are required' } });
      }

      const report = await workloadReportService.generateReport(deptId, termId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /workload-report/:id — Bulk update report (all rows)
router.put(
  '/:id',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = parseInt(req.params.id as string);
      const { title, notes, rows } = req.body;

      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: { message: 'rows array is required' } });
      }

      const report = await workloadReportService.updateReport(reportId, {
        title,
        notes,
        rows,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

// POST /workload-report/:id/sync — Sync report to master Subject table
router.post(
  '/:id/sync',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = parseInt(req.params.id as string);
      const syncedSubjects = await workloadReportService.syncReportToSubjects(reportId);
      res.json({ success: true, count: syncedSubjects.length, subjects: syncedSubjects });
    } catch (err) {
      next(err);
    }
  }
);

// POST /workload-report/:id/rows — Add a single row
router.post(
  '/:id/rows',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = parseInt(req.params.id as string);
      const row = await workloadReportService.addRow(reportId, req.body);
      res.status(201).json(row);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /workload-report/rows/:rowId — Update a single row
router.put(
  '/rows/:rowId',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rowId = parseInt(req.params.rowId as string);
      const row = await workloadReportService.updateRow(rowId, req.body);
      res.json(row);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /workload-report/rows/:rowId — Delete a single row
router.delete(
  '/rows/:rowId',
  requireRole('super_admin', 'dept_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rowId = parseInt(req.params.rowId as string);
      await workloadReportService.deleteRow(rowId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
