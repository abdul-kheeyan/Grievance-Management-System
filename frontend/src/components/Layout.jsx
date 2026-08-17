import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const NAV_BY_ROLE = {
  citizen: [
    { to: '/', label: 'My Complaints', end: true },
    { to: '/new', label: 'File a Complaint' }
  ],
  officer: [
    { to: '/', label: 'Assigned Queue', end: true },
    { to: '/analytics', label: 'Department Analytics' }
  ],
  admin: [
    { to: '/', label: 'All Complaints', end: true },
    { to: '/analytics', label: 'Analytics & KPIs' },
    { to: '/users', label: 'Officers & Users' }
  ]
};

export default function Layout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAV_BY_ROLE[user?.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-seal">NS</span>
          Nagrik Setu
        </div>
        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            {user?.email}
            <div className="sidebar-role-tag">{user?.role}{user?.department ? ` · ${user.department}` : ''}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>
          <NotificationBell />
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
