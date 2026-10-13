import prisma from '../../lib/prisma.js';

export class DashboardService {
  async getSuperAdminDashboard(termId: number) {
    const [allFaculty, allDepts, allocations, norms] = await Promise.all([
      prisma.faculty.findMany({ where: { status: 'active' }, include: { department: true } }),
      prisma.department.findMany({ where: { isActive: true } }),
      prisma.allocation.findMany({
        where: { termId, status: 'approved' },
        include: { faculty: { include: { department: true } } }
      }),
      prisma.norms.findMany({ where: { effectiveTermId: termId } })
    ]);

    // Aggregate workloads
    const facultyWorkloads = new Map<number, { name: string; dept: string; desig: string; totalHours: number; theoryHours: number; practicalHours: number; normMax: number; normMin: number }>();

    for (const fac of allFaculty) {
      const norm = norms.find(n => n.designation === fac.designation);
      facultyWorkloads.set(fac.id, {
        name: fac.name,
        dept: fac.department?.deptName || 'General',
        desig: fac.designation,
        totalHours: 0,
        theoryHours: 0,
        practicalHours: 0,
        normMax: norm?.maxWeeklyHours || 18,
        normMin: norm?.minWeeklyHours || 12,
      });
    }

    for (const alloc of allocations) {
      const f = facultyWorkloads.get(alloc.facultyId);
      if (f) {
        f.totalHours += alloc.totalHours;
        f.theoryHours += alloc.theoryHours;
        f.practicalHours += alloc.practicalHours;
      }
    }

    let overloadedCount = 0;
    let underloadedCount = 0;
    let totalWorkload = 0;

    const heatmapData = [];
    const deptWorkloadMap = new Map<string, { theory: number; practical: number }>();

    for (const d of allDepts) {
      deptWorkloadMap.set(d.deptName, { theory: 0, practical: 0 });
    }

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

    const deptWorkloadChart = Array.from(deptWorkloadMap.entries()).map(([dept, data]) => {
      let shortName = dept;
      if (dept.toLowerCase().includes('computer')) shortName = 'CSE';
      else if (dept.toLowerCase().includes('mechanical')) shortName = 'Mechanical';
      else if (dept.toLowerCase().includes('civil')) shortName = 'Civil';
      else if (dept.toLowerCase().includes('electrical') || dept.toLowerCase().includes('etc')) shortName = 'EE & ETC';
      else if (dept.toLowerCase().includes('information')) shortName = 'IT';

      return {
        name: shortName,
        fullName: dept,
        Theory: data.theory,
        Practical: data.practical,
        Total: data.theory + data.practical,
      };
    });

    return {
      kpis: {
        totalFaculty: allFaculty.length,
        totalDepartments: allDepts.length,
        avgWorkload: Number(avgWorkload),
        overloadedCount
      },
      heatmap: heatmapData,
      deptWorkloadChart
    };
  }

