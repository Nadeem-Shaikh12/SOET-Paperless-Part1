import { ShieldAlert } from 'lucide-react';

export function AccessDenied({ message = 'You do not have permission to view this page.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-[var(--color-fog)] rounded-[var(--radius-cards)] flex items-center justify-center text-[var(--color-signal-orange)] mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight" style={{ letterSpacing: '-0.02em' }}>Access Denied</h2>
      <p className="text-sm text-[var(--color-slate)] mt-2 max-w-sm">{message}</p>
    </div>
  );
}
