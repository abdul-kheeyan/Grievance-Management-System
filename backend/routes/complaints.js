const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const { notify } = require('../notifications');
const {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  SLA_HOURS,
  ESCALATION_LEVELS,
  departmentForCategory
} = require('../constants');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  }
});

function nextComplaintId() {
  const counters = db.get('counters').value();
  const next = (counters.complaint || 0) + 1;
  db.set('counters.complaint', next).write();
  const year = new Date().getFullYear();
  return `GRV-${year}-${String(next).padStart(6, '0')}`;
}

function addTimeline(complaint, status, remark, actor) {
  complaint.timeline.push({
    id: uuidv4(),
    status,
    remark: remark || '',
    actorId: actor ? actor.id : null,
    actorName: actor ? actor.name : 'System',
    actorRole: actor ? actor.role : 'system',
    timestamp: new Date().toISOString()
  });
}

function sanitize(complaint) {
  return complaint;
}

function canView(complaint, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'officer') return complaint.department === user.department;
  return complaint.userId === user.id;
}

// ---- Create complaint (Citizen) ----
router.post('/', authRequired, requireRole('citizen'), upload.array('attachments', 5), (req, res) => {
  const { category, description, location, priority } = req.body;
  if (!category || !description || !location) {
    return res.status(400).json({ error: 'Category, description and location are required.' });
  }
  if (!CATEGORIES.some(c => c.name === category)) {
    return res.status(400).json({ error: 'Invalid category selected.' });
  }
  const finalPriority = PRIORITIES.includes(priority) ? priority : 'Medium';
  const department = departmentForCategory(category);
  const slaHours = SLA_HOURS[finalPriority];
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

  const complaint = {
    id: uuidv4(),
    complaintId: nextComplaintId(),
    userId: req.user.id,
    userName: req.user.name,
    category,
    department,
    description,
    location,
    priority: finalPriority,
    status: 'Submitted',
    escalationLevel: 0, // 0 = Officer, 1 = Supervisor, 2 = Admin
    assignedOfficerId: null,
    assignedOfficerName: null,
    attachments: (req.files || []).map(f => ({ filename: f.filename, originalName: f.originalname })),
    slaHours,
    slaDeadline: slaDeadline.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    timeline: [],
    resolution: null
  };
  addTimeline(complaint, 'Submitted', 'Complaint registered by citizen.', req.user);

  db.get('complaints').push(complaint).write();
  notify(complaint.userId, {
    title: 'Complaint registered',
    message: `Your complaint ${complaint.complaintId} (${complaint.category}) has been registered and routed to ${complaint.department}.`,
    complaintId: complaint.id
  });
  res.status(201).json({ complaint });
});

// ---- List complaints (role-scoped, filterable) ----
router.get('/', authRequired, (req, res) => {
  let list = db.get('complaints').value();

  if (req.user.role === 'citizen') {
    list = list.filter(c => c.userId === req.user.id);
  } else if (req.user.role === 'officer') {
    list = list.filter(c => c.department === req.user.department);
  }
  // admin sees all

  const { status, category, department, priority, escalationLevel, q } = req.query;
  if (status) list = list.filter(c => c.status === status);
  if (category) list = list.filter(c => c.category === category);
  if (department) list = list.filter(c => c.department === department);
  if (priority) list = list.filter(c => c.priority === priority);
  if (escalationLevel !== undefined && escalationLevel !== '') {
    list = list.filter(c => String(c.escalationLevel) === String(escalationLevel));
  }
  if (q) {
    const query = q.toLowerCase();
    list = list.filter(c =>
      c.complaintId.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query)
    );
  }

  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ complaints: list, count: list.length });
});

// ---- Metadata (categories/departments/priorities) for form dropdowns ----
router.get('/meta', authRequired, (req, res) => {
  res.json({ categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES, escalationLevels: ESCALATION_LEVELS });
});

// ---- Get single complaint ----
router.get('/:id', authRequired, (req, res) => {
  const complaint = db.get('complaints').find({ id: req.params.id }).value();
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  if (!canView(complaint, req.user)) {
    return res.status(403).json({ error: 'You do not have access to this complaint.' });
  }
  res.json({ complaint });
});

// ---- Download an attachment ----
router.get('/:id/attachments/:filename', authRequired, (req, res) => {
  const complaint = db.get('complaints').find({ id: req.params.id }).value();
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  if (!canView(complaint, req.user)) {
    return res.status(403).json({ error: 'You do not have access to this file.' });
  }
  const attachment = complaint.attachments.find(a => a.filename === req.params.filename);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });
  res.sendFile(path.join(uploadsDir, attachment.filename));
});

