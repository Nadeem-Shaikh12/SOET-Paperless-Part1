import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import FacultySchedulePage from './pages/FacultySchedulePage';

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/institutional" element={<InstitutionalPage />} />
          <Route path="/master-data" element={<MasterDataPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/allocations" element={<AllocationsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/faculty-schedule" element={<FacultySchedulePage />} />
          <Route path="/workload-report" element={<WorkloadReportPage />} />
          <Route path="/workload-report/ingest" element={<WorkloadIngestPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}