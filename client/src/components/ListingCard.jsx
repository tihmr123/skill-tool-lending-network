import { Link } from 'react-router-dom';
import Rating from './Rating';
import { formatDeposit } from '../format';

export default function ListingCard({ listing }) {
  const deposit = listing.type === 'tool' ? formatDeposit(listing.deposit_amount) : null;

  return (
    <Link to={`/listings/${listing.id}`} className="listing-card">
      <div className="listing-card-top">
        <span className={`tag tag-${listing.type}`}>{listing.type}</span>
        <span className={`status status-${listing.availability}`}>
          {listing.availability === 'available' ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <h3>{listing.title}</h3>
      {(listing.category || listing.area) && (
        <p className="listing-meta">
          {listing.category && <span>{listing.category}</span>}
          {listing.area && <span>{listing.area}</span>}
        </p>
      )}
      <p className="listing-desc">{listing.description}</p>
      <div className="listing-foot">
        <Rating avg={listing.avg_rating} count={listing.review_count} />
        {deposit && <span className="deposit">Deposit {deposit}</span>}
      </div>
      <p className="listing-owner">Shared by {listing.owner_name}</p>
    </Link>
  );
}