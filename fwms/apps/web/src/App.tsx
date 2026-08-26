import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth';
import ProtectedLayout from './layouts/ProtectedLayout';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardPage from './pages/DashboardPage';
import InstitutionalPage from './pages/InstitutionalPage';
import MasterDataPage from './pages/MasterDataPage';
import SubjectsPage from './pages/SubjectsPage';
import AllocationsPage from './pages/AllocationsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import FacultyPage from './pages/FacultyPage';
import WorkloadReportPage from './pages/WorkloadReportPage';
import WorkloadIngestPage from './pages/WorkloadIngestPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/institutional',
        element: <InstitutionalPage />,
      },
      {
        path: '/master-data',
        element: <MasterDataPage />,
      },
      {
        path: '/subjects',
        element: <SubjectsPage />,
      },
      {
        path: '/allocations',
        element: <AllocationsPage />,
      },
      {
        path: '/approvals',
        element: <ApprovalsPage />,
      },
      {
        path: '/faculty',
        element: <FacultyPage />,
      },
      {
        path: '/workload-report',
        element: <WorkloadReportPage />,
      },
      {
        path: '/workload-report/ingest',
        element: <WorkloadIngestPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <RouterProvider router={router} />;
}
