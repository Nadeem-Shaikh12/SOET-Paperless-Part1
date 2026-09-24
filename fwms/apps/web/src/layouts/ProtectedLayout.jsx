import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { RouteGuard } from '../components/route-guard';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Database,
  FileSpreadsheet,
  CalendarRange,
  FilePenLine
} from
'lucide-react';

export default function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'dept_admin', 'faculty'] },
  { name: 'Institutional Config', href: '/institutional', icon: Settings, roles: ['super_admin'] },
  { name: 'Master Data', href: '/master-data', icon: Database, roles: ['super_admin', 'dept_admin'] },
  { name: 'Subjects & Classes', href: '/subjects', icon: BookOpen, roles: ['super_admin', 'dept_admin'] },
  { name: 'Allocations', href: '/allocations', icon: Calendar, roles: ['super_admin', 'dept_admin', 'faculty'] },
  { name: 'Faculty Schedule', href: '/faculty-schedule', icon: CalendarRange, roles: ['super_admin', 'dept_admin'] },
  { name: 'Schedule Editor',  href: '/schedule-editor',  icon: FilePenLine,   roles: ['super_admin', 'dept_admin'] },
  { name: 'Approvals', href: '/approvals', icon: ClipboardList, roles: ['super_admin', 'dept_admin'] },
  { name: 'Faculty Management', href: '/faculty', icon: Users, roles: ['super_admin', 'dept_admin'] },
  { name: 'Data Fetcher', href: '/data-fetcher', icon: Database, roles: ['super_admin', 'dept_admin', 'faculty'] },
  { name: 'Workload Report', href: '/workload-report', icon: FileSpreadsheet, roles: ['super_admin', 'dept_admin'] }].
  filter((item) => user && item.roles.includes(user.role));

  return (
    <RouteGuard>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        
        {/* Mobile sidebar backdrop */}
        {sidebarOpen &&
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)} />

        }

        {/* Sidebar */}
        <aside className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 bg-[var(--surface)] border-r border-[var(--border)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Sidebar Header — Carbon background */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--border)] bg-[var(--color-carbon)]">
            <span className="text-xl font-bold text-white tracking-tight font-heading" style={{ letterSpacing: '-0.02em' }}>FWMS Portal</span>
            <button className="lg:hidden text-white/70 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive ?
                    "bg-[var(--color-fog)] text-[var(--color-carbon)] font-semibold" :
                    "text-[var(--color-graphite)] hover:bg-[var(--color-fog)] hover:text-[var(--color-carbon)]"
                  )}
                  onClick={() => setSidebarOpen(false)}>
                  
                  <Icon className={clsx("w-5 h-5 mr-3", isActive ? "text-[var(--color-signal-orange)]" : "text-[var(--color-slate)]")} />
                  {item.name}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-signal-orange)]" />}
                </Link>);

            })}
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-carbon)] flex items-center justify-center text-white font-bold text-sm">
                {user?.name.charAt(0)}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{user?.name}</p>
                <p className="text-xs text-[var(--color-slate)] capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-[var(--color-graphite)] rounded-lg hover:bg-[var(--color-fog)] hover:text-[var(--color-carbon)] transition-all">
              
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Topbar — clean, no shadow */}
          <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-[var(--border)] bg-[var(--surface)] z-10">
            <div className="flex items-center">
              <button
                className="lg:hidden p-2 -ml-2 text-[var(--color-graphite)] hover:text-[var(--color-carbon)] rounded-lg hover:bg-[var(--color-fog)] focus:outline-none transition-all"
                onClick={() => setSidebarOpen(true)}>
                
                <Menu className="w-5 h-5" />
              </button>
            </div>
            
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-[var(--background)] p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              {/* React Router renders child routes here via Outlet */}
              <Outlet />
            </div>
          </main>
        </div>

      </div>
    </RouteGuard>);

}