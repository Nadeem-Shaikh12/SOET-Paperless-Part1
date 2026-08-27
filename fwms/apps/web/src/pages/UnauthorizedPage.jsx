import { AccessDenied } from '../components/ui/AccessDenied';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="glass max-w-md w-full p-8 rounded-2xl shadow-xl">
        <AccessDenied message="You do not have permission to access this resource." />
      </div>
    </div>
  );
}
