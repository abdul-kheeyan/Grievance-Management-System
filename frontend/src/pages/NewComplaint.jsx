import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Layout from '../components/Layout.jsx';

export default function NewComplaint() {
  const [meta, setMeta] = useState({ categories: [], priorities: [] });
  const [form, setForm] = useState({ category: '', description: '', location: '', priority: 'Medium' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/complaints/meta').then(res => {
      setMeta(res.data);
      setForm(f => ({ ...f, category: res.data.categories[0]?.name || '' }));
    });
  }, []);

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.category || !form.description.trim() || !form.location.trim()) {
      setError('Please fill in category, description and location.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('attachments', f));
      const res = await api.post('/complaints', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/complaints/${res.data.complaint.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="File a Complaint" subtitle="Provide as much detail as possible so the right department can act quickly.">
      <div className="card" style={{ maxWidth: 640 }}>
        {error && <div className="field-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" value={form.category} onChange={e => update('category', e.target.value)}>
              {meta.categories.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <div className="field-hint">
              Routed to: <strong>{meta.categories.find(c => c.name === form.category)?.department}</strong>
            </div>
          </div>

          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={form.priority} onChange={e => update('priority', e.target.value)}>
              {meta.priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="field-hint">Higher priority means a shorter resolution window (SLA).</div>
          </div>

          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Sector 12, Nashik" required />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe the issue in detail…" required />
          </div>

          <div className="field">
            <label htmlFor="attachments">Supporting documents / images (optional)</label>
            <input id="attachments" type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx" onChange={e => setFiles(Array.from(e.target.files))} />
            <div className="field-hint">Up to 5 files, 8MB each. JPG, PNG, GIF, PDF, DOC.</div>
          </div>

          <button className="btn btn-seal btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit complaint'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
