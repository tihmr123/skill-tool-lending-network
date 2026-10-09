import { useState } from 'react';

export default function ListingForm({
  initial,
  isEdit = false,
  submitLabel,
  busyLabel,
  loading,
  error,
  onSubmit,
}) {
  const [type, setType] = useState(initial?.type || 'skill');
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [area, setArea] = useState(initial?.area || '');
  const [deposit, setDeposit] = useState(
    initial?.deposit_amount ? String(initial.deposit_amount) : ''
  );
  const [description, setDescription] = useState(initial?.description || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      type,
      title,
      category,
      area,
      description,
      deposit_amount: type === 'tool' ? deposit : 0,
    });
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      {error && <p className="error-text">{error}</p>}

      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value)} disabled={isEdit}>
          <option value="skill">Skill (something you can teach)</option>
          <option value="tool">Tool (something you can lend)</option>
        </select>
        {isEdit && <span className="field-hint">Type can't be changed after publishing.</span>}
      </label>

      <label>
        Title
        <input
          type="text"
          placeholder="e.g. Beginner guitar lessons, Electric drill"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
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
          maxLength={50}
        />
      </label>

      <label>
        Area
        <input
          type="text"
          placeholder="e.g. Riverside, North Campus"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          maxLength={60}
        />
        <span className="field-hint">Helps people find listings close to them.</span>
      </label>

      {type === 'tool' && (
        <label>
          Refundable deposit (optional)
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
          <span className="field-hint">
            Shown to borrowers and settled in person. The app doesn't handle payments.
          </span>
        </label>
      )}

      <label>
        Description
        <textarea
          rows={4}
          placeholder="Describe what you're offering, your experience, or the item's condition"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? busyLabel : submitLabel}
      </button>
    </form>
  );
}