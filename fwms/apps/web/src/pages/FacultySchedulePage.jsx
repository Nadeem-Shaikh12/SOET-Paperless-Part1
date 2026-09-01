import React from 'react';
import { FacultyScheduleReport } from '../components/dashboard/FacultyScheduleReport';

export default function FacultySchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]" style={{ letterSpacing: '-0.02em' }}>
            Faculty Schedule Report
          </h1>
          <p className="text-[var(--color-slate)] mt-1 text-sm md:text-base">
            Day-wise timeline view of faculty activities and locations.
          </p>
        </div>
      </div>
      
      <FacultyScheduleReport />
    </div>
  );
}
