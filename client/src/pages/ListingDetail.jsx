import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Rating from '../components/Rating';
import { formatDeposit } from '../format';

// SQLite stores UTC timestamps as "YYYY-MM-DD HH:MM:SS"
function formatDate(value) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString();
}

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setLoadError(err.message));
    api
      .getReviews(id)
      .then(setReviews)
      .catch(() => {});
  }, [id]);

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api.createRequest({ listing_id: listing.id, message }, token);
      setRequested(true);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return (
      <div className="page page-narrow">
        <p className="error-text">{loadError}</p>
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="page page-narrow">
        <p className="empty-state">Loading...</p>
      </div>
    );
  }

  const isTool = listing.type === 'tool';
  const isOwner = user && user.id === listing.owner_id;
  const deposit = isTool ? formatDeposit(listing.deposit_amount) : null;
  const canRequest = listing.availability === 'available';

  return (
    <div className="page page-narrow">
      <Link to="/" className="back-link">
        &larr; Back to browse
      </Link>

      <div className="detail-card">
        <div className="listing-card-top">
          <span className={`tag tag-${listing.type}`}>{listing.type}</span>
          <span className={`status status-${listing.availability}`}>
            {listing.availability === 'available' ? 'Available' : 'Unavailable'}
          </span>
        </div>
        <h1>{listing.title}</h1>
        {(listing.category || listing.area) && (
          <p className="listing-meta">
            {listing.category && <span>{listing.category}</span>}
            {listing.area && <span>{listing.area}</span>}
          </p>
        )}
        <p className="listing-desc">{listing.description}</p>
        <div className="listing-foot">
          <Rating avg={listing.avg_rating} count={listing.review_count} />
          {deposit && <span className="deposit">Refundable deposit {deposit}</span>}
        </div>
        <p className="listing-owner">Shared by {listing.owner_name}</p>
      </div>

      {isOwner && (
        <p className="empty-state">
          This is your listing. <Link to={`/listings/${listing.id}/edit`}>Edit it</Link> or manage
          it from <Link to="/my-listings">My listings</Link>.
        </p>
      )}

      {!isOwner && !canRequest && (
        <p className="empty-state">
          {isTool
            ? 'This tool is currently lent out. Check back later.'
            : 'The owner has paused this listing for now.'}
        </p>
      )}

      {!isOwner && canRequest && !token && (
        <p className="empty-state">
          <Link to="/login">Log in</Link> to send a request.
        </p>
      )}

      {!isOwner && canRequest && token && requested && (
        <div className="form-card">
          <p className="success-text">
            Request sent. Track it on the <Link to="/requests">Requests</Link> page. You'll see
            the owner's email there once they accept.
          </p>
        </div>
      )}

      {!isOwner && canRequest && token && !requested && (
        <form className="form-card" onSubmit={handleRequest}>
          <h3>{isTool ? 'Request to borrow' : 'Request a session'}</h3>
          {deposit && (
            <p className="hint-text">
              The owner asks for a refundable deposit of {deposit}, settled in person when you
              pick the tool up. The app doesn't handle payments.
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
          <label>
            Message (optional)
            <textarea
              rows={3}
              placeholder={
                isTool
                  ? "Let them know when you'd need it and for how long"
                  : "Tell them what you'd like to learn and when you're free"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send request'}
          </button>
        </form>
      )}

      <section className="reviews-section">
        <h3>Reviews ({reviews.length})</h3>
        {reviews.length === 0 && <p className="empty-state">No reviews yet.</p>}
        {reviews.map((r) => (
          <div className="review-item" key={r.id}>
            <div className="review-head">
              <span className="review-stars">
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </span>
              <span className="review-who">
                {r.reviewer_name} · {formatDate(r.created_at)}
              </span>
            </div>
            {r.comment && <p className="review-comment">{r.comment}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}