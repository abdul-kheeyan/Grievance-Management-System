const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const list = db.get('notifications').filter({ userId: req.user.id }).value();
  const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notifications: sorted, unreadCount: sorted.filter(n => !n.read).length });
});

router.patch('/:id/read', authRequired, (req, res) => {
  const n = db.get('notifications').find({ id: req.params.id, userId: req.user.id }).value();
  if (!n) return res.status(404).json({ error: 'Notification not found.' });
  db.get('notifications').find({ id: req.params.id }).assign({ read: true }).write();
  res.json({ ok: true });
});

router.patch('/read-all', authRequired, (req, res) => {
  const list = db.get('notifications').value();
  list.forEach(n => { if (n.userId === req.user.id) n.read = true; });
  db.write();
  res.json({ ok: true });
});

module.exports = router;
