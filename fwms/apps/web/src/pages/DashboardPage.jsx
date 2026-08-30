import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { apiClient } from '../lib/api-client';
import { SuperAdminDashboard } from '../components/dashboard/SuperAdminDashboard';
import { HodDashboard } from '../components/dashboard/HodDashboard';
import { FacultyDashboard } from '../components/dashboard/FacultyDashboard';
import { FilterBar } from '../components/dashboard/FilterBar';
import { BeatLoader } from 'react-spinners';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 14) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    async function fetchDashboard() {
      if (!user) return;
      setLoading(true);
      try {
        let endpoint = '';
        if (user.role === 'super_admin') endpoint = '/dashboard/superadmin'; else
          if (user.role === 'dept_admin') endpoint = '/dashboard/hod'; else
            endpoint = '/dashboard/faculty';

        // Pass filters to backend if needed (e.g. termId)
        const termId = searchParams.get('termId');
        const query = termId ? `?termId=${termId}` : '';
        const res = await apiClient(`${endpoint}${query}`);
        setData(res);
      } catch (err) {
        console.error('Error fetching dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [user, searchParams]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>
            {getGreeting()}, {user?.name}
          </h1>
          <p className="text-[var(--color-slate)] mt-1 text-sm md:text-base">
            Here&apos;s an overview of your workload and pending tasks.
          </p>
        </div>
      </div>

      <FilterBar role={user.role} />

      {loading ?
        <div className="flex items-center justify-center h-64">
          <BeatLoader color="var(--color-carbon)" size={15} />
        </div> :
        <>
          {user.role === 'super_admin' && <SuperAdminDashboard data={data} />}
          {user.role === 'dept_admin' && <HodDashboard data={data} />}
          {user.role === 'faculty' && <FacultyDashboard data={data} />}
        </>
      }
    </div>
  );
}