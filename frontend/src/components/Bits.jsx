import React from 'react';

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function PriorityPill({ priority }) {
  return <span className={`priority-pill priority-${priority}`}>{priority}</span>;
}

const LEVELS = [
  { key: 'Officer', desc: 'First point of contact — reviews and actions the complaint.' },
  { key: 'Supervisor', desc: 'Steps in when the officer-level SLA window is breached.' },
  { key: 'Admin', desc: 'Final escalation tier for unresolved, high-impact cases.' }
];

export function EscalationLadder({ escalationLevel, status }) {
  const resolved = status === 'Resolved' || status === 'Closed';
  return (
    <div className="ladder">
      {LEVELS.map((lvl, idx) => {
        const isActive = !resolved && idx === escalationLevel;
        const isPassed = resolved || idx < escalationLevel;
        return (
          <div key={lvl.key} className={`rung ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}>
            <div className="rung-mark">{isPassed ? '✓' : idx + 1}</div>
            <div className="rung-body">
              <div className="rung-title">{lvl.key} level</div>
              <div className="rung-sub">
                {isActive ? 'Currently handling this case' : isPassed ? 'Cleared' : lvl.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CaseSealStamp({ status }) {
  return (
    <div className="case-seal-stamp">
      <span className="stamp-label">Status</span>
      <span className="stamp-status">{status}</span>
    </div>
  );
}
