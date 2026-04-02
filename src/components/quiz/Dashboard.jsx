import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { examApi } from '../../api/client';
import {
  BookOpen, Trophy, TrendingUp, Target,
  ChevronRight, Database, Zap, Cloud,
  AlertTriangle, RefreshCw, Shield,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    sky:    'text-sky-400    bg-sky-400/10',
    green:  'text-green-400  bg-green-400/10',
    amber:  'text-amber-400  bg-amber-400/10',
    violet: 'text-violet-400 bg-violet-400/10',
  };
  return (
    <div className="stat-card animate-fade-up">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] || colors.sky}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-display font-bold text-white mt-1">{value}</div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>{label}</div>
      {sub && <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--muted)', opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sets,    setSets]    = useState([]);
  const [sessions,setSessions]= useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [s, sess] = await Promise.all([examApi.list(), examApi.mySessions()]);
      setSets(s.examSets || []);
      setSessions(sess.sessions || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const total   = sessions.length;
  const avg     = total ? Math.round(sessions.reduce((a, s) => a + s.pct, 0) / total) : 0;
  const best    = total ? Math.max(...sessions.map(s => s.pct)) : 0;
  const passed  = sessions.filter(s => s.pct >= 70).length;

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <span className="spinner w-6 h-6" />
    </div>
  );

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center gap-2 mb-1.5">
          <Cloud className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            CloudDeck · MongoDB Atlas · Netlify Functions
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
          Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.username}</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {isAdmin
            ? 'Administrator — full platform access · data replicated across Atlas zones'
            : 'Your AWS certification progress — synced across all devices via Atlas'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl animate-fade-in"
             style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)' }}>
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-300 flex-1">{error}</span>
          <button onClick={load} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--red)' }}>
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard icon={BookOpen}   label="Exam Sets"   value={sets.length}                         sub="available"          color="sky" />
        <StatCard icon={Target}     label="Sessions"    value={total}                               sub="completed"          color="violet" />
        <StatCard icon={TrendingUp} label="Avg Score"   value={total ? `${avg}%` : '—'}             sub="all sessions"       color="amber" />
        <StatCard icon={Trophy}     label="Best Score"  value={total ? `${best}%` : '—'}            sub="personal best"      color="green" />
      </div>

      {/* Exam sets */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">Available Exam Sets</h2>
          <button onClick={() => navigate('/exams')}
            className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--accent)' }}>
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          {sets.map((set, i) => {
            const setSess  = sessions.filter(s => (s.examSetId?._id || s.examSetId) === set._id);
            const lastPct  = setSess[0]?.pct ?? null;
            const hasC2    = set.tags?.includes('ChooseTwo');
            return (
              <div key={set._id}
                className="card p-5 cursor-pointer hover:border-zinc-700 transition-all duration-200 group"
                style={{ animationDelay: `${i * 55}ms` }}
                onClick={() => navigate(`/exams/${set._id}`)}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors text-sm leading-snug">
                      {set.title}
                    </h3>
                    {set.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{set.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 text-zinc-600 group-hover:text-sky-400 transition-colors" />
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="badge badge-sky">{set.category}</span>
                  {hasC2 && <span className="badge badge-amber">⬡ Choose Two</span>}
                  {set.tags?.filter(t => t !== 'ChooseTwo').slice(0, 2).map(t => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3 h-3" />{set.questionCount} questions
                  </span>
                  {lastPct !== null && (
                    <span className={`font-mono font-medium ${lastPct >= 80 ? 'text-green-400' : lastPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      Last: {lastPct}%
                    </span>
                  )}
                </div>
                {lastPct !== null && (
                  <div className="progress-track mt-2.5">
                    <div className="progress-fill" style={{ width: `${lastPct}%` }} />
                  </div>
                )}
              </div>
            );
          })}

          {sets.length === 0 && (
            <div className="card p-10 text-center md:col-span-2">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No exam sets yet.</p>
              {isAdmin && (
                <button onClick={() => navigate('/admin/import')} className="btn-primary mt-4 mx-auto text-xs">
                  Import Questions
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-semibold text-lg text-white mb-4">Recent Sessions</h2>
          <div className="card overflow-hidden">
            {sessions.slice(0, 5).map((s, i) => (
              <div key={s._id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/25 transition-colors"
                style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-200 truncate">{s.examSetId?.title || 'Unknown Set'}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted)' }}>
                    {new Date(s.completedAt).toLocaleDateString()} · {s.score}/{s.total} correct
                  </div>
                </div>
                <div className={`font-display font-bold text-xl ml-4 ${s.pct >= 80 ? 'text-green-400' : s.pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {s.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture note */}
      <div className="px-4 py-3.5 rounded-xl flex items-start gap-3"
           style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)' }}>
        <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          <span className="text-zinc-300 font-medium">Serverless architecture</span> — this app runs on
          Netlify Functions (no servers to manage) with MongoDB Atlas automatically replicating data
          across multiple availability zones. Data is retrieved permanently across mobile and PC devices.
        </p>
      </div>
    </div>
  );
}
