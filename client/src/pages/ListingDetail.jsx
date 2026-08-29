import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      await api.createRequest({ listing_id: listing.id, message }, token);
      setStatus('Request sent! Check the Requests page to track it.');
      setMessage('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="page">Loading...</div>;
  if (error && !listing) return <div className="page error-text">{error}</div>;
  if (!listing) return null;

  const isOwner = user && user.id === listing.owner_id;

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
        {listing.category && <p className="listing-category">{listing.category}</p>}
        <p className="listing-desc">{listing.description}</p>
        <p className="listing-owner">Shared by {listing.owner_name}</p>
      </div>

      {!isOwner && listing.availability === 'available' && (
        <form className="form-card" onSubmit={handleRequest}>
          <h3>Request to borrow</h3>
          {error && <p className="error-text">{error}</p>}
          {status && <p className="success-text">{status}</p>}
          <label>
            Message (optional)
            <textarea
              rows={3}
              placeholder="Let them know why you're interested or when you'd need it"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Send request
          </button>
        </form>
      )}

      {isOwner && (
        <p className="empty-state">This is your listing. Manage it from "My listings".</p>
      )}
      {!isOwner && listing.availability !== 'available' && (
        <p className="empty-state">This listing is currently unavailable.</p>
      )}
    </div>
  );
}