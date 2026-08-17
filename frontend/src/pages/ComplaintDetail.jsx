import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { StatusBadge, PriorityPill, EscalationLadder, CaseSealStamp } from '../components/Bits.jsx';
import { useAuth } from '../AuthContext.jsx';

const STATUS_OPTIONS = ['Assigned', 'In Progress', 'Escalated', 'Resolved', 'Closed'];

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const [statusForm, setStatusForm] = useState({ status: '', remark: '', actionTaken: '', remarks: '' });
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [busy, setBusy] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => { load(); }, [id]);

  function load() {
    setLoading(true);
    api.get(`/complaints/${id}`)
      .then(res => {
        setComplaint(res.data.complaint);
        setStatusForm(f => ({ ...f, status: res.data.complaint.status }));
        if (user.role === 'admin') {
          return api.get('/users/officers', { params: { department: res.data.complaint.department } })
            .then(r => setOfficers(r.data.officers));
        }
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load this complaint.'))
      .finally(() => setLoading(false));
  }

  async function submitStatusUpdate(e) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await api.patch(`/complaints/${id}/status`, statusForm);
      setComplaint(res.data.complaint);
      setNotice('Status updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  }

  async function assignOfficer() {
    if (!selectedOfficer) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await api.patch(`/complaints/${id}/assign`, { officerId: selectedOfficer });
      setComplaint(res.data.complaint);
      setNotice('Officer assigned.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not assign officer.');
    } finally {
      setBusy(false);
    }
  }

  async function requestEscalation() {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await api.post(`/complaints/${id}/escalate`, { reason: 'Escalation requested by citizen.' });
      setComplaint(res.data.complaint);
      setNotice('Your complaint has been escalated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not escalate this complaint.');
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(e) {
    e.preventDefault();
    if (!ratingValue) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await api.post(`/complaints/${id}/feedback`, { rating: ratingValue, feedback: feedbackText });
      setComplaint(res.data.complaint);
      setNotice('Thanks for your feedback!');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your feedback.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Layout title="Complaint"><div className="loading-block">Loading case file…</div></Layout>;
  if (!complaint) return <Layout title="Complaint"><div className="field-error">{error || 'Complaint not found.'}</div></Layout>;

  const isResolved = complaint.status === 'Resolved' || complaint.status === 'Closed';
  const canAct = (user.role === 'officer' && user.department === complaint.department) || user.role === 'admin';

  return (
    <Layout title={complaint.complaintId} subtitle={complaint.category}>
      <Link to="/" className="btn btn-outline btn-sm" style={{ marginBottom: 18 }}>← Back</Link>

      {error && <div className="field-error">{error}</div>}
      {notice && <div className="field-success">{notice}</div>}

      <div className="grid grid-2" style={{ alignItems: 'start', gridTemplateColumns: '1.4fr 1fr' }}>
        <div>
          <div className="card">
            <div className="case-header">
              <div>
                <div className="complaint-id mono">{complaint.complaintId}</div>
                <h2>{complaint.category}</h2>
                <div className="complaint-meta" style={{ marginTop: 6 }}>
                  <StatusBadge status={complaint.status} />
                  <PriorityPill priority={complaint.priority} />
                  <span>{complaint.department}</span>
                </div>
              </div>
              <CaseSealStamp status={complaint.status} />
            </div>

            <hr className="divider" />

            <div className="section-title">Description</div>
            <p>{complaint.description}</p>

            <div className="grid grid-2">
              <div>
                <div className="section-title">Location</div>
                <p>{complaint.location}</p>
              </div>
              <div>
                <div className="section-title">Filed by</div>
                <p>{complaint.userName}</p>
              </div>
              <div>
                <div className="section-title">Filed on</div>
                <p>{new Date(complaint.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <div className="section-title">SLA deadline (current level)</div>
                <p>{new Date(complaint.slaDeadline).toLocaleString()}</p>
              </div>
              <div>
                <div className="section-title">Assigned officer</div>
                <p>{complaint.assignedOfficerName || '— Not yet assigned —'}</p>
              </div>
            </div>

            {complaint.attachments?.length > 0 && (
              <>
                <div className="section-title">Attachments</div>
                <div>
                  {complaint.attachments.map(a => (
                    <a
                      key={a.filename}
                      className="attachment-chip"
                      href={`/api/complaints/${complaint.id}/attachments/${a.filename}?token=`}
                      onClick={async e => {
                        e.preventDefault();
                        const res = await api.get(`/complaints/${complaint.id}/attachments/${a.filename}`, { responseType: 'blob' });
                        const url = URL.createObjectURL(res.data);
                        window.open(url, '_blank');
                      }}
                    >
                      📎 {a.originalName}
                    </a>
                  ))}
                </div>
              </>
            )}

            {complaint.resolution && (
              <>
                <div className="section-title">Resolution</div>
                <p><strong>Action taken:</strong> {complaint.resolution.actionTaken}</p>
                {complaint.resolution.remarks && <p><strong>Remarks:</strong> {complaint.resolution.remarks}</p>}
                <p><strong>SLA status:</strong> {complaint.resolution.slaStatus}</p>

                {complaint.resolution.satisfactionRating ? (
                  <>
                    <div className="section-title">Your feedback</div>
                    <div className="rating-readonly">{'★'.repeat(complaint.resolution.satisfactionRating)}{'☆'.repeat(5 - complaint.resolution.satisfactionRating)}</div>
                    {complaint.resolution.satisfactionFeedback && <p style={{ marginTop: 6 }}>{complaint.resolution.satisfactionFeedback}</p>}
                  </>
                ) : user.role === 'citizen' ? (
                  <>
                    <div className="section-title">Rate this resolution</div>
                    <form onSubmit={submitFeedback}>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            type="button"
                            key={n}
                            className={`rating-star ${n <= (ratingHover || ratingValue) ? 'filled' : ''}`}
                            onMouseEnter={() => setRatingHover(n)}
                            onMouseLeave={() => setRatingHover(0)}
                            onClick={() => setRatingValue(n)}
                            aria-label={`${n} star`}
                          >★</button>
                        ))}
                      </div>
                      <div className="field">
                        <textarea
                          placeholder="Optional comments about how this was handled…"
                          value={feedbackText}
                          onChange={e => setFeedbackText(e.target.value)}
                        />
                      </div>
                      <button className="btn btn-seal" type="submit" disabled={busy || !ratingValue}>
                        Submit feedback
                      </button>
                    </form>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Status timeline</div>
            <div className="timeline">
              {complaint.timeline.map(t => (
                <div className="timeline-item" key={t.id}>
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-status">{t.status}</div>
                    <div className="timeline-remark">{t.remark}</div>
                    <div className="timeline-meta">{t.actorName} ({t.actorRole}) · {new Date(t.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-title" style={{ marginTop: 0 }}>Escalation ladder</div>
          <EscalationLadder escalationLevel={complaint.escalationLevel} status={complaint.status} />

          {user.role === 'citizen' && !isResolved && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Not satisfied with progress?</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                You can request this complaint be escalated to the next level for faster attention.
              </p>
              <button className="btn btn-outline btn-block" onClick={requestEscalation} disabled={busy || complaint.escalationLevel >= 2}>
                Request escalation
              </button>
            </div>
          )}

          {user.role === 'admin' && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Assign officer</div>
              <div className="field">
                <select value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)}>
                  <option value="">Select an officer…</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-block" onClick={assignOfficer} disabled={busy || !selectedOfficer}>
                Assign
              </button>
            </div>
          )}

          {canAct && !isResolved && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Update status</div>
              <form onSubmit={submitStatusUpdate}>
                <div className="field">
                  <label>New status</label>
                  <select value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Remark</label>
                  <textarea value={statusForm.remark} onChange={e => setStatusForm(f => ({ ...f, remark: e.target.value }))} placeholder="What was done / what's next?" />
                </div>
                {(statusForm.status === 'Resolved' || statusForm.status === 'Closed') && (
                  <>
                    <div className="field">
                      <label>Action taken</label>
                      <textarea value={statusForm.actionTaken} onChange={e => setStatusForm(f => ({ ...f, actionTaken: e.target.value }))} placeholder="Describe the resolution…" />
                    </div>
                    <div className="field">
                      <label>Resolution remarks</label>
                      <input value={statusForm.remarks} onChange={e => setStatusForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
                  </>
                )}
                <button className="btn btn-seal btn-block" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save update'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
