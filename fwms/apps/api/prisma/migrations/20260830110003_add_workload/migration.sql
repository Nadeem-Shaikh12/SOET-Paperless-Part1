-- CreateTable
CREATE TABLE "workload_reports" (
    "report_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dept_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Teaching Workload',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workload_reports_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "departments" ("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workload_reports_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workload_report_rows" (
    "row_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "report_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "program_class" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "divisions" INTEGER NOT NULL DEFAULT 1,
    "theory_hrs_per_week" REAL NOT NULL DEFAULT 0,
    "total_theory_hrs" REAL NOT NULL DEFAULT 0,
    "batches" INTEGER NOT NULL DEFAULT 0,
    "practical_hrs_per_week" REAL NOT NULL DEFAULT 0,
    "total_practical_hrs" REAL NOT NULL DEFAULT 0,
    "tutorial_hrs_per_week" REAL NOT NULL DEFAULT 0,
    "total_teaching_hours" REAL NOT NULL DEFAULT 0,
    "credits_l" REAL NOT NULL DEFAULT 0,
    "credits_p" REAL NOT NULL DEFAULT 0,
    "credits_t" REAL NOT NULL DEFAULT 0,
    "note_marker" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workload_report_rows_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "workload_reports" ("report_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "workload_reports_dept_id_idx" ON "workload_reports"("dept_id");

-- CreateIndex
CREATE INDEX "workload_reports_term_id_idx" ON "workload_reports"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "workload_reports_dept_id_term_id_key" ON "workload_reports"("dept_id", "term_id");

-- CreateIndex
CREATE INDEX "workload_report_rows_report_id_idx" ON "workload_report_rows"("report_id");

-- CreateIndex
CREATE INDEX "allocations_faculty_id_idx" ON "allocations"("faculty_id");

-- CreateIndex
CREATE INDEX "allocations_subject_id_idx" ON "allocations"("subject_id");

-- CreateIndex
CREATE INDEX "allocations_class_id_idx" ON "allocations"("class_id");

-- CreateIndex
CREATE INDEX "allocations_batch_id_idx" ON "allocations"("batch_id");

-- CreateIndex
CREATE INDEX "allocations_term_id_idx" ON "allocations"("term_id");

-- CreateIndex
CREATE INDEX "allocations_status_idx" ON "allocations"("status");

-- CreateIndex
CREATE INDEX "batches_class_id_idx" ON "batches"("class_id");

-- CreateIndex
CREATE INDEX "batches_subject_id_idx" ON "batches"("subject_id");

-- CreateIndex
CREATE INDEX "batches_faculty_id_idx" ON "batches"("faculty_id");

-- CreateIndex
CREATE INDEX "batches_term_id_idx" ON "batches"("term_id");

-- CreateIndex
CREATE INDEX "class_divisions_dept_id_idx" ON "class_divisions"("dept_id");

-- CreateIndex
CREATE INDEX "class_divisions_term_id_idx" ON "class_divisions"("term_id");

-- CreateIndex
CREATE INDEX "faculty_dept_id_idx" ON "faculty"("dept_id");

-- CreateIndex
CREATE INDEX "student_strengths_class_id_idx" ON "student_strengths"("class_id");

-- CreateIndex
CREATE INDEX "student_strengths_subject_id_idx" ON "student_strengths"("subject_id");

-- CreateIndex
CREATE INDEX "student_strengths_term_id_idx" ON "student_strengths"("term_id");

-- CreateIndex
CREATE INDEX "subjects_dept_id_idx" ON "subjects"("dept_id");

-- CreateIndex
CREATE INDEX "subjects_term_id_idx" ON "subjects"("term_id");
