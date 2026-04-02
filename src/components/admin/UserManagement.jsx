import { useState, useEffect } from 'react';
import { authApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { Users, Shield, ShieldCheck, Check, X, Trash2, Edit3, AlertCircle, RefreshCw } from 'lucide-react';

const PERMS = [
  { key: 'viewExams',       label: 'View Exams' },
  { key: 'takeExams',       label: 'Take Exams' },
  { key: 'importQuestions', label: 'Import' },
  { key: 'manageUsers',     label: 'Manage Users' },
];

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPerms, setEditPerms] = useState({});

  async function load() {
    setLoading(true); setError('');
    try { setUsers((await authApi.users()).users || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(u) { setEditingId(u.id); setEditPerms({ ...(u.permissions || {}) }); }

  async function saveEdit(id) {
    try {
      await authApi.updatePermissions(id, editPerms);
      setEditingId(null); setSuccess('Permissions updated.');
      setTimeout(() => setSuccess(''), 3000); load();
    } catch (err) { setError(err.message); }
  }

  async function deleteUser(id, username) {
    if (username === 'admin1234') { setError('Cannot delete root admin.'); return; }
    if (!confirm(`Delete "${username}"?`)) return;
    try { await authApi.deleteUser(id); load(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4" style={{ color: 'var(--amber)' }} />
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Admin — Identity Management
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Permanent MongoDB accounts — non-explicit deny by default, grant permissions explicitly
        </p>
      </div>

      {/* Security model callout */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl mb-6"
           style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)' }}>
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--amber)' }} />
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--amber)' }}>Strong Identity Foundation</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            <strong className="text-zinc-300">MongoDB/bcrypt</strong> = Security OF the cloud ·
            <strong className="text-zinc-300"> IAM permissions</strong> = Security IN the cloud.
            New accounts start with minimum access — all other permissions require explicit grant.
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm animate-fade-in"
             style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#fca5a5' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm"
             style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', color: '#86efac' }}>
          <Check className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          {loading ? 'Loading…' : `${users.length} User${users.length !== 1 ? 's' : ''}`}
        </h2>
        <button onClick={load} className="btn-ghost text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><span className="spinner w-6 h-6" /></div>}

      {!loading && (
        <div className="card overflow-hidden">
          {users.map((user, i) => {
            const editing = editingId === user.id;
            const perms   = editing ? editPerms : (user.permissions || {});
            const isMe    = user.id === me?.id;
            return (
              <div key={user.id} className="p-5"
                   style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-100">{user.username}</span>
                      <span className={`badge ${user.role === 'admin' ? 'badge-amber' : 'badge-sky'}`}>{user.role}</span>
                      {isMe && <span className="badge badge-zinc">you</span>}
                    </div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted)' }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editing ? (
                      <>
                        <button onClick={() => saveEdit(user.id)}
                          className="p-2 rounded-xl transition-colors"
                          style={{ background: 'rgba(74,222,128,0.1)', color: '#86efac' }}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-2 rounded-xl hover:bg-zinc-700 transition-colors" style={{ color: 'var(--muted)' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {user.role !== 'admin' && (
                          <button onClick={() => startEdit(user)}
                            className="p-2 rounded-xl hover:bg-zinc-700 transition-colors" style={{ color: 'var(--muted)' }}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {user.username !== 'admin1234' && !isMe && (
                          <button onClick={() => deleteUser(user.id, user.username)}
                            className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PERMS.map(({ key, label }) => {
                    const has = user.role === 'admin' ? true : perms[key];
                    const canEdit = editing && user.role !== 'admin';
                    return (
                      <button key={key} disabled={!canEdit}
                        onClick={() => canEdit && setEditPerms(p => ({ ...p, [key]: !p[key] }))}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all duration-150 ${
                          canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                        } ${has
                          ? 'bg-green-400/7 border-green-400/18 text-green-400'
                          : 'text-zinc-600'
                        }`}
                        style={{ background: has ? undefined : 'var(--surf2)', borderColor: has ? undefined : 'var(--border)' }}>
                        {has ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
