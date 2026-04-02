import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi } from '../../api/client';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Lightbulb, Trophy, RotateCcw, Home,
  AlertCircle, MousePointerClick,
} from 'lucide-react';

// ─── Choose Two state machine ──────────────────────────────────────────────────
//
// Each "Choose Two" question has three phases:
//   'picking'  → no selections yet
//   'partial'  → exactly one correct answer found; awaiting the second
//   'done'     → both correct answers found → lock UI, show explanation
//
// Wrong picks: locked red immediately; user can still find the correct two.
// The "Next" button only unlocks when:
//   - Single-select: user has clicked any option
//   - Choose Two: phase === 'done' (both correct selections made)
//
// ─────────────────────────────────────────────────────────────────────────────

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Visual state resolver for a single option button ──────────────────────────
function resolveOptionClass(option, index, ans, isChooseTwo) {
  if (!ans) return 'option-btn';

  if (isChooseTwo) {
    const { selectedIndices = [], lockedIndices = [], phase } = ans;
    if (phase === 'done') {
      if (option.correct)                   return 'option-btn option-correct';
      if (lockedIndices.includes(index))    return 'option-btn option-incorrect';
      return 'option-btn option-dimmed';
    }
    if (lockedIndices.includes(index))      return 'option-btn option-incorrect';
    if (selectedIndices.includes(index))    return 'option-btn option-selected';
    return 'option-btn';
  }

  // Single-select
  const { selectedIndex, answered } = ans;
  if (!answered) return 'option-btn';
  if (option.correct)                      return 'option-btn option-correct';
  if (index === selectedIndex)             return 'option-btn option-incorrect';
  return 'option-btn option-dimmed';
}

function resolveIcon(option, index, ans, isChooseTwo) {
  if (!ans) return null;
  if (isChooseTwo) {
    const { lockedIndices = [], selectedIndices = [], phase } = ans;
    if (phase === 'done' && option.correct)
      return <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />;
    if (lockedIndices.includes(index))
      return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    if (selectedIndices.includes(index) && !lockedIndices.includes(index))
      return <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />;
    return null;
  }
  const { selectedIndex, answered } = ans;
  if (!answered) return null;
  if (option.correct) return <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />;
  if (index === selectedIndex) return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  return null;
}

// ── Choose Two banner ──────────────────────────────────────────────────────────
function C2Banner({ phase }) {
  const messages = {
    picking: 'Select your FIRST answer — you must find both correct options.',
    partial: '✓ First correct answer found! Now select the second one.',
    done:    '✓ Both correct answers selected!',
  };
  return (
    <div className="choose-two-pill mb-4 w-fit">
      <MousePointerClick className="w-3.5 h-3.5" />
      Choose TWO — {messages[phase]}
    </div>
  );
}

