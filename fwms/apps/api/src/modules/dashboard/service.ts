import prisma from '../../lib/prisma.js';

export class DashboardService {
  async getSuperAdminDashboard(termId: number) {
    const [facultyCount, deptCount, allocations, norms] = await Promise.all([
      prisma.faculty.count({ where: { status: 'active' } }),
      prisma.department.count({ where: { isActive: true } }),
      prisma.allocation.findMany({
        where: { termId, status: 'approved' },
        include: { faculty: { include: { department: true } } }
      }),
      prisma.norms.findMany({ where: { effectiveTermId: termId } })
    ]);

    // Aggregate workloads
    const facultyWorkloads = new Map<number, { name: string; dept: string; desig: string; totalHours: number; theoryHours: number; practicalHours: number; normMax: number; normMin: number }>();

    for (const alloc of allocations) {
      const fId = alloc.facultyId;
      if (!facultyWorkloads.has(fId)) {
        const norm = norms.find(n => n.designation === alloc.faculty.designation);
        facultyWorkloads.set(fId, {
          name: alloc.faculty.name,
          dept: alloc.faculty.department.deptName,
          desig: alloc.faculty.designation,
          totalHours: 0,
          theoryHours: 0,
          practicalHours: 0,
          normMax: norm?.maxWeeklyHours || 18,
          normMin: norm?.minWeeklyHours || 12,
        });
      }
      const f = facultyWorkloads.get(fId)!;
      f.totalHours += alloc.totalHours;
      f.theoryHours += alloc.theoryHours;
      f.practicalHours += alloc.practicalHours;
    }

    let overloadedCount = 0;
    let underloadedCount = 0;
    let totalWorkload = 0;

    const heatmapData = [];
    const deptWorkloadMap = new Map<string, { theory: number; practical: number }>();

    for (const [id, f] of facultyWorkloads.entries()) {
      totalWorkload += f.totalHours;
      let status = 'normal';
      if (f.totalHours > f.normMax) {
        overloadedCount++;
        status = 'overloaded';
      } else if (f.totalHours < f.normMin) {
        underloadedCount++;
        status = 'underloaded';
      }

      heatmapData.push({ id, name: f.name, dept: f.dept, desig: f.desig, totalHours: f.totalHours, status });

      if (!deptWorkloadMap.has(f.dept)) {
        deptWorkloadMap.set(f.dept, { theory: 0, practical: 0 });
      }
      const d = deptWorkloadMap.get(f.dept)!;
      d.theory += f.theoryHours;
      d.practical += f.practicalHours;
    }

    const avgWorkload = facultyWorkloads.size > 0 ? (totalWorkload / facultyWorkloads.size).toFixed(1) : 0;

    const deptWorkloadChart = Array.from(deptWorkloadMap.entries()).map(([dept, data]) => ({
      name: dept,
      Theory: data.theory,
      Practical: data.practical
    }));

    return {
      kpis: {
        totalFaculty: facultyCount,
        totalDepartments: deptCount,
        avgWorkload: Number(avgWorkload),
        overloadedCount
      },
      heatmap: heatmapData,
      deptWorkloadChart
    };
  }

