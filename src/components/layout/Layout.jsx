import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Cloud, LayoutDashboard, BookOpen, Activity, Upload, Users, ScrollText, Menu, X, LogOut, Shield } from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/exams',     icon: BookOpen,         label: 'Practice Exams' },
  { to: '/progress',  icon: Activity,          label: 'My Progress' },
];
const ADMIN_NAV = [
  { to: '/admin/import', icon: Upload,     label: 'Bulk Import' },
  { to: '/admin/users',  icon: Users,      label: 'Users' },
  { to: '/admin/logs',   icon: ScrollText, label: 'Audit Logs' },
];

function Item({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
      <Icon className="w-4 h-4 shrink-0" />{label}
    </NavLink>
  );
}

function SidebarContent({ onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <Cloud className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <div className="font-display font-bold text-white text-sm">CloudDeck</div>
          <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>Netlify + Atlas</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-zinc-800 md:hidden" style={{ color: 'var(--muted)' }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="label px-2 mb-2">Navigation</p>
        {NAV.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
        {isAdmin && (
          <>
            <p className="label px-2 mt-5 mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3" style={{ color: 'var(--amber)' }} />Admin
            </p>
            {ADMIN_NAV.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
             style={{ background: 'var(--surf2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
          <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>Atlas · Connected</span>
        </div>
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-200 truncate">{user?.username}</div>
            <div className="text-xs font-mono" style={{ color: isAdmin ? 'var(--amber)' : 'var(--accent)' }}>
              {isAdmin ? '⬡ Admin' : '◦ Student'}
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="p-2 rounded-xl hover:bg-zinc-800 transition-colors" style={{ color: 'var(--muted)' }} title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0"
             style={{ borderRight: '1px solid var(--border)', background: 'var(--surf)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}
             style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden flex flex-col
                        transition-transform duration-300 ease-out
                        ${open ? 'translate-x-0' : '-translate-x-full'}`}
             style={{ background: 'var(--surf)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent onClose={() => setOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3"
             style={{ borderBottom: '1px solid var(--border)', background: 'var(--surf)' }}>
          <button onClick={() => setOpen(true)} className="p-2 rounded-xl hover:bg-zinc-800" style={{ color: 'var(--muted)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <Cloud className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="font-display font-bold text-sm text-white">CloudDeck</span>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
