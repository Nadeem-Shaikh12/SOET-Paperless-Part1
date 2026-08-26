type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  error: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-[var(--color-fog)] text-[var(--color-graphite)] ring-[var(--color-chalk)]',
  accent: 'bg-[#ff682c]/10 text-[#ff682c] ring-[#ff682c]/20',
};

// Maps common status strings to visual variants
const statusVariantMap: Record<string, BadgeVariant> = {
  active: 'success',
  approved: 'success',
  inactive: 'neutral',
  draft: 'info',
  pending_approval: 'warning',
  rejected: 'error',
  archived: 'neutral',
};

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  /** Auto-map a status string to a variant */
  status?: string;
};

export function Badge({ children, variant, status }: BadgeProps) {
  const resolvedVariant = variant || (status ? statusVariantMap[status] || 'neutral' : 'neutral');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-tags)] text-xs font-semibold ring-1 ring-inset ${variantClasses[resolvedVariant]}`}
    >
      {children}
    </span>
  );
}
