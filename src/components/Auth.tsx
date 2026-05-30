import { useState } from 'react';
import { ArrowRight, Lock } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

/**
 * Email + password sign-in. No email is sent on a normal login, so the free-tier
 * email rate limit never blocks getting in. Account creation still requires one
 * confirmation email (only done once).
 */
export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || !password) return;
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      setLoading(false);
      if (error) setError(error.message);
      // On success, App's onAuthStateChange listener swaps this screen for the app.
    } else {
      const { data, error } = await supabase.auth.signUp({ email: addr, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      // If confirmation is required, no session is returned yet.
      if (!data.session) {
        setInfo('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      }
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-logo" role="img" aria-label="Mosaik" />
        </div>

        <form onSubmit={submit} className="auth-form">
          <h1 className="auth-title">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
          <p className="auth-sub">
            {mode === 'signin'
              ? 'Sign in with your email and password.'
              : 'Pick an email and password to get started.'}
          </p>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          <button className="btn primary auth-submit" disabled={loading}>
            {mode === 'signin' ? <Lock size={16} weight="bold" /> : null}
            {loading
              ? mode === 'signin'
                ? 'Signing in…'
                : 'Creating…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
            {mode === 'signup' ? <ArrowRight size={16} weight="bold" /> : null}
          </button>

          <button
            type="button"
            className="link-btn auth-back"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError('');
              setInfo('');
            }}
          >
            {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
