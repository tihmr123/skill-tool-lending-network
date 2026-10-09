import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ListingForm from '../components/ListingForm';

export default function EditListing() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setLoadError(err.message));
  }, [id]);

  async function handleSubmit(values) {
    setError('');
    setSaving(true);
    try {
      await api.updateListing(id, values, token);
      navigate(`/listings/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
  if (listing.owner_id !== user?.id) {
    return (
      <div className="page page-narrow">
        <p className="error-text">You can only edit your own listings.</p>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <Link to="/my-listings" className="back-link">
        &larr; Back to my listings
      </Link>
      <h1>Edit listing</h1>
      <ListingForm
        initial={listing}
        isEdit
        submitLabel="Save changes"
        busyLabel="Saving..."
        loading={saving}
        error={error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}