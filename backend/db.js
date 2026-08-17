require('dotenv').config();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Ensure data directory exists for lowdb fallback
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const lowDb = low(adapter);

lowDb.defaults({
  users: [],
  complaints: [],
  notifications: [],
  counters: { complaint: 0 }
}).write();

// Mongoose Schemas & Models for MongoDB Atlas
const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, required: true },
  department: String,
  createdAt: String
}, { strict: false });

const complaintSchema = new mongoose.Schema({
  id: { type: String, required: true },
  complaintId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: String,
  category: String,
  department: String,
  description: String,
  location: String,
  priority: String,
  status: String,
  escalationLevel: Number,
  assignedOfficerId: String,
  assignedOfficerName: String,
  attachments: Array,
  slaHours: Number,
  slaDeadline: String,
  createdAt: String,
  updatedAt: String,
  timeline: Array,
  resolution: Object
}, { strict: false });

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: String,
  title: String,
  message: String,
  complaintId: String,
  channels: Array,
  read: Boolean,
  createdAt: String
}, { strict: false });

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const ComplaintModel = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
const CounterModel = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

let isMongoConnected = false;
let syncPaused = false;
let lastMongoError = null;

async function syncToMongoDB() {
  if (!isMongoConnected || syncPaused) {
    if (!isMongoConnected) {
      console.log('[mongodb-sync-skipped] MongoDB is not connected.');
    }
    return;
  }
  try {
    const users = lowDb.get('users').value() || [];
    const complaints = lowDb.get('complaints').value() || [];
    const notifications = lowDb.get('notifications').value() || [];
    const counters = lowDb.get('counters').value() || { complaint: 0 };

    // Sync Users
    for (const u of users) {
      await UserModel.updateOne({ id: u.id }, { $set: u }, { upsert: true });
    }

    // Sync Complaints
    for (const c of complaints) {
      await ComplaintModel.updateOne({ id: c.id }, { $set: c }, { upsert: true });
    }

    // Sync Notifications
    for (const n of notifications) {
      await NotificationModel.updateOne({ id: n.id }, { $set: n }, { upsert: true });
    }

    // Sync Counter
    await CounterModel.updateOne({ _id: 'complaint' }, { $set: { seq: counters.complaint || 0 } }, { upsert: true });

    lastMongoError = null;
    console.log(`[mongodb-sync-success] Synced ${users.length} users, ${complaints.length} complaints to MongoDB Atlas.`);
  } catch (err) {
    lastMongoError = err.message;
    console.error('[mongodb-sync-error]', err.message);
  }
}

async function loadFromMongoDB() {
  if (!isMongoConnected) return;
  try {
    const mongoUsers = await UserModel.find({}).lean();
    const mongoComplaints = await ComplaintModel.find({}).lean();
    const mongoNotifications = await NotificationModel.find({}).lean();
    const mongoCounter = await CounterModel.findOne({ _id: 'complaint' }).lean();

    if (mongoUsers.length > 0) {
      lowDb.set('users', mongoUsers.map(({ __v, _id, ...rest }) => rest)).write();
    }
    if (mongoComplaints.length > 0) {
      lowDb.set('complaints', mongoComplaints.map(({ __v, _id, ...rest }) => rest)).write();
    }
    if (mongoNotifications.length > 0) {
      lowDb.set('notifications', mongoNotifications.map(({ __v, _id, ...rest }) => rest)).write();
    }
    if (mongoCounter) {
      lowDb.set('counters.complaint', mongoCounter.seq).write();
    }
    console.log(`[mongodb-load-success] Loaded ${mongoUsers.length} users, ${mongoComplaints.length} complaints from MongoDB Atlas.`);
  } catch (err) {
    lastMongoError = err.message;
    console.error('[mongodb-load-error]', err.message);
  }
}

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[mongodb] MONGODB_URI not set. Running in local file database mode.');
    isMongoConnected = false;
    return false;
  }
  try {
    await mongoose.connect(uri);
    isMongoConnected = true;
    lastMongoError = null;
    console.log('[mongodb] Connected to MongoDB Atlas Cloud Database successfully!');
    await loadFromMongoDB();
    return true;
  } catch (err) {
    isMongoConnected = false;
    lastMongoError = err.message;
    console.error('[mongodb-connection-failed]', err.message);
    console.log('[mongodb] Fallback to local file database mode.');
    return false;
  }
}

async function getDbStatus() {
  let mongoUserCount = 0;
  let mongoComplaintCount = 0;
  if (isMongoConnected) {
    try {
      mongoUserCount = await UserModel.countDocuments();
      mongoComplaintCount = await ComplaintModel.countDocuments();
    } catch (e) {
      console.error('[db-status-count-error]', e.message);
    }
  }
  return {
    isMongoConnected,
    mongooseReadyState: mongoose.connection.readyState, // 1 = connected, 0 = disconnected
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    lastMongoError,
    counts: {
      mongoAtlas: {
        users: mongoUserCount,
        complaints: mongoComplaintCount
      },
      lowDbLocal: {
        users: (lowDb.get('users').value() || []).length,
        complaints: (lowDb.get('complaints').value() || []).length
      }
    }
  };
}

const db = {
  get: (key) => {
    const chain = lowDb.get(key);
    const originalWrite = chain.write;
    chain.write = function (...args) {
      const res = originalWrite.apply(this, args);
      syncToMongoDB().catch(err => console.error('[bg-sync-error]', err.message));
      return res;
    };
    return chain;
  },
  set: (key, val) => {
    const chain = lowDb.set(key, val);
    const originalWrite = chain.write;
    chain.write = function (...args) {
      const res = originalWrite.apply(this, args);
      syncToMongoDB().catch(err => console.error('[bg-sync-error]', err.message));
      return res;
    };
    return chain;
  },
  defaults: (...args) => lowDb.defaults(...args),
  value: () => lowDb.value(),
  connectMongoDB,
  UserModel,
  ComplaintModel,
  NotificationModel,
  CounterModel,
  syncToMongoDB,
  getDbStatus,
  pauseSync: () => { syncPaused = true; },
  resumeSync: () => { syncPaused = false; },
  isMongoConnected: () => isMongoConnected
};

connectMongoDB();

module.exports = db;
