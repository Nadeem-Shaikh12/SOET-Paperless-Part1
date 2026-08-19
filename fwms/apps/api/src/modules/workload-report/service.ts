import prisma from '../../lib/prisma.js';

type RowInput = {
  id?: number;
  sortOrder: number;
  programClass: string;
  subjectName: string;
  divisions: number;
  theoryHrsPerWeek: number;
  totalTheoryHrs: number;
  batches: number;
  practicalHrsPerWeek: number;
  totalPracticalHrs: number;
  tutorialHrsPerWeek: number;
  totalTeachingHours: number;
  creditsL: number;
  creditsP: number;
  creditsT: number;
  noteMarker?: string | null;
};

class WorkloadReportService {

  /** Get report for a department + term (returns null if none exists) */
  async getReport(deptId: number, termId: number) {
    const report = await prisma.workloadReport.findUnique({
      where: { deptId_termId: { deptId, termId } },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        department: { include: { school: true } },
        term: true,
      },
    });
    return report;
  }

  /** Auto-generate report from existing subjects/classes/batches */
  async generateReport(deptId: number, termId: number) {
    // Delete existing report if any
    const existing = await prisma.workloadReport.findUnique({
      where: { deptId_termId: { deptId, termId } },
    });
    if (existing) {
      await prisma.workloadReport.delete({ where: { id: existing.id } });
    }

    // Fetch all subjects for this department and term
    const subjects = await prisma.subject.findMany({
      where: { deptId, termId, isActive: true },
      include: {
        batches: { where: { termId } },
        strengths: {
          where: { termId },
          include: { classDivision: true },
        },
      },
    });

    // Fetch class divisions for this department and term
    const classes = await prisma.classDivision.findMany({
      where: { deptId, termId },
    });

    // Build report rows from subjects
    const rows: Omit<RowInput, 'id'>[] = [];
    let sortOrder = 1;

    // Group classes by className to count divisions
    const classNameDivisions = new Map<string, number>();
    for (const cls of classes) {
      classNameDivisions.set(
        cls.className,
        (classNameDivisions.get(cls.className) || 0) + 1
      );
    }

    for (const subject of subjects) {
      // Determine program/class from class divisions linked via strengths
      const linkedClasses = subject.strengths.map(s => s.classDivision);
      const uniqueClassNames = [...new Set(linkedClasses.map(c => `${c.className} ${c.division}`))];
      const programClass = uniqueClassNames.length > 0
        ? uniqueClassNames[0]
        : 'Unassigned';

      // Count divisions — number of unique divisions for the class
      const baseClassName = linkedClasses.length > 0 ? linkedClasses[0].className : '';
      const divisionCount = classNameDivisions.get(baseClassName) || 1;

      // Count batches for this subject
      const batchCount = subject.batches.length;

      // Compute hours
      const theoryHrsPerWeek = subject.hasTheory
        ? subject.creditHours * subject.theoryMultiplier
        : 0;
      const totalTheoryHrs = divisionCount * theoryHrsPerWeek;

      const practicalHrsPerWeek = subject.hasPractical
        ? subject.creditHours * subject.practicalMultiplier
        : 0;
      const totalPracticalHrs = batchCount * practicalHrsPerWeek;

      const tutorialHrsPerWeek = subject.hasTutorial
        ? (subject.tutorialHours || 0)
        : 0;

      const totalTeachingHours = totalTheoryHrs + totalPracticalHrs + tutorialHrsPerWeek;

      // Credits breakdown — derive from subject config
      const creditsL = subject.hasTheory ? subject.creditHours : 0;
      const creditsP = subject.hasPractical ? subject.creditHours : 0;
      const creditsT = subject.hasTutorial ? (subject.tutorialHours || 0) : 0;

      rows.push({
        sortOrder: sortOrder++,
        programClass,
        subjectName: subject.subjectName,
        divisions: divisionCount,
        theoryHrsPerWeek,
        totalTheoryHrs,
        batches: batchCount,
        practicalHrsPerWeek,
        totalPracticalHrs,
        tutorialHrsPerWeek,
        totalTeachingHours,
        creditsL,
        creditsP,
        creditsT,
        noteMarker: null,
      });
    }

    // Create the report with all rows
    const report = await prisma.workloadReport.create({
      data: {
        deptId,
        termId,
        title: 'Teaching Workload',
        rows: {
          create: rows,
        },
      },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        department: { include: { school: true } },
        term: true,
      },
    });

    return report;
  }

  /** Bulk update report — replaces all rows */
  async updateReport(
    reportId: number,
    data: { title?: string; notes?: string; rows: RowInput[] }
  ) {
    // Delete all existing rows, then recreate
    await prisma.workloadReportRow.deleteMany({
      where: { reportId },
    });

    const report = await prisma.workloadReport.update({
      where: { id: reportId },
      data: {
        title: data.title,
        notes: data.notes,
        rows: {
          create: data.rows.map((r, idx) => ({
            sortOrder: r.sortOrder ?? idx + 1,
            programClass: r.programClass,
            subjectName: r.subjectName,
            divisions: r.divisions,
            theoryHrsPerWeek: r.theoryHrsPerWeek,
            totalTheoryHrs: r.totalTheoryHrs,
            batches: r.batches,
            practicalHrsPerWeek: r.practicalHrsPerWeek,
            totalPracticalHrs: r.totalPracticalHrs,
            tutorialHrsPerWeek: r.tutorialHrsPerWeek,
            totalTeachingHours: r.totalTeachingHours,
            creditsL: r.creditsL,
            creditsP: r.creditsP,
            creditsT: r.creditsT,
            noteMarker: r.noteMarker,
          })),
        },
      },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        department: { include: { school: true } },
        term: true,
      },
    });

    return report;
  }

  /** Add a single row to a report */
  async addRow(reportId: number, rowData: RowInput) {
    const row = await prisma.workloadReportRow.create({
      data: {
        reportId,
        sortOrder: rowData.sortOrder,
        programClass: rowData.programClass,
        subjectName: rowData.subjectName,
        divisions: rowData.divisions,
        theoryHrsPerWeek: rowData.theoryHrsPerWeek,
        totalTheoryHrs: rowData.totalTheoryHrs,
        batches: rowData.batches,
        practicalHrsPerWeek: rowData.practicalHrsPerWeek,
        totalPracticalHrs: rowData.totalPracticalHrs,
        tutorialHrsPerWeek: rowData.tutorialHrsPerWeek,
        totalTeachingHours: rowData.totalTeachingHours,
        creditsL: rowData.creditsL,
        creditsP: rowData.creditsP,
        creditsT: rowData.creditsT,
        noteMarker: rowData.noteMarker,
      },
    });
    return row;
  }

  /** Update a single row */
  async updateRow(rowId: number, rowData: Partial<RowInput>) {
    const row = await prisma.workloadReportRow.update({
      where: { id: rowId },
      data: rowData,
    });
    return row;
  }

  /** Delete a single row */
  async deleteRow(rowId: number) {
    await prisma.workloadReportRow.delete({ where: { id: rowId } });
  }
  /** Sync report rows to master Subjects table */
  async syncReportToSubjects(reportId: number) {
    const report = await prisma.workloadReport.findUnique({
      where: { id: reportId },
      include: { rows: true },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const { deptId, termId, rows } = report;

    const upsertedSubjects = await Promise.all(
      rows.map(async (row, idx) => {
        // Generate a standard subject code if none is explicitly extracted.
        // E.g. CS-TE-SOFTWARE-ENG-01
        const cleanName = row.subjectName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
        const cleanClass = row.programClass.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
        const code = `S-${cleanClass}-${cleanName}-${idx}`;

        return prisma.subject.upsert({
          where: {
            subjectCode_termId: {
              subjectCode: code,
              termId: termId,
            }
          },
          update: {
            subjectName: row.subjectName,
            hasTheory: row.theoryHrsPerWeek > 0,
            hasPractical: row.practicalHrsPerWeek > 0,
            hasTutorial: row.tutorialHrsPerWeek > 0,
            creditHours: row.creditsL + row.creditsP + row.creditsT,
          },
          create: {
            subjectCode: code,
            subjectName: row.subjectName,
            deptId: deptId,
            termId: termId,
            hasTheory: row.theoryHrsPerWeek > 0,
            hasPractical: row.practicalHrsPerWeek > 0,
            hasTutorial: row.tutorialHrsPerWeek > 0,
            creditHours: row.creditsL + row.creditsP + row.creditsT,
            isActive: true,
          }
        });
      })
    );

    return upsertedSubjects;
  }
}

export const workloadReportService = new WorkloadReportService();
