import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  function load() {
    api.get('/notifications').then(res => {
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    }).catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    load();
  }

  async function handleClickNotification(n) {
    if (!n.read) {
      await api.patch(`/notifications/${n.id}/read`);
      load();
    }
    setOpen(false);
    if (n.complaintId) navigate(`/complaints/${n.complaintId}`);
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="notif-bell" onClick={() => setOpen(o => !o)} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-head">
            <span>Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead}>Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet.</div>
          ) : (
            <div className="notif-list">
              {notifications.slice(0, 12).map(n => (
                <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => handleClickNotification(n)}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
