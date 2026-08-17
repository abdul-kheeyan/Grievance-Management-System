const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET, authRequired } = require('../middleware/auth');
const { DEPARTMENTS } = require('../constants');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// Register a new user. Citizens self-register; officer/admin accounts are
// created the same way for this demo (in production these would be
// provisioned by an admin), but we still require a department for officers.
router.post('/register', (req, res) => {
  const { name, email, password, phone, role, department } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.get('users').find({ email: normalizedEmail }).value();
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const finalRole = ['citizen', 'officer', 'admin'].includes(role) ? role : 'citizen';
  if (finalRole !== 'citizen' && !department) {
    return res.status(400).json({ error: 'Department is required for officer/admin accounts.' });
  }
  if (department && !DEPARTMENTS.includes(department)) {
    return res.status(400).json({ error: 'Invalid department selected.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    password: hashed,
    phone: phone || '',
    role: finalRole,
    department: department || null,
    createdAt: new Date().toISOString()
  };
  db.get('users').push(user).write();

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = db.get('users').find({ email: email.trim().toLowerCase() }).value();
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
