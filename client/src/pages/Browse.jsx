import { useEffect, useState } from 'react';
import { api } from '../api';
import ListingCard from '../components/ListingCard';

export default function Browse() {
  const [listings, setListings] = useState([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(params = {}) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getListings(params);
      setListings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = {};
    if (q) params.q = q;
    if (type) params.type = type;
    load(params);
  }

  const available = listings.filter((l) => l.availability === 'available');
  const unavailable = listings.filter((l) => l.availability !== 'available');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Find a skill or tool nearby</h1>
        <p className="page-subtitle">
          Browse what your neighbors are offering to lend or teach.
        </p>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by title or description..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="skill">Skill</option>
          <option value="tool">Tool</option>
        </select>
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      {loading && <p className="empty-state">Loading listings...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p className="empty-state">No listings found. Be the first to share something!</p>
      )}

      {!loading && available.length > 0 && (
        <section className="listing-group">
          <h3 className="listing-group-title">Available ({available.length})</h3>
          <div className="listing-grid">
            {available.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {!loading && unavailable.length > 0 && (
        <section className="listing-group">
          <h3 className="listing-group-title">Unavailable ({unavailable.length})</h3>
          <div className="listing-grid">
            {unavailable.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}