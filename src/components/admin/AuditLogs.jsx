import { useState, useEffect } from 'react';
import { logsApi } from '../../api/client';
import { ScrollText, RefreshCw, Shield, CheckCircle, XCircle, Filter } from 'lucide-react';

const ACTION_COLORS = {
  LOGIN:                   'badge-sky',
  REGISTER:                'badge-green',
  IMPORT_QUESTIONS:        'badge-amber',
  DELETE_EXAM_SET:         'badge-red',
  DELETE_USER:             'badge-red',
  UPDATE_USER_PERMISSIONS: 'badge-violet',
  LOGOUT:                  'badge-zinc',
};

export default function AuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setLogs((await logsApi.list()).logs || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    !filter ||
    l.actor?.toLowerCase().includes(filter.toLowerCase()) ||
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.resource?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ScrollText className="w-4 h-4" style={{ color: 'var(--amber)' }} />
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Admin — CloudTrail-style Audit
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-white">Audit Logs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          All admin import actions and auth events are logged to the MongoDB <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surf2)' }}>auditlogs</code> collection —
          mimicking AWS CloudTrail governance.
        </p>
      </div>

      {/* CloudTrail info card */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl mb-6"
           style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)' }}>
        <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          <span className="text-zinc-300 font-medium">Real-time traceability</span> — every admin action
          (imports, user changes, deletions) is recorded with actor, timestamp, IP address, and user agent.
          This provides a complete audit trail equivalent to AWS CloudTrail's API activity log.
        </div>
      </div>

      {/* Filter + refresh */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter by actor, action, or resource…" className="input pl-10" />
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-1.5 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><span className="spinner w-6 h-6" /></div>}
      {error   && <p className="text-sm text-red-400 text-center py-4">{error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="card p-10 text-center">
          <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {filter ? 'No matching log entries.' : 'No audit events recorded yet.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              Showing {filtered.length} of {logs.length} events
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>Latest first</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map(log => (
              <div key={log._id} className="px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {log.success
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    }
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-zinc'}`}>
                      {log.action}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{log.actor}</span>
                    {log.resource && (
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>→ {log.resource}</span>
                    )}
                  </div>
                  <span className="text-xs font-mono shrink-0" style={{ color: 'var(--muted)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                {log.detail && Object.keys(log.detail).length > 0 && (
                  <div className="mt-2 pl-6 text-xs font-mono" style={{ color: 'var(--muted)' }}>
                    {JSON.stringify(log.detail)}
                  </div>
                )}

                <div className="mt-1.5 pl-6 flex items-center gap-3 flex-wrap text-[11px] font-mono" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                  {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                  {log.userAgent && <span className="truncate max-w-[300px]">{log.userAgent.slice(0, 60)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
