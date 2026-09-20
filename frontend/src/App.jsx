import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }

  return response.json();
}

const emptyForm = { title: '', description: '' };

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const data = await request('/items');
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

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

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Full-stack CRUDs/p>
        <h1>Items Manager</h1>
        <p className="subtitle">
          Create, read, update, and delete items with a React frontend and Node.js API.
        </p>
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
            <h2>All items</h2>
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
