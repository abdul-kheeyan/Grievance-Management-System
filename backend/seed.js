require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { DEPARTMENTS, SLA_HOURS } = require('./constants');

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

function resetDb() {
  db.set('users', []).write();
  db.set('complaints', []).write();
  db.set('counters', { complaint: 0 }).write();
}

async function seed() {
  await db.connectMongoDB();
  if (db.isMongoConnected()) {
    await db.UserModel.deleteMany({});
    await db.ComplaintModel.deleteMany({});
    await db.NotificationModel.deleteMany({});
    await db.CounterModel.deleteMany({});
  }
  db.pauseSync();
  resetDb();
  const now = new Date();

  const admin = {
    id: uuidv4(),
    name: 'Anita Deshmukh',
    email: 'admin@grievance.gov',
    password: hash('Admin@123'),
    phone: '9000000001',
    role: 'admin',
    department: 'General Administration',
    createdAt: now.toISOString()
  };

  const officers = DEPARTMENTS.map((dept, i) => ({
    id: uuidv4(),
    name: `Officer ${dept.split(' ')[0]} ${i + 1}`,
    email: `officer${i + 1}@grievance.gov`,
    password: hash('Officer@123'),
    phone: `90000000${10 + i}`,
    role: 'officer',
    department: dept,
    createdAt: now.toISOString()
  }));

  const citizens = [
    { name: 'Ravi Kumar', email: 'ravi@example.com' },
    { name: 'Priya Sharma', email: 'priya@example.com' },
    { name: 'Amit Verma', email: 'amit@example.com' }
  ].map(c => ({
    id: uuidv4(),
    name: c.name,
    email: c.email,
    password: hash('Citizen@123'),
    phone: '9876543210',
    role: 'citizen',
    department: null,
    createdAt: now.toISOString()
  }));

  db.get('users').push(admin, ...officers, ...citizens).write();

  const sampleComplaints = [
    {
      category: 'Water Supply',
      description: 'No water supply in our locality for the past 3 days.',
      location: 'Sector 12, Nashik',
      priority: 'High',
      daysAgo: 6,
      status: 'Resolved'
    },
    {
      category: 'Electricity',
      description: 'Frequent power cuts every evening since last week.',
      location: 'MG Road, Nashik',
      priority: 'Medium',
      daysAgo: 4,
      status: 'In Progress'
    },
    {
      category: 'Roads & Infrastructure',
      description: 'Large pothole causing accidents near the main junction.',
      location: 'College Road, Nashik',
      priority: 'Critical',
      daysAgo: 2,
      status: 'Escalated'
    },
    {
      category: 'Billing & Payments',
      description: 'Overcharged on the last utility bill; amount does not match usage.',
      location: 'Panchavati, Nashik',
      priority: 'Low',
      daysAgo: 10,
      status: 'Closed'
    },
    {
      category: 'Consumer Product/Service',
      description: 'Purchased appliance was defective and the store refuses replacement.',
      location: 'Gangapur Road, Nashik',
      priority: 'Medium',
      daysAgo: 1,
      status: 'Submitted'
    }
  ];

  let counter = 0;
  sampleComplaints.forEach((sc, idx) => {
    counter += 1;
    const dept = DEPARTMENTS.find(d =>
      d === (sc.category === 'Water Supply' ? 'Water & Sanitation'
        : sc.category === 'Electricity' ? 'Power & Utilities'
        : sc.category === 'Roads & Infrastructure' ? 'Public Works'
        : sc.category === 'Billing & Payments' ? 'Finance & Billing'
        : 'Consumer Affairs')
    ) || 'General Administration';

    const created = new Date(now.getTime() - sc.daysAgo * 24 * 60 * 60 * 1000);
    const slaHours = SLA_HOURS[sc.priority];
    const slaDeadline = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
    const officer = officers.find(o => o.department === dept);
    const citizen = citizens[idx % citizens.length];

    const complaint = {
      id: uuidv4(),
      complaintId: `GRV-${created.getFullYear()}-${String(counter).padStart(6, '0')}`,
      userId: citizen.id,
      userName: citizen.name,
      category: sc.category,
      department: dept,
      description: sc.description,
      location: sc.location,
      priority: sc.priority,
      status: sc.status,
      escalationLevel: sc.status === 'Escalated' ? 1 : 0,
      assignedOfficerId: sc.status === 'Submitted' ? null : officer.id,
      assignedOfficerName: sc.status === 'Submitted' ? null : officer.name,
      attachments: [],
      slaHours,
      slaDeadline: slaDeadline.toISOString(),
      createdAt: created.toISOString(),
      updatedAt: now.toISOString(),
      timeline: [
        {
          id: uuidv4(),
          status: 'Submitted',
          remark: 'Complaint registered by citizen.',
          actorId: citizen.id,
          actorName: citizen.name,
          actorRole: 'citizen',
          timestamp: created.toISOString()
        }
      ],
      resolution: null
    };

    if (sc.status !== 'Submitted') {
      complaint.timeline.push({
        id: uuidv4(),
        status: 'Assigned',
        remark: `Assigned to officer ${officer.name}.`,
        actorId: admin.id,
        actorName: admin.name,
        actorRole: 'admin',
        timestamp: new Date(created.getTime() + 60 * 60 * 1000).toISOString()
      });
    }
    if (sc.status === 'Escalated') {
      complaint.timeline.push({
        id: uuidv4(),
        status: 'Escalated',
        remark: 'Auto-escalated to Supervisor level due to SLA breach.',
        actorId: null,
        actorName: 'System',
        actorRole: 'system',
        timestamp: new Date(created.getTime() + slaHours * 60 * 60 * 1000 + 1000).toISOString()
      });
    }
    if (sc.status === 'Resolved' || sc.status === 'Closed') {
      const resolvedAt = new Date(created.getTime() + (slaHours - 4) * 60 * 60 * 1000);
      complaint.resolution = {
        actionTaken: 'Issue inspected and rectified by field team.',
        resolutionDate: resolvedAt.toISOString(),
        remarks: 'Resolved within SLA window.',
        slaStatus: 'Within SLA'
      };
      complaint.timeline.push({
        id: uuidv4(),
        status: sc.status,
        remark: 'Marked resolved after field verification.',
        actorId: officer.id,
        actorName: officer.name,
        actorRole: 'officer',
        timestamp: resolvedAt.toISOString()
      });
    }

    db.get('complaints').push(complaint).write();
  });

  db.set('counters.complaint', counter).write();
  db.resumeSync();
  await db.syncToMongoDB();

  console.log('\nDatabase seeded successfully into MongoDB Atlas!\n');
  console.log('Demo accounts:');
  console.log('  Admin    -> admin@grievance.gov / Admin@123');
  officers.forEach(o => console.log(`  Officer  -> ${o.email} / Officer@123  (${o.department})`));
  citizens.forEach(c => console.log(`  Citizen  -> ${c.email} / Citizen@123`));
  
  process.exit(0);
}

seed();
