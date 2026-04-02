import { useState, useEffect } from 'react';
import { importApi, examApi } from '../../api/client';
import {
  Upload, FileText, Database, CheckCircle, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Trash2, Loader, Zap, Tag,
} from 'lucide-react';

export default function BulkImport() {
  const [rawText,  setRawText]  = useState('');
  const [metaText, setMetaText] = useState('Category: Cloud Practitioner\nDifficulty: Medium\nVersion: CLF-C02');
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('Cloud Practitioner');
  const [tags,     setTags]     = useState('CLF-C02, Fundamentals');

  const [parsed,   setParsed]   = useState(null);
  const [metadata, setMetadata] = useState({});
  const [stats,    setStats]    = useState(null);
  const [errors,   setErrors]   = useState([]);
  const [sets,     setSets]     = useState([]);

  const [parsing,  setParsing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [apiError, setApiError] = useState('');
  const [showPrev, setShowPrev] = useState(false);

  async function loadSets() {
    try { setSets((await examApi.list()).examSets || []); } catch {}
  }
  useEffect(() => { loadSets(); }, []);

  // Step 1 — parse via Netlify Function (server-side)
  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true); setApiError(''); setSuccess(''); setParsed(null);
    try {
      const r = await importApi.parse(rawText, metaText);
      setParsed(r.parsed); setMetadata(r.metadata || {}); setStats(r.stats); setErrors(r.errors || []);
      setShowPrev(true);
    } catch (err) { setApiError(err.message); }
    finally { setParsing(false); }
  }

  // Step 2 — save to MongoDB Atlas
  async function handleSave() {
    if (!parsed?.length || !title.trim()) return;
    setSaving(true); setApiError(''); setSuccess('');
    try {
      const tagArr = [
        ...tags.split(',').map(t => t.trim()).filter(Boolean),
        ...(stats?.chooseTwoCount > 0 ? ['ChooseTwo'] : []),
      ];
      const r = await examApi.import({
        title: title.trim(), category,
        description: metadata['Description'] || '',
        tags: [...new Set(tagArr)], metadata,
        questions: parsed,
      });
      setSuccess(`✓ ${r.message}`);
      setRawText(''); setParsed(null); setTitle(''); setStats(null);
      loadSets();
    } catch (err) { setApiError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteSet(id, title) {
    if (!confirm(`Delete "${title}" and all its questions?`)) return;
    try { await examApi.delete(id); loadSets(); }
    catch (err) { setApiError(err.message); }
  }

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-4 h-4" style={{ color: 'var(--amber)' }} />
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Admin — Bulk Import
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-white">MongoDB Atlas Question Import</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Raw text is parsed server-side by the Netlify Function and saved permanently to Atlas.
          Actions are logged to the audit collection (CloudTrail-style).
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-5">
        {/* ── Left: Form ── */}
        <div className="md:col-span-3 space-y-4">

          {/* Exam set details */}
          <div className="card p-5 space-y-4">
            <h3 className="font-medium text-zinc-200 text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: 'var(--accent)' }} />Exam Set Details
            </h3>
            <div>
              <label className="label">Set Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="input" placeholder="e.g., AWS Cloud Practitioner Practice Set 2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                  {['Cloud Practitioner','Solutions Architect','Developer','SysOps','DevOps Engineer',
                    'Security Specialty','Machine Learning'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                  className="input" placeholder="CLF-C02, Security" />
              </div>
            </div>
            <div>
              <label className="label">AWS Resource Tags (Key: Value pairs)</label>
              <textarea value={metaText} onChange={e => setMetaText(e.target.value)}
                rows={3} className="input font-mono text-xs resize-none"
                placeholder="Category: Cloud Practitioner&#10;Difficulty: Medium" />
            </div>
          </div>

          {/* Raw text */}
          <div className="card p-5">
            <h3 className="font-medium text-zinc-200 text-sm flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />Raw Question Text
            </h3>
            <div className="mb-3 p-3 rounded-xl text-[11px] font-mono leading-relaxed"
                 style={{ background: 'var(--surf2)', color: 'var(--muted)' }}>
              Supports Q1)–Q64) blocks · ✓ ✔ (correct) symbols · ✗ ✘ (incorrect) · Choose Two auto-detected (2 correct answers) · Explanation:- / Rationale:
            </div>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)}
              rows={14} className="input font-mono text-xs resize-y leading-relaxed"
              placeholder={`Q1) Which is most cost-effective for 10-year medical record archival?
A. Amazon S3 Standard
B. Amazon S3 Intelligent-Tiering
C. Amazon S3 Glacier Deep Archive ✓
D. Amazon EFS

Explanation: S3 Glacier Deep Archive costs ~$0.00099/GB/month...

Q10) Which TWO services replicate data across Regions? (Choose TWO.)
A. Amazon S3 with Cross-Region Replication ✓
B. Amazon EBS Snapshots
C. Amazon DynamoDB Global Tables ✓
D. Amazon ElastiCache

Explanation: S3 CRR and DynamoDB Global Tables both replicate...`} />

            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={handleParse} disabled={!rawText.trim() || parsing} className="btn-ghost flex items-center gap-2">
                {parsing ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {parsing ? 'Parsing…' : 'Parse on Server'}
              </button>
              {parsed?.length > 0 && (
                <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {saving ? 'Saving to Atlas…' : `Save ${parsed.length} Questions`}
                </button>
              )}
            </div>
          </div>

          {/* Feedback */}
          {apiError && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
                 style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#fca5a5' }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{apiError}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                 style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', color: '#86efac' }}>
              <CheckCircle className="w-4 h-4 shrink-0" />{success}
            </div>
          )}
          {errors.length > 0 && (
            <div className="card p-4" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--amber)' }}>
                <AlertCircle className="w-3.5 h-3.5" />{errors.length} parse warning{errors.length !== 1 ? 's' : ''}
              </p>
              <ul className="space-y-1">
                {errors.map((e, i) => <li key={i} className="text-xs font-mono" style={{ color: 'var(--amber)', opacity: 0.8 }}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Preview */}
          {stats && (
            <div className="card overflow-hidden">
              <button onClick={() => setShowPrev(p => !p)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/25 transition-colors">
                <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  {stats.total} questions parsed
                  {stats.chooseTwoCount > 0 && (
                    <span className="badge badge-amber ml-1">⬡ {stats.chooseTwoCount} Choose Two</span>
                  )}
                </span>
                {showPrev ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
              </button>
              {showPrev && parsed && (
                <div className="max-h-72 overflow-y-auto" style={{ borderTop: '1px solid var(--border)' }}>
                  {parsed.map((q, i) => (
                    <div key={i} className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{q.questionNumber}</span>
                        {q.chooseTwo && <span className="badge badge-amber text-[10px] py-0">Choose Two</span>}
                        <span className="text-xs text-zinc-300 truncate">{q.questionText.slice(0, 72)}…</span>
                      </div>
                      <div className="space-y-0.5 pl-2">
                        {q.options.map((o, j) => (
                          <div key={j} className={`text-xs flex items-center gap-1.5 ${o.correct ? 'text-green-400' : 'text-zinc-600'}`}>
                            {o.correct ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0 opacity-40" />}
                            {o.text.slice(0, 58)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Existing sets ── */}
        <div className="md:col-span-2">
          <div className="card p-4 sticky top-6">
            <h3 className="font-medium text-zinc-200 text-sm mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Atlas Sets ({sets.length})
            </h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {sets.map(set => (
                <div key={set._id} className="flex items-start justify-between gap-2 p-3 rounded-xl"
                     style={{ background: 'var(--surf2)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-300 truncate">{set.title}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted)' }}>
                      {set.questionCount}Q · {set.category}
                    </div>
                    {set.tags?.includes('ChooseTwo') && (
                      <span className="badge badge-amber text-[10px] py-0 mt-1">⬡ Choose Two</span>
                    )}
                  </div>
                  <button onClick={() => handleDeleteSet(set._id, set.title)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {sets.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>No sets in Atlas yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
