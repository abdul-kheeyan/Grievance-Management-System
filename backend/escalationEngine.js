const cron = require('node-cron');
const db = require('./db');
const { ESCALATION_LEVELS } = require('./constants');
const { notify } = require('./notifications');

// Checks all open complaints; if the SLA deadline has passed and the
// complaint has not yet reached the top escalation level, it is bumped
// to the next level (Officer -> Supervisor -> Admin) automatically.
function runEscalationSweep() {
  const complaints = db.get('complaints').value();
  const now = new Date();
  let escalatedCount = 0;

  complaints.forEach(complaint => {
    if (complaint.status === 'Resolved' || complaint.status === 'Closed') return;
    if (complaint.escalationLevel >= ESCALATION_LEVELS.length - 1) return;

    const deadline = new Date(complaint.slaDeadline);
    if (now > deadline) {
      complaint.escalationLevel += 1;
      complaint.status = 'Escalated';
      complaint.updatedAt = now.toISOString();
      // Give the next level a fresh window (half the original SLA) to act.
      const extension = complaint.slaHours * 60 * 60 * 1000 * 0.5;
      complaint.slaDeadline = new Date(now.getTime() + extension).toISOString();

      complaint.timeline.push({
        id: `auto-${Date.now()}-${complaint.id}`,
        status: 'Escalated',
        remark: `Auto-escalated to ${ESCALATION_LEVELS[complaint.escalationLevel]} level due to SLA breach.`,
        actorId: null,
        actorName: 'System',
        actorRole: 'system',
        timestamp: now.toISOString()
      });

      db.get('complaints').find({ id: complaint.id }).assign(complaint).write();
      escalatedCount += 1;

      const levelName = ESCALATION_LEVELS[complaint.escalationLevel];
      notify(complaint.userId, {
        title: 'Complaint auto-escalated (SLA breach)',
        message: `Your complaint ${complaint.complaintId} missed its resolution window and has been auto-escalated to ${levelName} level.`,
        complaintId: complaint.id
      });
      if (complaint.assignedOfficerId) {
        notify(complaint.assignedOfficerId, {
          title: 'SLA breached — complaint escalated',
          message: `Complaint ${complaint.complaintId} breached its SLA and has been escalated to ${levelName} level.`,
          complaintId: complaint.id
        });
      }
    }
  });

  if (escalatedCount > 0) {
    console.log(`[escalation-engine] Auto-escalated ${escalatedCount} complaint(s) at ${now.toISOString()}`);
  }
}

function startEscalationEngine() {
  // Run every minute — frequent enough for a responsive demo without
  // being wasteful. In production this would run on a longer interval
  // (e.g. every 15 minutes) via the same cron mechanism.
  cron.schedule('* * * * *', runEscalationSweep);
  console.log('[escalation-engine] Started (checking SLA breaches every minute).');
}

module.exports = { startEscalationEngine, runEscalationSweep };
