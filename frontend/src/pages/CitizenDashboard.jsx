import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { StatusBadge, PriorityPill } from '../components/Bits.jsx';
import { useAuth } from '../AuthContext.jsx';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    load();
  }, [statusFilter]);

  function load() {
    setLoading(true);
    api.get('/complaints', { params: statusFilter ? { status: statusFilter } : {} })
      .then(res => setComplaints(res.data.complaints))
      .finally(() => setLoading(false));
  }

  const openCount = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;

  return (
    <Layout title="My Complaints" subtitle={`Welcome back, ${user?.name}`}>
      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card kpi-card">
          <div className="kpi-label">Total filed</div>
          <div className="kpi-value">{complaints.length}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Currently open</div>
          <div className="kpi-value">{openCount}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Resolved</div>
          <div className="kpi-value">{complaints.length - openCount}</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Submitted', 'Assigned', 'In Progress', 'Escalated', 'Resolved', 'Closed'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Link to="/new" className="btn btn-seal" style={{ marginLeft: 'auto' }}>+ File a new complaint</Link>
      </div>

      {loading ? (
        <div className="loading-block">Loading your complaints…</div>
      ) : complaints.length === 0 ? (
        <div className="empty-state">
          <p>You haven't filed any complaints yet.</p>
          <Link to="/new" className="btn btn-primary">File your first complaint</Link>
        </div>
      ) : (
        <div className="complaint-list">
          {complaints.map(c => (
            <Link to={`/complaints/${c.id}`} key={c.id} className={`complaint-row pri-${c.priority}`}>
              <div>
                <div className="complaint-id">{c.complaintId}</div>
                <div className="complaint-title">{c.category}</div>
                <div className="complaint-meta">
                  <span>{c.location}</span>
                  <span>Filed {new Date(c.createdAt).toLocaleDateString()}</span>
                  <span>{c.department}</span>
                </div>
              </div>
              <div className="complaint-row-right">
                <StatusBadge status={c.status} />
                <PriorityPill priority={c.priority} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
