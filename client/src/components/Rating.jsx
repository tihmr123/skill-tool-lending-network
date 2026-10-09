export default function Rating({ avg, count }) {
  if (!count) return <span className="rating rating-none">No reviews yet</span>;

  return (
    <span className="rating">
      <span className="rating-star">★</span> {Number(avg).toFixed(1)}
      <span className="rating-count"> ({count})</span>
    </span>
  );
}