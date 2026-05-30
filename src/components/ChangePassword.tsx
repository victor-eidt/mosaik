import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

interface Props {
  onClose: () => void;
}

/** Set or change the account password while signed in — no email involved. */
export default function ChangePassword({ onClose }: Props) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast('Password updated');
    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal-narrow" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Change password</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="modal-body">
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat it"
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
          </div>

          <footer className="modal-foot">
            <span className="hint">Esc to close</span>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? 'Saving…' : 'Save password'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
