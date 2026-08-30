import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';



export function DataTable({
  columns,
  data,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  onRowClick,
  actions,
  emptyMessage = 'No data found.'
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
    searchKeys.some((key) => {
      const val = row[key];
      return val != null && String(val).toLowerCase().includes(q);
    })
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {searchKeys.length > 0 &&
      <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
          <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-inputs)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-carbon)] transition-all" />
        
        </div>
      }

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-cards)] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) =>
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-slate)] ${
                col.sortable ? 'cursor-pointer select-none hover:text-[var(--color-carbon)] transition-colors' : ''}`
                }
                onClick={() => col.sortable && handleSort(col.key)}>
                
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              )}
              {actions && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-slate)]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.length === 0 ?
            <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-[var(--color-slate)]">
                  {emptyMessage}
                </td>
              </tr> :

            sorted.map((row, idx) =>
            <tr
              key={idx}
              className={`transition-colors hover:bg-[var(--surface-hover)] ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}>
              
                  {columns.map((col) =>
              <td key={col.key} className="px-4 py-3.5 text-[var(--foreground)] whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
              )}
                  {actions &&
              <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
              }
                </tr>
            )
            }
          </tbody>
        </table>
      </div>
    </div>);

}