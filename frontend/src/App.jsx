import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'items_manager_token';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {}),
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

const emptyForm = { title: '', description: '' };
const emptyAuth = { username: '', password: '' };

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuth);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const data = await request('/items');
      setItems(data);
    } catch (err) {
      if (/Authentication|Invalid or expired/i.test(err.message)) {
        logout();
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    request('/auth/me')
      .then((me) => {
        setUser(me);
        return loadItems();
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setLoading(false);
      });
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setItems([]);
    resetForm();
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setError('');
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const data = await request(path, {
        method: 'POST',
        body: JSON.stringify(authForm),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      setAuthForm(emptyAuth);
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setAuthBusy(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description || '' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingId) {
        await request(`/items/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await request('/items', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      resetForm();
      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return;
    setError('');
    try {
      await request(`/items/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="page">
        <header className="hero">
          <p className="eyebrow">Full-stack CRUD Application</p>
          <h1>Items Manager.</h1>
          <p className="subtitle">Sign in to manage your own items securely.</p>
        </header>

        <main className="layout">
          <section className="panel">
            <h2>{authMode === 'login' ? 'Sign in' : 'Create account'}</h2>
            <form onSubmit={handleAuth} className="form">
              <label>
                Username
                <input
                  value={authForm.username}
                  onChange={(e) =>
                    setAuthForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  autoComplete="username"
                  required
                  minLength={3}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                />
              </label>
              {error && <p className="error">{error}</p>}
              <div className="actions">
                <button type="submit" disabled={authBusy}>
                  {authBusy
                    ? 'Please wait...'
                    : authMode === 'login'
                      ? 'Sign in'
                      : 'Register'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setError('');
                    setAuthMode((m) => (m === 'login' ? 'register' : 'login'));
                  }}
                >
                  {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Full-stack CRUD Application</p>
        <h1>Items Manager..</h1>
        <p className="subtitle">
          Signed in as <strong>{user.username}</strong>. Your items are private to your account.
        </p>
        <div className="actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>{editingId ? 'Edit item' : 'Add item'}</h2>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Buy groceries"
                required
                maxLength={200}
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional details"
                rows={4}
                maxLength={2000}
              />
            </label>
            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update item' : 'Create item'}
              </button>
              {editingId && (
                <button type="button" className="secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="list-header">
            <h2>Your items</h2>
            <button type="button" className="secondary" onClick={loadItems}>
              Refresh
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          {loading ? (
            <p className="muted">Loading...</p>
          ) : items.length === 0 ? (
            <p className="muted">No items yet. Add your first one.</p>
          ) : (
            <ul className="item-list">
              {items.map((item) => (
                <li key={item.id} className="item">
                  <div>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                    <span className="meta">
                      Updated {new Date(item.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="secondary" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
