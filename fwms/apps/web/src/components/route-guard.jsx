import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { Loader2, KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';

function ForcePasswordChange() {
  const { logout } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      });
      setSuccessMsg('Password changed successfully! Logging out...');
      setTimeout(async () => {
        await logout();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)] p-4">
      {/* Subtle decorative elements */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] rounded-full bg-[var(--color-chalk)] opacity-60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] rounded-full bg-[var(--color-fog)] opacity-50 blur-[120px] pointer-events-none" />

      <div className="glass w-full max-w-md p-8 md:p-10 rounded-[var(--radius-cards)] relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-[var(--color-carbon)] rounded-[var(--radius-cards)] flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] text-center" style={{ letterSpacing: '-0.02em' }}>Update Your Password</h1>
          <p className="text-sm text-[var(--color-slate)] mt-2 text-center">
            For security reasons, you must change your temporary password before accessing the system.
          </p>
        </div>

        {errorMsg &&
        <div className="mb-6 p-4 bg-[var(--color-fog)] border-l-4 border-[var(--color-error)] rounded-r-[var(--radius-sm)] flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-carbon)] font-medium">{errorMsg}</p>
          </div>
        }

        {successMsg &&
        <div className="mb-6 p-4 bg-[var(--color-fog)] border-l-4 border-[var(--color-success)] rounded-r-[var(--radius-sm)] flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-carbon)] font-medium">{successMsg}</p>
          </div>
        }

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-graphite)] mb-2" htmlFor="new-password">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] focus:bg-[var(--surface)] transition-all outline-none focus:ring-2 focus:ring-[var(--color-carbon)]"
                placeholder="Minimum 8 characters"
                required
                disabled={isSubmitting || !!successMsg} />
              
              <Lock className="w-5 h-5 text-[var(--color-slate)] absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-graphite)] mb-2" htmlFor="confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--color-fog)] text-[var(--foreground)] focus:bg-[var(--surface)] transition-all outline-none focus:ring-2 focus:ring-[var(--color-carbon)]"
                placeholder="Re-enter new password"
                required
                disabled={isSubmitting || !!successMsg} />
              
              <Lock className="w-5 h-5 text-[var(--color-slate)] absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !!successMsg}
            className="w-full py-3 px-4 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] text-white font-semibold rounded-[var(--radius-buttons)] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed">
            
            <span className="flex items-center space-x-2">
              {isSubmitting ?
              <Loader2 className="w-5 h-5 animate-spin" /> :

              <span>Change Password & Sign In</span>
              }
            </span>
          </button>
        </form>
      </div>
    </div>);

}

// Maps URL path prefixes to which roles are allowed to visit them.
// Any authenticated user not in the allowed list is redirected to /unauthorized.
const ROUTE_ROLE_MAP = [
{ prefix: '/institutional', roles: ['super_admin'] },
{ prefix: '/master-data', roles: ['super_admin', 'dept_admin'] },
{ prefix: '/subjects', roles: ['super_admin', 'dept_admin'] },
{ prefix: '/approvals', roles: ['super_admin', 'dept_admin'] },
{ prefix: '/faculty', roles: ['super_admin', 'dept_admin'] },
{ prefix: '/workload-report', roles: ['super_admin', 'dept_admin'] },
{ prefix: '/allocations', roles: ['super_admin', 'dept_admin', 'faculty'] },
{ prefix: '/dashboard', roles: ['super_admin', 'dept_admin', 'faculty'] }];


export function RouteGuard({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Determine allowed roles for this path from the map (takes precedence over prop)
  const routeRule = ROUTE_ROLE_MAP.find((r) => pathname.startsWith(r.prefix));
  const effectiveAllowedRoles = allowedRoles ?? routeRule?.roles;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(pathname)}`, { replace: true });
    } else if (!isLoading && isAuthenticated && effectiveAllowedRoles && user) {
      if (!effectiveAllowedRoles.includes(user.role)) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, navigate, pathname, effectiveAllowedRoles, user]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" />
      </div>);

  }

  // Force password change takes precedence over rendering children or checking role
  if (user?.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  // Role check during render
  if (effectiveAllowedRoles && user && !effectiveAllowedRoles.includes(user.role)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}