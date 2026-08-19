import { z } from 'zod';

// ─── Faculty ───
export const createFacultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format'),
  designation: z.enum(['Professor', 'Associate_Professor', 'Assistant_Professor']),
  deptId: z.number().int().positive(),
  employmentType: z.enum(['Permanent', 'Contract', 'Visiting']),
  initialPassword: z.string().min(6).optional(),
  isHod: z.boolean().optional(),
});

export const updateFacultySchema = createFacultySchema.partial().omit({ email: true, deptId: true });

export const deactivateFacultySchema = z.object({
  effectiveEndDate: z.string().datetime().or(z.string().date()),
  reason: z.string().min(5, 'Reason must be at least 5 characters').optional(),
});

// ─── Subject ───
export const createSubjectSchema = z.object({
  subjectCode: z.string().min(2, 'Subject code is required').max(20),
  subjectName: z.string().min(2, 'Subject name is required').max(200),
  deptId: z.number().int().positive(),
  hasTheory: z.boolean().default(true),
  hasPractical: z.boolean().default(false),
  hasTutorial: z.boolean().default(false),
  creditHours: z.number().positive('Credit hours must be > 0'),
  theoryMultiplier: z.number().nonnegative().default(1.0),
  practicalMultiplier: z.number().nonnegative().default(2.0),
  tutorialHours: z.number().nonnegative().nullable().optional(),
  termId: z.number().int().positive(),
  isActive: z.boolean().default(true),
});

export const updateSubjectSchema = createSubjectSchema.partial();

// ─── Class/Division ───
export const createClassDivisionSchema = z.object({
  className: z.string().min(2, 'Class name is required').max(100),
  division: z.string().min(1, 'Division is required').max(10),
  deptId: z.number().int().positive(),
  termId: z.number().int().positive(),
});

export const updateClassDivisionSchema = createClassDivisionSchema.partial();

// ─── Batch ───
export const createBatchSchema = z.object({
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  batchName: z.string().min(1, 'Batch name is required').max(20),
  batchSize: z.number().int().positive('Batch size must be > 0'),
  facultyId: z.number().int().positive(),
  termId: z.number().int().positive(),
});

export const updateBatchSchema = createBatchSchema.partial();

// ─── Student Strength ───
export const createStudentStrengthSchema = z.object({
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  studentCount: z.number().int().nonnegative('Student count must be ≥ 0'),
  termId: z.number().int().positive(),
});

export const updateStudentStrengthSchema = z.object({
  studentCount: z.number().int().nonnegative('Student count must be ≥ 0'),
});

// ─── Allocation ───
export const createAllocationSchema = z.object({
  facultyId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  classId: z.number().int().positive().nullable().optional(),
  batchId: z.number().int().positive().nullable().optional(),
  termId: z.number().int().positive(),
  effectiveStartDate: z.string().datetime().or(z.string().date()),
  effectiveEndDate: z.string().datetime().or(z.string().date()).nullable().optional(),
});

export const updateAllocationSchema = createAllocationSchema.partial();

// ─── Approval Decision ───
export const approvalDecisionBaseSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'returned_for_clarification']),
  remarks: z.string().optional(),
});

export const approvalDecisionSchema = approvalDecisionBaseSchema.refine(
  (data) => {
    if (data.decision === 'rejected' || data.decision === 'returned_for_clarification') {
      return data.remarks && data.remarks.length >= 10;
    }
    return true;
  },
  {
    message: 'Remarks must be at least 10 characters for reject/return decisions',
    path: ['remarks'],
  }
);

// ─── Types ───
export type CreateFacultyRequest = z.infer<typeof createFacultySchema>;
export type UpdateFacultyRequest = z.infer<typeof updateFacultySchema>;
export type DeactivateFacultyRequest = z.infer<typeof deactivateFacultySchema>;
export type CreateSubjectRequest = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectRequest = z.infer<typeof updateSubjectSchema>;
export type CreateClassDivisionRequest = z.infer<typeof createClassDivisionSchema>;
export type UpdateClassDivisionRequest = z.infer<typeof updateClassDivisionSchema>;
export type CreateBatchRequest = z.infer<typeof createBatchSchema>;
export type UpdateBatchRequest = z.infer<typeof updateBatchSchema>;
export type CreateStudentStrengthRequest = z.infer<typeof createStudentStrengthSchema>;
export type UpdateStudentStrengthRequest = z.infer<typeof updateStudentStrengthSchema>;
export type CreateAllocationRequest = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationRequest = z.infer<typeof updateAllocationSchema>;
export type ApprovalDecisionRequest = z.infer<typeof approvalDecisionSchema>;
