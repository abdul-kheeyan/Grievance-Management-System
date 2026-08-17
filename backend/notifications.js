// Simulated email/SMS dispatch layer.
//
// This project does not have real SMTP/SMS provider credentials wired up,
// so instead of silently dropping the "Email/SMS notifications" and "User
// receives confirmation" requirements, every notification is:
//   1) persisted so the recipient can see it in-app (GET /api/notifications)
//   2) logged to the server console tagged [notify], standing in for the
//      real email/SMS send call a production deployment would make here.
//
// Swapping in a real provider later means editing ONLY this file — e.g.
// call nodemailer/Twilio inside notify() in addition to the db write below.

const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function notify(userId, { title, message, complaintId }) {
  if (!userId) return null;
  const notification = {
    id: uuidv4(),
    userId,
    title,
    message,
    complaintId: complaintId || null,
    channels: ['email', 'sms'],
    read: false,
    createdAt: new Date().toISOString()
  };
  db.get('notifications').push(notification).write();
  console.log(`[notify] (email+sms simulated) -> user ${userId}: "${title}" — ${message}`);
  return notification;
}

module.exports = { notify };
