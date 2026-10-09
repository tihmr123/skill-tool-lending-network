import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ListingForm from '../components/ListingForm';

export default function CreateListing() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(values) {
    setError('');
    setLoading(true);
    try {
      const listing = await api.createListing(values, token);
      navigate(`/listings/${listing.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-narrow">
      <h1>List a skill or tool</h1>
      <p className="page-subtitle">
        Share something with your neighborhood: a skill you can teach, or a tool you can lend.
      </p>
      <ListingForm
        submitLabel="Publish listing"
        busyLabel="Publishing..."
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}