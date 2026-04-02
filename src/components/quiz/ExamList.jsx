import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../api/client';
import { BookOpen, Search, Database, Tag, ChevronRight, RefreshCw, Filter } from 'lucide-react';

export default function ExamList() {
  const navigate = useNavigate();
  const [sets,    setSets]    = useState([]);
  const [sessions,setSessions]= useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [catFilter, setCatFilter] = useState('All');

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

  const categories = ['All', ...new Set(sets.map(s => s.category).filter(Boolean))];

  const filtered = sets.filter(s => {
    const matchSearch = !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase()) ||
      s.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = catFilter === 'All' || s.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Practice Exams</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Select a set — data fetched from MongoDB Atlas via Netlify Functions
        </p>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, category, or tag…" className="input pl-11" />
        </div>
        {categories.length > 2 && (
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="input pl-10 w-full sm:w-auto appearance-none pr-8">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><span className="spinner w-6 h-6" /></div>}
      {error   && (
        <div className="card p-6 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={load} className="btn-ghost text-xs mx-auto flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {filtered.map(set => {
            const setSess = sessions.filter(s => (s.examSetId?._id || s.examSetId) === set._id);
            const attempts = setSess.length;
            const best = attempts ? Math.max(...setSess.map(s => s.pct)) : null;
            const hasC2 = set.tags?.includes('ChooseTwo');
            return (
              <div key={set._id}
                className="card p-5 cursor-pointer hover:border-zinc-700 transition-all duration-200 group"
                onClick={() => navigate(`/exams/${set._id}`)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                      {set.title}
                    </h3>
                    {set.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>
                        {set.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <span className="badge badge-sky"><Tag className="w-3 h-3" />{set.category}</span>
                      {hasC2 && <span className="badge badge-amber">⬡ Choose Two</span>}
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                        <Database className="w-3 h-3" />{set.questionCount} questions
                      </span>
                      {attempts > 0 && (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          {attempts} attempt{attempts !== 1 ? 's' : ''}
                        </span>
                      )}
                      {best !== null && (
                        <span className={`text-xs font-mono font-medium ${best >= 80 ? 'text-green-400' : best >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          Best: {best}%
                        </span>
                      )}
                    </div>
                    {set.tags?.filter(t => t !== 'ChooseTwo').length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {set.tags.filter(t => t !== 'ChooseTwo').slice(0, 5).map(t => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 text-zinc-600 group-hover:text-sky-400 transition-colors" />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-10 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {search || catFilter !== 'All' ? 'No results — try a different filter.' : 'No exam sets available yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
