import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { StatusBadge, PriorityPill } from '../components/Bits.jsx';
import { useAuth } from '../AuthContext.jsx';

const STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Escalated', 'Resolved', 'Closed'];

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', q: '' });

  useEffect(() => { load(); }, [filters.status, filters.priority]);

  function load() {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    api.get('/complaints', { params }).then(res => setComplaints(res.data.complaints)).finally(() => setLoading(false));
  }

  function handleSearch(e) {
    e.preventDefault();
    load();
  }

  const visible = filters.q
    ? complaints.filter(c =>
        c.complaintId.toLowerCase().includes(filters.q.toLowerCase()) ||
        c.description.toLowerCase().includes(filters.q.toLowerCase()))
    : complaints;

  const escalatedCount = complaints.filter(c => c.escalationLevel > 0 && c.status !== 'Resolved' && c.status !== 'Closed').length;
  const unassignedCount = complaints.filter(c => !c.assignedOfficerId).length;

  return (
    <Layout title="Assigned Queue" subtitle={`${user.department} department`}>
      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card kpi-card">
          <div className="kpi-label">Department total</div>
          <div className="kpi-value">{complaints.length}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Escalated (open)</div>
          <div className="kpi-value">{escalatedCount}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Unassigned</div>
          <div className="kpi-value">{unassignedCount}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Resolved / Closed</div>
          <div className="kpi-value">{complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length}</div>
        </div>
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All priorities</option>
          {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="text" placeholder="Search ID or description…" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
      </form>

      {loading ? (
        <div className="loading-block">Loading department queue…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">No complaints match these filters.</div>
      ) : (
        <div className="complaint-list">
          {visible.map(c => (
            <Link to={`/complaints/${c.id}`} key={c.id} className={`complaint-row pri-${c.priority}`}>
              <div>
                <div className="complaint-id">{c.complaintId}</div>
                <div className="complaint-title">{c.category}</div>
                <div className="complaint-meta">
                  <span>{c.location}</span>
                  <span>{c.userName}</span>
                  <span>{c.assignedOfficerName ? `Assigned: ${c.assignedOfficerName}` : 'Unassigned'}</span>
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
