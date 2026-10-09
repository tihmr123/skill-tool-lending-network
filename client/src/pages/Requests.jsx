import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatDeposit } from '../format';

const STATUS_ORDER = ['pending', 'accepted', 'declined', 'returned'];
const GROUP_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  returned: 'Returned / completed',
};

// Tools are "returned", skills are "completed"
function statusLabel(r) {
  return r.status === 'returned' && r.listing_type === 'skill' ? 'completed' : r.status;
}

function RequestRow({ r, tab, token, onChanged, onError }) {
  const [returning, setReturning] = useState(false);
  const [damage, setDamage] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const isTool = r.listing_type === 'tool';
  const deposit = isTool ? formatDeposit(r.deposit_amount) : null;
  const isReceived = tab === 'received';
  const otherName = isReceived ? r.requester_name : r.owner_name;
  const otherEmail = isReceived ? r.requester_email : r.owner_email;

  async function run(action) {
    onError('');
    setBusy(true);
    try {
      await action();
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const respond = (status, extra) =>
    run(() => api.respondToRequest(r.id, status, token, extra));

  function confirmReturn() {
    const notes = damage.trim();
    respond('returned', notes ? { damage_notes: notes } : {});
  }

  function cancel() {
    if (!window.confirm('Cancel this request?')) return;
    run(() => api.cancelRequest(r.id, token));
  }

  function submitReview(e) {
    e.preventDefault();
    run(async () => {
      await api.createReview({ request_id: r.id, rating: Number(rating), comment }, token);
      setReviewing(false);
    });
  }

  return (
    <div className="request-card">
      <div className="request-top">
        <div className="request-main">
          <div className="request-head">
            <span className={`tag tag-${r.listing_type}`}>{r.listing_type}</span>
            <Link to={`/listings/${r.listing_id}`} className="manage-title">
              {r.listing_title}
            </Link>
            <span className={`status status-req-${r.status}`}>{statusLabel(r)}</span>
          </div>
          <p className="request-people">
            {isReceived ? `Requested by ${otherName}` : `Owner: ${otherName}`}
            {deposit && ` · Deposit ${deposit}, settled in person`}
          </p>
          {r.message && <p className="request-message">"{r.message}"</p>}
          {otherEmail && (
            <p className="contact-line">
              Contact {otherName}: <a href={`mailto:${otherEmail}`}>{otherEmail}</a>
            </p>
          )}
          {r.damage_notes && <p className="damage-note">Condition notes: {r.damage_notes}</p>}
        </div>

        <div className="manage-actions">
          {isReceived && r.status === 'pending' && (
            <>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => respond('accepted')}
              >
                Accept
              </button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => respond('declined')}
              >
                Decline
              </button>
            </>
          )}

          {isReceived && r.status === 'accepted' && !returning && (
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => (isTool ? setReturning(true) : respond('returned'))}
            >
              {isTool ? 'Mark returned' : 'Mark completed'}
            </button>
          )}

          {!isReceived && r.status === 'pending' && (
            <button className="btn btn-danger" disabled={busy} onClick={cancel}>
              Cancel request
            </button>
          )}

          {!isReceived && r.status === 'returned' && !r.reviewed && !reviewing && (
            <button className="btn btn-primary" onClick={() => setReviewing(true)}>
              Leave a review
            </button>
          )}

          {!isReceived && r.status === 'returned' && Boolean(r.reviewed) && (
            <span className="reviewed-note">Reviewed</span>
          )}
        </div>
      </div>

      {returning && (
        <div className="inline-form">
          <label>
            Condition notes (optional)
            <textarea
              rows={2}
              placeholder="Note any damage or missing parts"
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              maxLength={300}
            />
          </label>
          <div className="manage-actions">
            <button className="btn btn-primary" disabled={busy} onClick={confirmReturn}>
              Confirm return
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setReturning(false)}>
              Back
            </button>
          </div>
        </div>
      )}

      {reviewing && (
        <form className="inline-form" onSubmit={submitReview}>
          <label>
            Rating
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Okay</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Bad</option>
            </select>
          </label>
          <label>
            Comment (optional)
            <textarea
              rows={2}
              placeholder="How did it go?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
          </label>
          <div className="manage-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Submit review
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => setReviewing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Requests() {
  const [tab, setTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const load = useCallback(() => {
    return Promise.all([api.getReceivedRequests(token), api.getSentRequests(token)])
      .then(([r, s]) => {
        setReceived(r);
        setSent(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const list = tab === 'received' ? received : sent;

  return (
    <div className="page">
      <h1>Requests</h1>

      <div className="tabs">
        <button
          className={`tab ${tab === 'received' ? 'tab-active' : ''}`}
          onClick={() => setTab('received')}
        >
          Received ({received.length})
        </button>
        <button
          className={`tab ${tab === 'sent' ? 'tab-active' : ''}`}
          onClick={() => setTab('sent')}
        >
          Sent ({sent.length})
        </button>
      </div>

      {loading && <p className="empty-state">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && list.length === 0 && (
        <p className="empty-state">
          {tab === 'received'
            ? 'No one has requested your listings yet.'
            : "You haven't requested anything yet."}
        </p>
      )}

      {!loading &&
        STATUS_ORDER.map((status) => {
          const group = list.filter((r) => r.status === status);
          if (group.length === 0) return null;

          return (
            <section className="request-group" key={status}>
              <h3 className="request-group-title">
                {GROUP_LABELS[status]} ({group.length})
              </h3>
              <div className="manage-list">
                {group.map((r) => (
                  <RequestRow
                    key={r.id}
                    r={r}
                    tab={tab}
                    token={token}
                    onChanged={load}
                    onError={setError}
                  />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}