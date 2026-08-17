import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../AuthContext.jsx';

const STATUS_COLORS = {
  Submitted: '#5B6B77', Assigned: '#2E6E9E', 'In Progress': '#B8862B',
  Escalated: '#B8452F', Resolved: '#2E7D5B', Closed: '#6B7280'
};
const BAR_COLOR = '#16303B';
const SEAL = '#B8862B';

export default function Analytics() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byDepartment, setByDepartment] = useState([]);
  const [byLocation, setByLocation] = useState([]);
  const [closedPerDept, setClosedPerDept] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calls = [
      api.get('/analytics/summary'),
      api.get('/analytics/by-category'),
      api.get('/analytics/trend'),
      api.get('/analytics/by-location')
    ];
    if (user.role === 'admin') {
      calls.push(api.get('/analytics/by-department'));
      calls.push(api.get('/analytics/closed-per-department'));
    }

    Promise.all(calls).then(results => {
      setSummary(results[0].data);
      setByCategory(results[1].data.data);
      setTrend(results[2].data.data);
      setByLocation(results[3].data.data);
      if (results[4]) setByDepartment(results[4].data.data);
      if (results[5]) setClosedPerDept(results[5].data.data);
    }).finally(() => setLoading(false));
  }, [user.role]);

  if (loading || !summary) return <Layout title="Analytics"><div className="loading-block">Crunching the numbers…</div></Layout>;

  const statusData = Object.entries(summary.byStatus).map(([status, count]) => ({ status, count }));

  return (
    <Layout title="Analytics & KPIs" subtitle={user.role === 'admin' ? 'System-wide performance' : `${user.department} department performance`}>
      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card kpi-card">
          <div className="kpi-label">Avg. resolution time</div>
          <div className="kpi-value">{summary.avgResolutionHours}h</div>
          <div className="kpi-sub">Across resolved/closed cases</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">SLA compliance</div>
          <div className="kpi-value">{summary.slaComplianceRate}%</div>
          <div className="kpi-sub">Resolved within SLA window</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Escalation rate</div>
          <div className="kpi-value">{summary.escalationRate}%</div>
          <div className="kpi-sub">Of all filed complaints</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Open vs total</div>
          <div className="kpi-value">{summary.openCount}/{summary.total}</div>
          <div className="kpi-sub">Currently unresolved</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Citizen satisfaction</div>
          <div className="kpi-value">{summary.avgSatisfaction ? `${summary.avgSatisfaction} / 5` : '—'}</div>
          <div className="kpi-sub">{summary.satisfactionResponses} rating{summary.satisfactionResponses === 1 ? '' : 's'} submitted</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Complaints by status</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }) => `${status}: ${count}`}>
                {statusData.map(entry => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#999'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Complaints by category</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="category" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {user.role === 'admin' && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Complaints by department</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={SEAL} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {user.role === 'admin' && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Complaints closed per department</div>
            {closedPerDept.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>No resolved/closed complaints yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={closedPerDept}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2E7D5B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Complaint volume over time</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke={BAR_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Top complaint locations</div>
          {byLocation.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>No location data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byLocation} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="location" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2E6E9E" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  );
}