// ---- Assign officer (Admin) ----
router.patch('/:id/assign', authRequired, requireRole('admin'), (req, res) => {
  const { officerId } = req.body;
  const complaint = db.get('complaints').find({ id: req.params.id }).value();
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  const officer = db.get('users').find({ id: officerId, role: 'officer' }).value();
  if (!officer) return res.status(400).json({ error: 'Officer not found.' });
  if (officer.department !== complaint.department) {
    return res.status(400).json({ error: `Officer must belong to the ${complaint.department} department.` });
  }

  complaint.assignedOfficerId = officer.id;
  complaint.assignedOfficerName = officer.name;
  if (complaint.status === 'Submitted') complaint.status = 'Assigned';
  complaint.updatedAt = new Date().toISOString();
  addTimeline(complaint, complaint.status, `Assigned to officer ${officer.name}.`, req.user);

  db.get('complaints').find({ id: req.params.id }).assign(complaint).write();
  notify(complaint.userId, {
    title: 'Officer assigned',
    message: `${officer.name} has been assigned to your complaint ${complaint.complaintId}.`,
    complaintId: complaint.id
  });
  notify(officer.id, {
    title: 'New complaint assigned to you',
    message: `Complaint ${complaint.complaintId} (${complaint.category}) in ${complaint.department} has been assigned to you.`,
    complaintId: complaint.id
  });
  res.json({ complaint });
});

// ---- Update status / resolve (Officer assigned to it, or Admin) ----
router.patch('/:id/status', authRequired, requireRole('officer', 'admin'), (req, res) => {
  const { status, remark, actionTaken, remarks } = req.body;
  const complaint = db.get('complaints').find({ id: req.params.id }).value();
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

  if (req.user.role === 'officer' && complaint.department !== req.user.department) {
    return res.status(403).json({ error: 'This complaint is not in your department.' });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();

  if (status === 'Resolved' || status === 'Closed') {
    const now = new Date();
    const deadline = new Date(complaint.slaDeadline);
    complaint.resolution = {
      actionTaken: actionTaken || '',
      resolutionDate: now.toISOString(),
      remarks: remarks || '',
      slaStatus: now <= deadline ? 'Within SLA' : 'SLA Breached'
    };
  }

  addTimeline(complaint, status, remark || `Status updated to ${status}.`, req.user);
  db.get('complaints').find({ id: req.params.id }).assign(complaint).write();

  if (status === 'Resolved' || status === 'Closed') {
    notify(complaint.userId, {
      title: `Complaint ${status.toLowerCase()}`,
      message: `Your complaint ${complaint.complaintId} has been marked ${status.toLowerCase()}. Action taken: ${complaint.resolution.actionTaken || 'See case file for details.'}`,
      complaintId: complaint.id
    });
  } else {
    notify(complaint.userId, {
      title: `Status update: ${status}`,
      message: `Your complaint ${complaint.complaintId} is now "${status}". ${remark || ''}`.trim(),
      complaintId: complaint.id
    });
  }

  res.json({ complaint });
});

// ---- Manual escalation trigger (Officer, Admin, or Citizen requesting escalation) ----
router.post('/:id/escalate', authRequired, (req, res) => {
  const complaint = db.get('complaints').find({ id: req.params.id }).value();
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  if (!canView(complaint, req.user)) {
    return res.status(403).json({ error: 'You do not have access to this complaint.' });
  }
  if (complaint.escalationLevel >= ESCALATION_LEVELS.length - 1) {
    return res.status(400).json({ error: 'Complaint is already at the highest escalation level (Admin).' });
  }
  if (complaint.status === 'Resolved' || complaint.status === 'Closed') {
    return res.status(400).json({ error: 'Cannot escalate a resolved/closed complaint.' });
  }

  complaint.escalationLevel += 1;
  complaint.status = 'Escalated';
  complaint.updatedAt = new Date().toISOString();
  const levelName = ESCALATION_LEVELS[complaint.escalationLevel];
  addTimeline(
    complaint,
    'Escalated',
    `Escalated to ${levelName} level (${req.body.reason || 'requested by ' + req.user.role}).`,
    req.user
  );

  db.get('complaints').find({ id: req.params.id }).assign(complaint).write();
  notify(complaint.userId, {
    title: 'Complaint escalated',
    message: `Your complaint ${complaint.complaintId} has been escalated to ${levelName} level.`,
    complaintId: complaint.id
  });
  if (complaint.assignedOfficerId && complaint.assignedOfficerId !== req.user.id) {
    notify(complaint.assignedOfficerId, {
      title: 'Complaint escalated',
      message: `Complaint ${complaint.complaintId} has been escalated to ${levelName} level and needs attention.`,
      complaintId: complaint.id
    });
  }
  res.json({ complaint });
});

// ---- Citizen feedback / satisfaction rating (after resolution) ----
router.post('/:id/feedback', authRequired, requireRole('citizen'), (req, res) => {
  const complaint = db.get('complaints').find({ id: req.params.id }).value();
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  if (complaint.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only rate your own complaints.' });
  }
  if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
    return res.status(400).json({ error: 'Feedback can only be given once a complaint is resolved.' });
  }
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5.' });
  }

  complaint.resolution.satisfactionRating = rating;
  complaint.resolution.satisfactionFeedback = (req.body.feedback || '').slice(0, 1000);
  complaint.updatedAt = new Date().toISOString();
  addTimeline(complaint, complaint.status, `Citizen rated this resolution ${rating}/5.`, req.user);

  db.get('complaints').find({ id: req.params.id }).assign(complaint).write();
  res.json({ complaint });
});

module.exports = router;
