/**
 * React components for Zhuzh
 * Export all shared components
 */

// Layout
export { AppShell } from './AppShell';
export { Sidebar } from './Sidebar';

// Dashboards
export { CompanyDashboard } from './CompanyDashboard';
export { BudgetDashboard } from './BudgetDashboard';
export { BudgetCard } from './BudgetCard';

// Approvals
export { ApprovalQueue } from './ApprovalQueue';
export { ApprovalCard } from './ApprovalCard';
export { RejectionDialog } from './RejectionDialog';

// Audit Trail
export { AuditTimeline } from './AuditTimeline';
export { AuditTrailModal, ProjectAuditTrailModal } from './AuditTrailModal';

// Timesheet
export { ConfirmModal } from './ConfirmModal';
export { TimeEntryRow } from './TimeEntryRow';
export { AddUnplannedWorkModal } from './AddUnplannedWorkModal';

// Shared
export * from './shared';

// Reports
export * from './reports';

// Phase & Drill-Down
export { PhaseBreakdown } from './PhaseBreakdown';
export { ProjectDrillDown } from './ProjectDrillDown';
export { ProjectDetailModal } from './ProjectDetailModal';

// Team
export { TeamMemberModal } from './TeamMemberModal';
export { FreelancerCard } from './FreelancerCard';

// Time Tracking
export { TimeTrackerWidget } from './TimeTrackerWidget';

// Loading Animations
export {
  ZhuzhPageLoader,
  ZhuzhDreidelSpinner,
  ZhuzhWheelSpinner,
  ZhuzhProgressOverlay,
  ZhuzhModuleLoader,
  ZhuzhInlineLoader,
  ZhuzhSectionLoader,
  ZhuzhCardLoader,
} from './ZhuzhPageLoader';
