const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { DEPARTMENTS } = require('../constants');

const router = express.Router();

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// List officers, optionally filtered by department. Used by Admin to assign complaints.
router.get('/officers', authRequired, requireRole('admin'), (req, res) => {
  let officers = db.get('users').filter({ role: 'officer' }).value();
  if (req.query.department) {
    officers = officers.filter(o => o.department === req.query.department);
  }
  res.json({ officers: officers.map(publicUser) });
});

// All users (Admin only) — for the user directory / oversight.
router.get('/', authRequired, requireRole('admin'), (req, res) => {
  const users = db.get('users').value().map(publicUser);
  res.json({ users, departments: DEPARTMENTS });
});

module.exports = router;
