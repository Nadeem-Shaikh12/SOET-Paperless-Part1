// ─── Shared Enums ───
// Mirror the Prisma enums so frontend can use them without Prisma dependency

export enum Role {
  SUPER_ADMIN = 'super_admin',
  DEPT_ADMIN = 'dept_admin',
  FACULTY = 'faculty',
}

export enum Designation {
  PROFESSOR = 'Professor',
  ASSOCIATE_PROFESSOR = 'Associate Professor',
  ASSISTANT_PROFESSOR = 'Assistant Professor',
}

export enum EmploymentType {
  PERMANENT = 'Permanent',
  CONTRACT = 'Contract',
  VISITING = 'Visiting',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum TermStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum AllocationStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED_TO_SUPER_ADMIN = 'escalated_to_super_admin',
}

export enum ApprovalStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PENDING_HOD_REVIEW = 'pending_hod_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED_FOR_CLARIFICATION = 'returned_for_clarification',
  ESCALATED_TO_SUPER_ADMIN = 'escalated_to_super_admin',
  REASSIGNED = 'reassigned',
}

export enum ApprovalEntityType {
  ALLOCATION = 'allocation',
  STUDENT_STRENGTH = 'student_strength',
  BATCH_CHANGE = 'batch_change',
}

export enum NotificationType {
  APPROVAL_UPDATE = 'approval_update',
  SLA_ESCALATION = 'sla_escalation',
  ACCOUNT_STATUS = 'account_status',
  ALLOCATION_OVERRIDE = 'allocation_override',
}

export enum AuditAction {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_ACTIVATED = 'account_activated',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  ROLE_CHANGED = 'role_changed',
  CONFLICT_OVERRIDE = 'conflict_override',
  NORMS_CHANGED = 'norms_changed',
  RECORD_CREATED = 'record_created',
  RECORD_UPDATED = 'record_updated',
  RECORD_DELETED = 'record_deleted',
}
