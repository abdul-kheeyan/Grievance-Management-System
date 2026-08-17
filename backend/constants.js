// Category -> Department mapping and SLA (in hours) per priority.
// These model the "structured escalation levels" and "SLA breach" rules
// from the project requirements.

const CATEGORIES = [
  { name: 'Water Supply', department: 'Water & Sanitation' },
  { name: 'Electricity', department: 'Power & Utilities' },
  { name: 'Roads & Infrastructure', department: 'Public Works' },
  { name: 'Sanitation & Waste', department: 'Water & Sanitation' },
  { name: 'Consumer Product/Service', department: 'Consumer Affairs' },
  { name: 'Billing & Payments', department: 'Finance & Billing' },
  { name: 'Public Transport', department: 'Transport' },
  { name: 'Healthcare Services', department: 'Health' },
  { name: 'Other', department: 'General Administration' }
];

const DEPARTMENTS = [...new Set(CATEGORIES.map(c => c.department))];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// SLA hours before a complaint breaches and is auto-escalated
const SLA_HOURS = {
  Critical: 24,
  High: 48,
  Medium: 96,
  Low: 168
};

const STATUSES = [
  'Submitted',
  'Assigned',
  'In Progress',
  'Escalated',
  'Resolved',
  'Closed'
];

// Escalation chain
const ESCALATION_LEVELS = ['Officer', 'Supervisor', 'Admin'];

function departmentForCategory(category) {
  const found = CATEGORIES.find(c => c.name === category);
  return found ? found.department : 'General Administration';
}

module.exports = {
  CATEGORIES,
  DEPARTMENTS,
  PRIORITIES,
  SLA_HOURS,
  STATUSES,
  ESCALATION_LEVELS,
  departmentForCategory
};