  async getHodDashboard(deptId: number, termId: number) {
    const [allDeptFaculty, allocations, norms, subjects] = await Promise.all([
      prisma.faculty.findMany({ where: { deptId, status: 'active' } }),
      prisma.allocation.findMany({
        where: { termId, faculty: { deptId }, status: 'approved' },
        include: { faculty: true, subject: true }
      }),
      prisma.norms.findMany({ where: { effectiveTermId: termId } }),
      prisma.subject.findMany({ where: { deptId, termId } })
    ]);

    const facultyWorkloads = new Map<number, { id: number; name: string; desig: string; totalHours: number; theoryHours: number; practicalHours: number; normMax: number; normMin: number }>();
    const subjectHoursMap = new Map<string, number>();

    for (const fac of allDeptFaculty) {
      const norm = norms.find(n => n.designation === fac.designation);
      facultyWorkloads.set(fac.id, {
        id: fac.id,
        name: fac.name,
        desig: fac.designation,
        totalHours: 0,
        theoryHours: 0,
        practicalHours: 0,
        normMax: norm?.maxWeeklyHours || 18,
        normMin: norm?.minWeeklyHours || 12,
      });
    }

    for (const alloc of allocations) {
      const f = facultyWorkloads.get(alloc.facultyId);
      if (f) {
        f.totalHours += alloc.totalHours;
        f.theoryHours += alloc.theoryHours;
        f.practicalHours += alloc.practicalHours;
      }

      const subName = alloc.subject?.subjectName || 'Subject';
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
        facultyCount: allDeptFaculty.length,
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
        department: true,
        userAuth: true,
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

    // Fetch workload report rows from this faculty's department for this term
    const deptReport = await prisma.workloadReport.findUnique({
      where: { deptId_termId: { deptId: faculty.deptId, termId } },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Helper: extract abbreviation code from name like "Mr. Jadhav M. S. (JMS)" => "JMS"
    const extractCode = (name: string): string | null => {
      const match = name.match(/\(([A-Z]{2,5})\)\s*$/);
      return match ? match[1] : null;
    };

    const facultyCode = extractCode(faculty.name);
    const facultyNameLower = faculty.name.toLowerCase().replace(/[^a-z]/g, '');

    // Load schedule data & personal workload parsed from official timetables
    let mySchedule: Record<string, any[]> = {};
    let scheduleEntry: any = null;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dataFile = path.resolve(__dirname, '../../../../web/src/data/scheduleData.json');

      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        const allSchedules = JSON.parse(raw);

        // Find this faculty's schedule by matching abbreviation code or name
        scheduleEntry = allSchedules.find((entry: any) => {
          if (entry.facultyName.trim().toLowerCase() === faculty.name.trim().toLowerCase()) return true;
          const entryCode = extractCode(entry.facultyName);
          if (facultyCode && entryCode && facultyCode === entryCode) {
            const fNameClean = faculty.name.toLowerCase().replace(/[^a-z]/g, '');
            const eNameClean = entry.facultyName.toLowerCase().replace(/[^a-z]/g, '');
            if (fNameClean.includes('kothimbire') && !eNameClean.includes('kothimbire')) return false;
            if (fNameClean.includes('kachare') && !eNameClean.includes('kachare')) return false;
            return true;
          }
          const entryNameLower = entry.facultyName.toLowerCase().replace(/[^a-z]/g, '');
          if (facultyNameLower.length > 6 && entryNameLower.includes(facultyNameLower.slice(0, 10))) return true;
          if (entryNameLower.length > 6 && facultyNameLower.includes(entryNameLower.slice(0, 10))) return true;
          return false;
        });

        if (scheduleEntry) {
          mySchedule = scheduleEntry.schedule || {};
        }
      }
    } catch (err) {
      console.warn('Could not load schedule data for faculty dashboard:', err);
    }

    // Build accurate workload rows: prioritize official parsed courses from scheduleEntry
    let myWorkloadRows: any[] = [];
    if (scheduleEntry && Array.isArray(scheduleEntry.courses) && scheduleEntry.courses.length > 0) {
      myWorkloadRows = scheduleEntry.courses.map((c: any, idx: number) => ({
        id: idx + 1,
        subjectName: `${c.code}: ${c.title}`,
        programClass: (c.locations && c.locations.length > 0) ? c.locations.join(', ') : 'Class / Lab',
        theoryHrsPerWeek: c.theoryHrs,
        practicalHrsPerWeek: c.practicalHrs,
        tutorialHrsPerWeek: c.tutorialHrs || 0,
        totalTeachingHours: c.totalSemesterHours || (c.totalHrs * 16),
        noteMarker: (c.batches && c.batches.length > 0) ? c.batches.join(', ') : null,
      }));
      totalHours = scheduleEntry.totalWeeklyHours || myWorkloadRows.reduce((s, r) => s + r.theoryHrsPerWeek + r.practicalHrsPerWeek + r.tutorialHrsPerWeek, 0);
    } else {
      // Fallback to department report if no personal timetable found
      const allRows = deptReport?.rows ?? [];
      myWorkloadRows = allRows.filter((row) => {
        const rowCode = extractCode(row.subjectName);
        if (facultyCode && rowCode && facultyCode === rowCode) return true;
        const rowNameLower = row.subjectName.toLowerCase().replace(/[^a-z]/g, '');
        if (facultyNameLower.length > 5 && rowNameLower.includes(facultyNameLower.slice(0, 10))) return true;
        if (rowNameLower.length > 5 && facultyNameLower.includes(rowNameLower.slice(0, 10))) return true;
        return false;
      }).map((row) => ({
        id: row.id,
        subjectName: row.subjectName,
        programClass: row.programClass,
        theoryHrsPerWeek: row.theoryHrsPerWeek,
        practicalHrsPerWeek: row.practicalHrsPerWeek,
        tutorialHrsPerWeek: row.tutorialHrsPerWeek,
        totalTeachingHours: row.totalTeachingHours,
        noteMarker: row.noteMarker,
      }));

      if (subjects.length === 0 && myWorkloadRows.length > 0) {
        totalHours = myWorkloadRows.reduce(
          (sum, r) => sum + (r.theoryHrsPerWeek || 0) + (r.practicalHrsPerWeek || 0) + (r.tutorialHrsPerWeek || 0),
          0
        );
      }
    }

    const displaySubjects = subjects.length > 0 ? subjects : myWorkloadRows.map((r) => ({
      id: r.id,
      subjectName: r.subjectName,
      className: r.programClass,
      batchName: r.noteMarker || undefined,
      hours: (r.theoryHrsPerWeek || 0) + (r.practicalHrsPerWeek || 0) + (r.tutorialHrsPerWeek || 0),
      theoryHrs: r.theoryHrsPerWeek,
      practicalHrs: r.practicalHrsPerWeek,
      status: 'approved',
      source: 'allocation' as const,
    }));

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
        theoryHours: scheduleEntry?.theoryWeeklyHours ?? myWorkloadRows.reduce((s, r) => s + (r.theoryHrsPerWeek || 0), 0),
        practicalHours: scheduleEntry?.practicalWeeklyHours ?? myWorkloadRows.reduce((s, r) => s + (r.practicalHrsPerWeek || 0), 0),
        tutorialHours: scheduleEntry?.tutorialWeeklyHours ?? myWorkloadRows.reduce((s, r) => s + (r.tutorialHrsPerWeek || 0), 0),
        normMax,
        normMin,
        status: workloadStatus
      },
      assignedSubjects: displaySubjects,
      workloadRows: myWorkloadRows,
      schedule: mySchedule,
      departmentName: faculty.department?.deptName || '',
      recentRequests: recentApprovals
    };
  }
}

export const dashboardService = new DashboardService();
