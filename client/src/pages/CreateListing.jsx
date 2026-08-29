import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function CreateListing() {
  const [type, setType] = useState('skill');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const listing = await api.createListing({ type, title, description, category }, token);
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
        Share something with your neighborhood — a skill you can teach, or a tool you can lend.
      </p>
      <form className="form-card" onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}

        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="skill">Skill</option>
            <option value="tool">Tool</option>
          </select>
        </label>

        <label>
          Title
          <input
            type="text"
            placeholder="e.g. Beginner guitar lessons, Electric drill"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          Category
          <input
            type="text"
            placeholder="e.g. Music, Home improvement, Cooking"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>

        <label>
          Description
          <textarea
            rows={4}
            placeholder="Describe what you're offering, your experience, or the item's condition"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Publishing...' : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}