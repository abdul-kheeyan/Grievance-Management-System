const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

function scopedComplaints(req) {
  let list = db.get('complaints').value();
  if (req.user.role === 'officer') {
    list = list.filter(c => c.department === req.user.department);
  }
  return list;
}

function avgResolutionHours(list) {
  const resolved = list.filter(c => c.resolution);
  if (!resolved.length) return 0;
  const totalHours = resolved.reduce((sum, c) => {
    const created = new Date(c.createdAt);
    const done = new Date(c.resolution.resolutionDate);
    return sum + (done - created) / (1000 * 60 * 60);
  }, 0);
  return Math.round((totalHours / resolved.length) * 10) / 10;
}

function avgSatisfaction(list) {
  const rated = list.filter(c => c.resolution && c.resolution.satisfactionRating);
  if (!rated.length) return null;
  const total = rated.reduce((sum, c) => sum + c.resolution.satisfactionRating, 0);
  return Math.round((total / rated.length) * 10) / 10;
}

router.get('/summary', authRequired, requireRole('officer', 'admin'), (req, res) => {
  const list = scopedComplaints(req);
  const total = list.length;
  const resolved = list.filter(c => c.status === 'Resolved' || c.status === 'Closed');
  const escalated = list.filter(c => c.escalationLevel > 0);
  const withinSla = resolved.filter(c => c.resolution && c.resolution.slaStatus === 'Within SLA');

  const byStatus = {};
  list.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

  const rated = list.filter(c => c.resolution && c.resolution.satisfactionRating);

  res.json({
    total,
    resolvedCount: resolved.length,
    openCount: total - resolved.length,
    escalationRate: total ? Math.round((escalated.length / total) * 1000) / 10 : 0,
    slaComplianceRate: resolved.length ? Math.round((withinSla.length / resolved.length) * 1000) / 10 : 0,
    avgResolutionHours: avgResolutionHours(list),
    avgSatisfaction: avgSatisfaction(list),
    satisfactionResponses: rated.length,
    byStatus
  });
});

router.get('/by-category', authRequired, requireRole('officer', 'admin'), (req, res) => {
  const list = scopedComplaints(req);
  const counts = {};
  list.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
  res.json({ data: Object.entries(counts).map(([category, count]) => ({ category, count })) });
});

router.get('/by-department', authRequired, requireRole('admin'), (req, res) => {
  const list = db.get('complaints').value();
  const counts = {};
  list.forEach(c => { counts[c.department] = (counts[c.department] || 0) + 1; });
  res.json({ data: Object.entries(counts).map(([department, count]) => ({ department, count })) });
});

router.get('/by-location', authRequired, requireRole('officer', 'admin'), (req, res) => {
  const list = scopedComplaints(req);
  const counts = {};
  list.forEach(c => { counts[c.location] = (counts[c.location] || 0) + 1; });
  const data = Object.entries(counts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  res.json({ data });
});

router.get('/closed-per-department', authRequired, requireRole('admin'), (req, res) => {
  const list = db.get('complaints').value().filter(c => c.status === 'Resolved' || c.status === 'Closed');
  const counts = {};
  list.forEach(c => { counts[c.department] = (counts[c.department] || 0) + 1; });
  res.json({ data: Object.entries(counts).map(([department, count]) => ({ department, count })) });
});

router.get('/trend', authRequired, requireRole('officer', 'admin'), (req, res) => {
  const list = scopedComplaints(req);
  const counts = {};
  list.forEach(c => {
    const day = c.createdAt.slice(0, 10);
    counts[day] = (counts[day] || 0) + 1;
  });
  const data = Object.entries(counts)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, count]) => ({ date, count }));
  res.json({ data });
});

module.exports = router;
