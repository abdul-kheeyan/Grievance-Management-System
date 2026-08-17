import React, { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';

export default function UsersDirectory() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data.users)).finally(() => setLoading(false));
  }, []);

  const visible = roleFilter ? users.filter(u => u.role === roleFilter) : users;

  return (
    <Layout title="Officers & Users" subtitle="Directory of everyone registered on the platform">
      <div className="toolbar">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="citizen">Citizens</option>
          <option value="officer">Officers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-block">Loading directory…</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td>{u.department || '—'}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}
