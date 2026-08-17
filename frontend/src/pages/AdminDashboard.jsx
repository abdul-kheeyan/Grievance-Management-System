import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { StatusBadge, PriorityPill } from '../components/Bits.jsx';

const STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Escalated', 'Resolved', 'Closed'];

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', department: '', q: '' });

  useEffect(() => {
    api.get('/users').then(res => setDepartments(res.data.departments));
  }, []);

  useEffect(() => { load(); }, [filters.status, filters.department]);

  function load() {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.department) params.department = filters.department;
    api.get('/complaints', { params }).then(res => setComplaints(res.data.complaints)).finally(() => setLoading(false));
  }

  const visible = filters.q
    ? complaints.filter(c => c.complaintId.toLowerCase().includes(filters.q.toLowerCase()) || c.userName.toLowerCase().includes(filters.q.toLowerCase()))
    : complaints;

  const escalatedToAdmin = complaints.filter(c => c.escalationLevel === 2 && c.status !== 'Resolved' && c.status !== 'Closed').length;

  return (
    <Layout title="All Complaints" subtitle="System-wide monitoring across all departments">
      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card kpi-card">
          <div className="kpi-label">Total complaints</div>
          <div className="kpi-value">{complaints.length}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Escalated to Admin</div>
          <div className="kpi-value">{escalatedToAdmin}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Unassigned</div>
          <div className="kpi-value">{complaints.filter(c => !c.assignedOfficerId).length}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Resolved / Closed</div>
          <div className="kpi-value">{complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length}</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="text" placeholder="Search ID or citizen name…" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
      </div>

      {loading ? (
        <div className="loading-block">Loading complaints…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">No complaints match these filters.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Category</th><th>Department</th><th>Citizen</th>
              <th>Status</th><th>Priority</th><th>Escalation</th><th>Filed</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.id}>
                <td><Link to={`/complaints/${c.id}`} className="mono">{c.complaintId}</Link></td>
                <td>{c.category}</td>
                <td>{c.department}</td>
                <td>{c.userName}</td>
                <td><StatusBadge status={c.status} /></td>
                <td><PriorityPill priority={c.priority} /></td>
                <td>{['Officer', 'Supervisor', 'Admin'][c.escalationLevel]}</td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}
