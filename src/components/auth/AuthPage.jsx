import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Cloud, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  function setF(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (mode === 'register') {
      if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
      if (form.password.length < 8)       { setError('Password must be at least 8 characters.'); return; }
    }
    setBusy(true);
    try {
      mode === 'login' ? await login(form.username, form.password)
                       : await register(form.username, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function fillDemo(r) {
    if (r === 'admin') setForm(p => ({ ...p, username: 'admin1234', password: 'rootuser@1234' }));
    else               setForm(p => ({ ...p, username: 'demo_student', password: 'student123' }));
    setMode('login'); setError('');
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-3xl"
             style={{ background: 'radial-gradient(ellipse, rgba(56,189,248,0.07) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[400px] animate-fade-up relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Cloud className="w-7 h-7" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">CloudDeck</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            AWS Exam Engine · Netlify + MongoDB Atlas
          </p>
        </div>

        <div className="card-glass p-7">
          {/* Tab toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--surf2)' }}>
            {[['login','Sign In'],['register','Register']].map(([m,label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'text-white shadow-lg'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                style={mode === m ? { background: 'var(--accent)', color: '#0c1a2e' } : {}}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                <input type="text" value={form.username} onChange={setF('username')}
                  placeholder="Enter username" className="input pl-10" required autoComplete="username" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                <input type="password" value={form.password} onChange={setF('password')}
                  placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter password'}
                  className="input pl-10" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
            </div>

            {/* Confirm (register only) */}
            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                  <input type="password" value={form.confirm} onChange={setF('confirm')}
                    placeholder="Repeat password" className="input pl-10" required autoComplete="new-password" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm animate-fade-in"
                   style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy
                ? <span className="spinner w-4 h-4" />
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Demo accounts */}
          {mode === 'login' && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs text-center mb-3" style={{ color: 'var(--muted)' }}>Demo credentials — click to fill</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => fillDemo('admin')} className="btn-ghost text-xs py-2.5 flex flex-col items-center gap-0.5">
                  <span className="text-zinc-200 font-semibold">Admin</span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>admin1234</span>
                </button>
                <button onClick={() => fillDemo('student')} className="btn-ghost text-xs py-2.5 flex flex-col items-center gap-0.5">
                  <span className="text-zinc-200 font-semibold">Student</span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>demo_student</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1.5" style={{ color: 'var(--muted)' }}>
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          Non-explicit deny · bcrypt · JWT · MongoDB Atlas
        </p>
      </div>
    </div>
  );
}
