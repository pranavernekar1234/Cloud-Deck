import { useState, useEffect } from 'react';
import { examApi } from '../../api/client';
import { Activity, Trophy, TrendingUp, Target, RefreshCw } from 'lucide-react';

export default function ProgressPage() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setSessions((await examApi.mySessions()).sessions || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const total  = sessions.length;
  const avg    = total ? Math.round(sessions.reduce((a, s) => a + s.pct, 0) / total) : 0;
  const best   = total ? Math.max(...sessions.map(s => s.pct)) : 0;
  const passed = sessions.filter(s => s.pct >= 70).length;

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">My Progress</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Session history — permanently stored in MongoDB Atlas, available across all devices
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Sessions',    value: total,                     icon: Activity,   c: 'text-sky-400' },
          { label: 'Average',     value: total ? `${avg}%` : '—',  icon: TrendingUp, c: 'text-violet-400' },
          { label: 'Best',        value: total ? `${best}%` : '—', icon: Trophy,     c: 'text-amber-400' },
          { label: 'Passed ≥70%', value: passed,                    icon: Target,     c: 'text-green-400' },
        ].map(({ label, value, icon: Icon, c }) => (
          <div key={label} className="stat-card animate-fade-up">
            <Icon className={`w-5 h-5 ${c}`} />
            <div className="text-2xl font-display font-bold text-white">{value}</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-lg text-white">Session History</h2>
        <button onClick={load} className="btn-ghost text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><span className="spinner w-6 h-6" /></div>}
      {error   && <p className="text-sm text-red-400 text-center py-6">{error}</p>}

      {!loading && sessions.length === 0 && (
        <div className="card p-10 text-center">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No sessions yet — take a practice exam to see your history.
          </p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="card overflow-hidden">
          {sessions.map((s, i) => (
            <div key={s._id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/25 transition-colors"
              style={{ borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">{s.examSetId?.title || 'Unknown Set'}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted)' }}>
                  {new Date(s.completedAt).toLocaleString()} · {s.score}/{s.total} correct
                </div>
                <div className="progress-track mt-2 max-w-[180px]">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    s.pct >= 80 ? 'bg-green-400' : s.pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
                  }`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
              <div className={`font-display font-bold text-xl shrink-0 ${
                s.pct >= 80 ? 'text-green-400' : s.pct >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>{s.pct}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
