import { z } from 'zod';

// ─── School ───
export const createSchoolSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters').max(200),
  deanName: z.string().max(100).optional(),
});

export const updateSchoolSchema = createSchoolSchema.partial();

// ─── Department ───
export const createDepartmentSchema = z.object({
  deptName: z.string().min(2, 'Department name must be at least 2 characters').max(200),
  schoolId: z.number().int().positive(),
  hodId: z.number().int().positive().nullable().optional(),
  defaultBatchSize: z.number().int().positive().optional().default(30),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ─── Academic Term ───
export const createAcademicTermSchema = z.object({
  academicYear: z.string().min(4, 'Academic year is required (e.g., "2025-26")').max(20),
  semester: z.string().min(1, 'Semester is required (e.g., "Odd", "Even", "Sem 5")').max(20),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
});

export const updateAcademicTermSchema = createAcademicTermSchema.partial();

// ─── Norms ───
const normsBaseSchema = z.object({
  designation: z.enum(['Professor', 'Associate_Professor', 'Assistant_Professor']),
  minWeeklyHours: z.number().positive('Min hours must be positive'),
  maxWeeklyHours: z.number().positive('Max hours must be positive'),
  defaultTheoryMultiplier: z.number().nonnegative('Theory multiplier must be ≥ 0'),
  defaultPracticalMultiplier: z.number().nonnegative('Practical multiplier must be ≥ 0'),
  slaDaysForHodReview: z.number().int().positive().default(3),
  effectiveTermId: z.number().int().positive(),
});

export const normsSchema = normsBaseSchema.refine((data) => data.minWeeklyHours < data.maxWeeklyHours, {
  message: 'Min hours must be less than max hours',
  path: ['minWeeklyHours'],
});

export const updateNormsSchema = normsBaseSchema.partial().omit({ designation: true });

// ─── Types ───
export type CreateSchoolRequest = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolRequest = z.infer<typeof updateSchoolSchema>;
export type CreateDepartmentRequest = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentRequest = z.infer<typeof updateDepartmentSchema>;
export type CreateAcademicTermRequest = z.infer<typeof createAcademicTermSchema>;
export type UpdateAcademicTermRequest = z.infer<typeof updateAcademicTermSchema>;
export type NormsRequest = z.infer<typeof normsSchema>;
export type UpdateNormsRequest = z.infer<typeof updateNormsSchema>;
