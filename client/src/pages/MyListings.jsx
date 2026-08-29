import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  function load() {
    setLoading(true);
    api
      .getMyListings(token)
      .then(setListings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleDelete(id) {
    if (!confirm('Delete this listing?')) return;
    try {
      await api.deleteListing(id, token);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleAvailability(listing) {
    const next = listing.availability === 'available' ? 'unavailable' : 'available';
    try {
      await api.updateListing(listing.id, { availability: next }, token);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My listings</h1>
        <Link to="/create" className="btn btn-primary">
          + New listing
        </Link>
      </div>

      {loading && <p className="empty-state">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && listings.length === 0 && (
        <p className="empty-state">
          You haven't listed anything yet. <Link to="/create">Share your first skill or tool</Link>.
        </p>
      )}

      <div className="manage-list">
        {listings.map((listing) => (
          <div className="manage-row" key={listing.id}>
            <div>
              <span className={`tag tag-${listing.type}`}>{listing.type}</span>
              <Link to={`/listings/${listing.id}`} className="manage-title">
                {listing.title}
              </Link>
              <span className={`status status-${listing.availability}`}>
                {listing.availability}
              </span>
            </div>
            <div className="manage-actions">
              <button className="btn btn-ghost" onClick={() => toggleAvailability(listing)}>
                Mark {listing.availability === 'available' ? 'unavailable' : 'available'}
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(listing.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}