import { Link } from 'react-router-dom';

export default function ListingCard({ listing }) {
  return (
    <Link to={`/listings/${listing.id}`} className="listing-card">
      <div className="listing-card-top">
        <span className={`tag tag-${listing.type}`}>{listing.type}</span>
        <span className={`status status-${listing.availability}`}>
          {listing.availability === 'available' ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <h3>{listing.title}</h3>
      {listing.category && <p className="listing-category">{listing.category}</p>}
      <p className="listing-desc">{listing.description}</p>
      <p className="listing-owner">Shared by {listing.owner_name}</p>
    </Link>
  );
}