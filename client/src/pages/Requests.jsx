import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_ORDER = ['pending', 'accepted', 'declined', 'returned'];
const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  returned: 'Returned',
};

export default function Requests() {
  const [tab, setTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  function load() {
    setLoading(true);
    Promise.all([api.getReceivedRequests(token), api.getSentRequests(token)])
      .then(([r, s]) => {
        setReceived(r);
        setSent(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function respond(id, status) {
    try {
      await api.respondToRequest(id, status, token);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

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
          {tab === 'received' ? 'No one has requested your items yet.' : "You haven't requested anything yet."}
        </p>
      )}

      {!loading &&
        list.length > 0 &&
        STATUS_ORDER.map((status) => {
          const group = list.filter((r) => r.status === status);
          if (group.length === 0) return null;

          return (
            <section className="request-group" key={status}>
              <h3 className="request-group-title">
                {STATUS_LABELS[status]} ({group.length})
              </h3>
              <div className="manage-list">
                {group.map((r) => (
                  <div className="manage-row" key={r.id}>
                    <div>
                      <span className={`tag tag-${r.listing_type}`}>{r.listing_type}</span>
                      <span className="manage-title">{r.listing_title}</span>
                      {tab === 'received' && (
                        <span className="listing-owner"> from {r.requester_name}</span>
                      )}
                      <span className={`status status-req-${r.status}`}>{r.status}</span>
                      {r.message && <p className="request-message">"{r.message}"</p>}
                    </div>
                    {tab === 'received' && r.status === 'pending' && (
                      <div className="manage-actions">
                        <button className="btn btn-primary" onClick={() => respond(r.id, 'accepted')}>
                          Accept
                        </button>
                        <button className="btn btn-danger" onClick={() => respond(r.id, 'declined')}>
                          Decline
                        </button>
                      </div>
                    )}
                    {tab === 'received' && r.status === 'accepted' && (
                      <div className="manage-actions">
                        <button className="btn btn-ghost" onClick={() => respond(r.id, 'returned')}>
                          Mark returned
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}