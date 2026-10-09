import { useEffect, useState } from 'react';
import { api } from '../api';
import ListingCard from '../components/ListingCard';

const EMPTY = { q: '', type: '', category: '', area: '' };

// Removes case-insensitive duplicates, e.g. "Music" and "music"
const unique = (arr) => [...new Map(arr.map((v) => [v.toLowerCase(), v])).values()];

export default function Browse() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [options, setOptions] = useState({ categories: [], areas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function search(next) {
    setLoading(true);
    setError('');
    const params = {};
    Object.entries(next).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    try {
      setListings(await api.getListings(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search(EMPTY);
    api
      .getFilters()
      .then((data) =>
        setOptions({ categories: unique(data.categories), areas: unique(data.areas) })
      )
      .catch(() => {});
  }, []);

  function update(field, value, runNow) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    if (runNow) search(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    search(filters);
  }

  function clearFilters() {
    setFilters(EMPTY);
    search(EMPTY);
  }

  const hasFilters = Object.values(filters).some(Boolean);
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

      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search by title or description..."
          value={filters.q}
          onChange={(e) => update('q', e.target.value, false)}
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      <div className="filter-row">
        <select value={filters.type} onChange={(e) => update('type', e.target.value, true)}>
          <option value="">All types</option>
          <option value="skill">Skills</option>
          <option value="tool">Tools</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => update('category', e.target.value, true)}
        >
          <option value="">All categories</option>
          {options.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filters.area} onChange={(e) => update('area', e.target.value, true)}>
          <option value="">All areas</option>
          {options.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button className="btn btn-ghost" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {loading && <p className="empty-state">Loading listings...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p className="empty-state">
          {hasFilters
            ? 'No listings match your filters.'
            : 'No listings found. Be the first to share something!'}
        </p>
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