  async getHodDashboard(deptId: number, termId: number) {
    const [facultyCount, allocations, norms, subjects] = await Promise.all([
      prisma.faculty.count({ where: { deptId, status: 'active' } }),
      prisma.allocation.findMany({
        where: { termId, faculty: { deptId }, status: 'approved' },
        include: { faculty: true, subject: true }
      }),
      prisma.norms.findMany({ where: { effectiveTermId: termId } }),
      prisma.subject.findMany({ where: { deptId, termId } })
    ]);

    const facultyWorkloads = new Map<number, { id: number; name: string; desig: string; totalHours: number; theoryHours: number; practicalHours: number; normMax: number; normMin: number }>();
    const subjectHoursMap = new Map<string, number>();

    for (const alloc of allocations) {
      const fId = alloc.facultyId;
      if (!facultyWorkloads.has(fId)) {
        const norm = norms.find(n => n.designation === alloc.faculty.designation);
        facultyWorkloads.set(fId, {
          id: fId,
          name: alloc.faculty.name,
          desig: alloc.faculty.designation,
          totalHours: 0,
          theoryHours: 0,
          practicalHours: 0,
          normMax: norm?.maxWeeklyHours || 18,
          normMin: norm?.minWeeklyHours || 12,
        });
      }
      const f = facultyWorkloads.get(fId)!;
      f.totalHours += alloc.totalHours;
      f.theoryHours += alloc.theoryHours;
      f.practicalHours += alloc.practicalHours;

      const subName = alloc.subject.subjectName;
      subjectHoursMap.set(subName, (subjectHoursMap.get(subName) || 0) + alloc.totalHours);
    }

    let overloadedCount = 0;
    let totalWorkload = 0;

    for (const f of facultyWorkloads.values()) {
      totalWorkload += f.totalHours;
      if (f.totalHours > f.normMax) overloadedCount++;
    }

    const avgWorkload = facultyWorkloads.size > 0 ? (totalWorkload / facultyWorkloads.size).toFixed(1) : 0;

    const subjectAllocationChart = Array.from(subjectHoursMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      kpis: {
        facultyCount,
        avgWorkload: Number(avgWorkload),
        overloadedCount
      },
      facultyWorkloads: Array.from(facultyWorkloads.values()),
      subjectAllocationChart
    };
  }

  async getFacultyDashboard(facultyId: number, termId: number) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: {
        allocations: {
          where: { termId },
          include: { subject: true, classDivision: true, batch: true }
        }
      }
    });

    if (!faculty) throw new Error('Faculty not found');

    const norms = await prisma.norms.findFirst({
      where: { designation: faculty.designation, effectiveTermId: termId }
    });

    const normMax = norms?.maxWeeklyHours || 18;
    const normMin = norms?.minWeeklyHours || 12;

    let totalHours = 0;
    const subjects = [];

    for (const alloc of faculty.allocations) {
      totalHours += alloc.totalHours;
      subjects.push({
        id: alloc.id,
        subjectName: alloc.subject.subjectName,
        className: alloc.classDivision ? `${alloc.classDivision.className} ${alloc.classDivision.division}` : undefined,
        batchName: alloc.batch?.batchName,
        hours: alloc.totalHours,
        status: alloc.status,
        source: 'allocation' as const,
      });
    }

    // Also fetch workload report rows from this faculty's department for this term
    // This makes AI-imported subjects visible on the faculty dashboard even without formal allocations
    const deptReport = await prisma.workloadReport.findUnique({
      where: { deptId_termId: { deptId: faculty.deptId, termId } },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
      },
    });

    const workloadRows = (deptReport?.rows ?? []).map((row) => ({
      id: row.id,
      subjectName: row.subjectName,
      programClass: row.programClass,
      theoryHrsPerWeek: row.theoryHrsPerWeek,
      practicalHrsPerWeek: row.practicalHrsPerWeek,
      tutorialHrsPerWeek: row.tutorialHrsPerWeek,
      totalTeachingHours: row.totalTeachingHours,
      noteMarker: row.noteMarker,
    }));

    // Compute total hours from workload rows if no formal allocations exist
    if (subjects.length === 0 && workloadRows.length > 0) {
      totalHours = workloadRows.reduce((sum, r) => sum + (r.totalTeachingHours || 0), 0);
    }

    const recentApprovals = await prisma.approvalLog.findMany({
      where: { requestedBy: faculty.userAuth?.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    let workloadStatus = 'normal';
    if (totalHours > normMax) workloadStatus = 'overloaded';
    if (totalHours < normMin) workloadStatus = 'underloaded';

    return {
      workload: {
        totalHours,
        normMax,
        normMin,
        status: workloadStatus
      },
      assignedSubjects: subjects,
      workloadRows,
      recentRequests: recentApprovals
    };
  }
}

export const dashboardService = new DashboardService();