// ── Explanation box ────────────────────────────────────────────────────────────
function ExplanationBox({ text, isCorrect }) {
  return (
    <div className={`explanation-box mt-5 rounded-xl border p-4 md:p-5 ${
      isCorrect ? 'bg-green-400/5 border-green-400/15' : 'bg-amber-400/5 border-amber-400/15'
    }`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Lightbulb className={`w-4 h-4 shrink-0 ${isCorrect ? 'text-green-400' : 'text-amber-400'}`} />
        <span className={`text-[11px] font-medium uppercase tracking-wider ${isCorrect ? 'text-green-400' : 'text-amber-400'}`}>
          {isCorrect ? 'Correct! — ' : 'Study Note — '}Explanation
        </span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>
    </div>
  );
}

// ── Score summary ──────────────────────────────────────────────────────────────
function ScoreSummary({ score, total, pct, title, onRetry, onBack }) {
  const grade = pct >= 90 ? 'Outstanding' : pct >= 80 ? 'Great Work' : pct >= 70 ? 'Passed' : pct >= 60 ? 'Almost There' : 'Keep Studying';
  const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
  const ring  = pct >= 80 ? 'border-green-400/40' : pct >= 60 ? 'border-amber-400/40' : 'border-red-400/40';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 md:p-10">
      <div className="score-ring">
        <div className={`w-36 h-36 rounded-full border-4 ${ring} flex flex-col items-center justify-center mx-auto mb-6`}>
          <span className={`text-4xl font-display font-bold ${color}`}>{pct}%</span>
          <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{score}/{total}</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-1">{grade}!</h2>
        <p className="text-sm mb-1.5" style={{ color: 'var(--muted)' }}>{title}</p>
        <p className="text-xs font-mono mb-8" style={{ color: 'var(--muted)' }}>
          {pct >= 70 ? '✓ Above 70% passing threshold' : '✗ Below passing threshold — review explanations'}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={onRetry} className="btn-ghost flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
          <button onClick={onBack} className="btn-primary flex items-center gap-2">
            <Home className="w-4 h-4" /> Back to Exams
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function QuizInterface() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [examSet,   setExamSet]   = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers,    setAnswers]    = useState({}); // { [qIdx]: answerState }
  const [finished,     setFinished]     = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [saveError,    setSaveError]    = useState('');

  // ── Load exam data via Netlify Function → Atlas ───────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const r = await examApi.get(id);
        setExamSet(r.examSet);
        setQuestions(r.questions || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const total   = questions.length;
  const current = questions[currentIdx];

  // ── Answer state helpers ─────────────────────────────────────────────────
  function getAns(idx) {
    const q = questions[idx];
    if (!q || !answers[idx]) {
      return q?.chooseTwo
        ? { selectedIndices: [], lockedIndices: [], phase: 'picking' }
        : { selectedIndex: null, answered: false };
    }
    return answers[idx];
  }

  const currentAns = getAns(currentIdx);
  const isComplete = current?.chooseTwo
    ? currentAns.phase === 'done'
    : currentAns.answered;

  // ── Single-select handler ─────────────────────────────────────────────────
  function handleSingle(optIdx) {
    if (answers[currentIdx]?.answered) return;
    setAnswers(p => ({ ...p, [currentIdx]: { selectedIndex: optIdx, answered: true } }));
  }

  // ── Choose Two state machine ──────────────────────────────────────────────
  function handleChooseTwo(optIdx) {
    const q   = questions[currentIdx];
    const ans = getAns(currentIdx);
    const { selectedIndices, lockedIndices, phase } = ans;

    if (phase === 'done') return;

    const opt = q.options[optIdx];

    // Already locked or already correctly selected — ignore re-click
    if (lockedIndices.includes(optIdx)) return;
    if (selectedIndices.includes(optIdx)) return;

    if (!opt.correct) {
      // Wrong pick → lock it red; user must keep trying
      setAnswers(p => ({
        ...p,
        [currentIdx]: { ...ans, lockedIndices: [...lockedIndices, optIdx] },
      }));
      return;
    }

    // Correct pick
    const newSelected = [...selectedIndices, optIdx];
    if (newSelected.length === 1) {
      // First correct found → partial phase
      setAnswers(p => ({
        ...p,
        [currentIdx]: { ...ans, selectedIndices: newSelected, phase: 'partial' },
      }));
    } else {
      // Both correct found → done
      setAnswers(p => ({
        ...p,
        [currentIdx]: { ...ans, selectedIndices: newSelected, phase: 'done' },
      }));
    }
  }

  const handleClick = current?.chooseTwo ? handleChooseTwo : handleSingle;

  // ── Navigation ────────────────────────────────────────────────────────────
  function goNext() {
    if (currentIdx < total - 1) setCurrentIdx(i => i + 1);
    else setFinished(true);
  }
  function goPrev() { if (currentIdx > 0) setCurrentIdx(i => i - 1); }

  // ── Score computation ─────────────────────────────────────────────────────
  function computeScore() {
    return questions.reduce((score, q, idx) => {
      const a = answers[idx];
      if (!a) return score;
      if (q.chooseTwo) return a.phase === 'done' ? score + 1 : score;
      return q.options[a.selectedIndex]?.correct ? score + 1 : score;
    }, 0);
  }

  // ── Save session to Atlas on finish ──────────────────────────────────────
  useEffect(() => {
    if (!finished || sessionSaved || !questions.length) return;
    const score = computeScore();
    const pct   = Math.round((score / total) * 100);
    const ansArr = Object.entries(answers).map(([idx, a]) => {
      const q = questions[Number(idx)];
      return {
        questionId:      q?._id,
        selectedIndices: q?.chooseTwo ? a.selectedIndices : [a.selectedIndex],
        correct:         q?.chooseTwo ? a.phase === 'done' : q?.options?.[a.selectedIndex]?.correct ?? false,
      };
    });
    examApi.saveSession(id, { score, total, pct, answers: ansArr })
      .catch(err => setSaveError(err.message));
    setSessionSaved(true);
  }, [finished]);

  function handleRetry() {
    setAnswers({}); setCurrentIdx(0);
    setFinished(false); setSessionSaved(false); setSaveError('');
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-full py-20"><span className="spinner w-6 h-6" /></div>;
  if (error) return (
    <div className="p-6 max-w-xl mx-auto">
      <button onClick={() => navigate('/exams')} className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--muted)' }}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="card p-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400 opacity-60" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    </div>
  );
  if (!questions.length) return (
    <div className="p-6 max-w-xl mx-auto">
      <button onClick={() => navigate('/exams')} className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--muted)' }}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="card p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No questions in this set.</p>
      </div>
    </div>
  );

  // ── Score screen ──────────────────────────────────────────────────────────
  if (finished) {
    const score = computeScore();
    const pct   = Math.round((score / total) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        {saveError && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl text-xs text-red-400"
               style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)' }}>
            ⚠ Score not saved: {saveError}
          </div>
        )}
        <ScoreSummary score={score} total={total} pct={pct}
          title={examSet?.title} onRetry={handleRetry} onBack={() => navigate('/exams')} />
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  const score           = computeScore();
  const answeredCount   = Object.keys(answers).length;
  const progressPct     = total ? (answeredCount / total) * 100 : 0;
  const showExplanation = current.chooseTwo ? currentAns.phase === 'done' : currentAns.answered;
  const explanationOk   = current.chooseTwo ? true : current.options?.[currentAns.selectedIndex]?.correct;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Top progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/exams')}
          className="flex items-center gap-1.5 text-sm shrink-0 transition-colors"
          style={{ color: 'var(--muted)' }}>
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exams</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs truncate mb-1.5" style={{ color: 'var(--muted)' }}>{examSet?.title}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="text-xs font-mono shrink-0" style={{ color: 'var(--muted)' }}>
          {answeredCount}/{total}
        </div>
      </div>

      {/* Question dot navigator */}
      <div className="flex gap-1 flex-wrap mb-5">
        {questions.map((q, i) => {
          const a         = answers[i];
          const isCorr    = a && (q.chooseTwo ? a.phase === 'done' : q.options?.[a.selectedIndex]?.correct);
          const isAns     = !!a;
          const isCurrent = i === currentIdx;
          return (
            <button key={i} onClick={() => setCurrentIdx(i)}
              className={`w-7 h-7 rounded-lg text-[11px] font-mono border transition-all duration-150 ${
                isCurrent ? 'ring-2 ring-offset-1 ring-offset-zinc-950' : ''
              } ${isAns
                ? isCorr ? 'bg-green-400/12 text-green-400 border-green-400/22' : 'bg-red-400/12 text-red-400 border-red-400/22'
                : 'text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
              style={{
                background: isAns ? undefined : 'var(--surf2)',
                borderColor: isAns ? undefined : 'var(--border)',
                '--tw-ring-color': 'var(--accent)',
              }}>
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      <div className="card-glass p-5 md:p-7 mb-4 animate-fade-in" key={currentIdx}>

        {/* Q number + text */}
        <div className="flex items-start gap-3 mb-5">
          <span className="badge badge-sky shrink-0 mt-0.5">Q{currentIdx + 1}</span>
          <p className="text-zinc-100 leading-relaxed font-medium text-[15px] flex-1">
            {current.questionText.replace(/^Q\d+\)\s*/, '')}
          </p>
        </div>

        {/* Choose Two banner */}
        {current.chooseTwo && <C2Banner phase={currentAns.phase} />}

        {/* Options */}
        <div className="space-y-2.5">
          {current.options?.map((opt, i) => {
            const cls      = resolveOptionClass(opt, i, currentAns, current.chooseTwo);
            const icon     = resolveIcon(opt, i, currentAns, current.chooseTwo);

            // Determine disabled state
            let disabled = false;
            if (current.chooseTwo) {
              disabled = currentAns.phase === 'done' ||
                         currentAns.lockedIndices?.includes(i) ||
                         currentAns.selectedIndices?.includes(i);
            } else {
              disabled = !!currentAns.answered;
            }

            return (
              <button key={i} className={cls} disabled={disabled}
                onClick={() => !disabled && handleClick(i)}>
                <div className="flex items-center gap-3 w-full">
                  <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                       style={{ background: 'var(--surf)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    {LABELS[i]}
                  </div>
                  <span className="flex-1 text-left">{opt.text}</span>
                  {icon}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation reveal */}
        {showExplanation && current.explanation && (
          <ExplanationBox text={current.explanation} isCorrect={explanationOk} />
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={goPrev} disabled={currentIdx === 0} className="btn-ghost disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
          {score} correct
        </span>
        <button onClick={goNext} disabled={!isComplete}
          className={`disabled:opacity-30 ${currentIdx === total - 1 ? 'btn-primary bg-green-500 hover:bg-green-400' : 'btn-primary'}`}>
          {currentIdx === total - 1 ? <><Trophy className="w-4 h-4" /> Finish</> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
