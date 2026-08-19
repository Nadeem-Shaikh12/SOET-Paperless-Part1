-- CreateTable
CREATE TABLE "schools" (
    "school_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "school_name" TEXT NOT NULL,
    "dean_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "departments" (
    "dept_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dept_name" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "hod_id" INTEGER,
    "default_batch_size" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools" ("school_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "departments_hod_id_fkey" FOREIGN KEY ("hod_id") REFERENCES "faculty" ("faculty_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "term_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "academic_year" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "faculty" (
    "faculty_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "effective_end_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "faculty_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "departments" ("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_auth" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "linked_id" INTEGER,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" DATETIME,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" DATETIME,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_auth_linked_id_fkey" FOREIGN KEY ("linked_id") REFERENCES "faculty" ("faculty_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subjects" (
    "subject_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject_code" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "has_theory" BOOLEAN NOT NULL DEFAULT true,
    "has_practical" BOOLEAN NOT NULL DEFAULT false,
    "has_tutorial" BOOLEAN NOT NULL DEFAULT false,
    "credit_hours" REAL NOT NULL,
    "theory_multiplier" REAL NOT NULL DEFAULT 1.0,
    "practical_multiplier" REAL NOT NULL DEFAULT 2.0,
    "tutorial_hours" REAL,
    "term_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "subjects_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "departments" ("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subjects_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "norms" (
    "norm_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "designation" TEXT NOT NULL,
    "min_weekly_hours" REAL NOT NULL,
    "max_weekly_hours" REAL NOT NULL,
    "default_theory_multiplier" REAL NOT NULL,
    "default_practical_multiplier" REAL NOT NULL,
    "sla_days_for_hod_review" INTEGER NOT NULL DEFAULT 3,
    "effective_term_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "norms_effective_term_id_fkey" FOREIGN KEY ("effective_term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "class_divisions" (
    "class_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "class_name" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "class_divisions_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "departments" ("dept_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "class_divisions_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "student_strengths" (
    "strength_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "class_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "student_count" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "student_strengths_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_divisions" ("class_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "student_strengths_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "student_strengths_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "student_strengths_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_auth" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "batches" (
    "batch_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "class_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "batch_name" TEXT NOT NULL,
    "batch_size" INTEGER NOT NULL,
    "faculty_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "batches_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_divisions" ("class_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batches_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batches_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty" ("faculty_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batches_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "allocations" (
    "allocation_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "faculty_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "batch_id" INTEGER,
    "term_id" INTEGER NOT NULL,
    "theory_hours" REAL NOT NULL DEFAULT 0,
    "practical_hours" REAL NOT NULL DEFAULT 0,
    "total_hours" REAL NOT NULL DEFAULT 0,
    "effective_start_date" DATETIME NOT NULL,
    "effective_end_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "requires_sa_override" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "allocations_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty" ("faculty_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "allocations_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "allocations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_divisions" ("class_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "allocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches" ("batch_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "allocations_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms" ("term_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approval_logs" (
    "log_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "reviewed_by" INTEGER,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "remarks" TEXT,
    "sla_escalated" BOOLEAN NOT NULL DEFAULT false,
    "allocation_id" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_logs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "user_auth" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "approval_logs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user_auth" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "approval_logs_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "allocations" ("allocation_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_auth" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_auth" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "faculty_email_key" ON "faculty"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_username_key" ON "user_auth"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_linked_id_key" ON "user_auth"("linked_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_subject_code_term_id_key" ON "subjects"("subject_code", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "norms_designation_effective_term_id_key" ON "norms"("designation", "effective_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_divisions_class_name_division_dept_id_term_id_key" ON "class_divisions"("class_name", "division", "dept_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_strengths_class_id_subject_id_term_id_key" ON "student_strengths"("class_id", "subject_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "batches_class_id_subject_id_batch_name_term_id_key" ON "batches"("class_id", "subject_id", "batch_name", "term_id");

-- CreateIndex
CREATE INDEX "approval_logs_entity_type_entity_id_idx" ON "approval_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_logs_requested_by_idx" ON "approval_logs"("requested_by");

-- CreateIndex
CREATE INDEX "approval_logs_reviewed_by_idx" ON "approval_logs"("reviewed_by");

-- CreateIndex
CREATE INDEX "approval_logs_timestamp_idx" ON "approval_logs"("timestamp");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
