import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role) {
    const map = {
      citizen: ['ravi@example.com', 'Citizen@123'],
      officer: ['officer1@grievance.gov', 'Officer@123'],
      admin: ['admin@grievance.gov', 'Admin@123']
    };
    setEmail(map[role][0]);
    setPassword(map[role][1]);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="sidebar-seal">NS</span>
          <h1>Nagrik Setu</h1>
        </div>
        <div className="auth-tagline">Digital Complaint &amp; Grievance Management System</div>

        {error && <div className="field-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          New citizen? <Link to="/register">Create an account</Link>
        </div>

        <div className="demo-box">
          <strong>Demo accounts</strong> (click to autofill):<br />
          <a href="#" onClick={e => { e.preventDefault(); fillDemo('citizen'); }}>Citizen</a> ·{' '}
          <a href="#" onClick={e => { e.preventDefault(); fillDemo('officer'); }}>Officer</a> ·{' '}
          <a href="#" onClick={e => { e.preventDefault(); fillDemo('admin'); }}>Admin</a>
        </div>
      </div>
    </div>
  );
}
