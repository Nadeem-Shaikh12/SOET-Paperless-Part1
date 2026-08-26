import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

export function FilterBar({ role }: { role?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [terms, setTerms] = useState<any[]>([]);

  useEffect(() => {
    apiClient<any[]>('/institutional/academic-terms')
      .then((res) => {
        setTerms(res);
        // If there's no termId search parameter and we have an active term, set it
        const currentParam = searchParams.get('termId');
        if (!currentParam) {
          const activeTerm = res.find((t) => t.status === 'active') || res[0];
          if (activeTerm) {
            navigate(`${pathname}?termId=${activeTerm.id}`, { replace: true });
          }
        }
      })
      .catch((err) => console.error('Failed to load terms in FilterBar', err));
  }, [pathname, navigate, searchParams]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const selectClass = "text-sm border border-[var(--border)] rounded-[var(--radius-inputs)] px-3 py-1.5 bg-[var(--color-fog)] text-[var(--color-graphite)] outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all";

  const activeTermValue = searchParams.get('termId') || terms.find((t) => t.status === 'active')?.id?.toString() || terms[0]?.id?.toString() || '';

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 bg-[var(--surface)] p-4 rounded-[var(--radius-cards)] border border-[var(--border)] mb-6">
      <div className="flex items-center text-[var(--color-slate)] mr-2">
        <Filter className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      <select 
        className={selectClass}
        value={activeTermValue}
        onChange={(e) => navigate(`${pathname}?${createQueryString('termId', e.target.value)}`)}
      >
        {terms.length === 0 ? (
          <option value="">Loading terms...</option>
        ) : (
          terms.map((t) => (
            <option key={t.id} value={t.id.toString()}>
              {t.semester} Semester, {t.academicYear} {t.status === 'active' ? '(Active)' : ''}
            </option>
          ))
        )}
      </select>

      {role !== 'faculty' && (
        <>
          <select 
            className={selectClass}
            value={searchParams.get('designation') || ''}
            onChange={(e) => navigate(`${pathname}?${createQueryString('designation', e.target.value)}`)}
          >
            <option value="">All Designations</option>
            <option value="Professor">Professor</option>
            <option value="Associate_Professor">Associate Professor</option>
            <option value="Assistant_Professor">Assistant Professor</option>
          </select>

          <select 
            className={selectClass}
            value={searchParams.get('status') || ''}
            onChange={(e) => navigate(`${pathname}?${createQueryString('status', e.target.value)}`)}
          >
            <option value="">All Statuses</option>
            <option value="overloaded">Overloaded (Red)</option>
            <option value="normal">Normal (Green)</option>
            <option value="underloaded">Underloaded (Yellow)</option>
          </select>
        </>
      )}
    </div>
  );
}
