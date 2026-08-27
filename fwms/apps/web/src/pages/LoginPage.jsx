import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { LogIn, Loader2, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { loginRequestSchema } from '@fwms/shared';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // If auth state is already determined and user is authenticated, redirect
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Don't show login form if we are still verifying the session on initial load
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-carbon)]" />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setValidationErrors({});

    try {
      // Validate form
      const data = loginRequestSchema.parse({ email, password });
      
      // Perform login
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = {};
        (err.issues ?? (err).errors ?? []).forEach((e) => {
          if (e.path[0]) errors[e.path[0]] = e.message;
        });
        setValidationErrors(errors);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)]">
      {/* Subtle decorative gradient — Ventriloc warm-gray feel */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] rounded-full bg-[var(--color-chalk)] opacity-60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] rounded-full bg-[var(--color-fog)] opacity-50 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="glass w-full max-w-md p-8 md:p-10 rounded-[var(--radius-cards)] relative z-10 mx-4 transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[var(--color-carbon)] rounded-[var(--radius-cards)] flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight" style={{ letterSpacing: '-0.02em' }}>FWMS Portal</h1>
          <p className="text-sm text-[var(--color-slate)] mt-2 text-center">Faculty Workload Management System</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--color-fog)] border-l-4 border-[var(--color-signal-orange)] rounded-r-[var(--radius-sm)]">
            <p className="text-sm text-[var(--color-carbon)] font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-graphite)] mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-[var(--radius-inputs)] border bg-[var(--color-fog)] text-[var(--foreground)] focus:bg-[var(--surface)] transition-all outline-none focus:ring-2 focus:ring-[var(--color-carbon)] ${
                validationErrors.email ? 'border-[var(--color-error)] focus:border-[var(--color-error)]' : 'border-[var(--border)] focus:border-transparent'
              }`}
              placeholder="name@mgm.edu"
              autoComplete="email"
            />
            {validationErrors.email && (
              <p className="text-xs text-[var(--color-error)] mt-1.5">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-graphite)] mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-[var(--radius-inputs)] border bg-[var(--color-fog)] text-[var(--foreground)] focus:bg-[var(--surface)] transition-all outline-none focus:ring-2 focus:ring-[var(--color-carbon)] ${
                validationErrors.password ? 'border-[var(--color-error)] focus:border-[var(--color-error)]' : 'border-[var(--border)] focus:border-transparent'
              }`}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {validationErrors.password && (
              <p className="text-xs text-[var(--color-error)] mt-1.5">{validationErrors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-[var(--border)] text-[var(--color-carbon)] focus:ring-[var(--color-carbon)] accent-[var(--color-carbon)]" />
              <span className="text-sm text-[var(--color-graphite)]">Remember me</span>
            </label>
            <a href="#" className="text-sm text-[var(--color-carbon)] hover:text-[var(--color-signal-orange)] font-medium transition-colors">
              Forgot password?
            </a>
          </div>

          {/* Filled Pill Button — Carbon background, per Ventriloc spec */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)] text-white font-semibold rounded-[var(--radius-buttons)] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center space-x-2">
                <span>Sign In</span>
                <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[var(--color-slate)] font-medium tracking-wider uppercase">
          Secure portal for MGM University Staff
        </div>
      </div>
    </div>
  );
}
