import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CitizenDashboard from './pages/CitizenDashboard.jsx';
import NewComplaint from './pages/NewComplaint.jsx';
import OfficerDashboard from './pages/OfficerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ComplaintDetail from './pages/ComplaintDetail.jsx';
import Analytics from './pages/Analytics.jsx';
import UsersDirectory from './pages/UsersDirectory.jsx';

function RoleHome() {
  const { user } = useAuth();
  if (user.role === 'citizen') return <CitizenDashboard />;
  if (user.role === 'officer') return <OfficerDashboard />;
  return <AdminDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
      <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />
      <Route path="/new" element={<ProtectedRoute roles={['citizen']}><NewComplaint /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute roles={['officer', 'admin']}><Analytics /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersDirectory /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
