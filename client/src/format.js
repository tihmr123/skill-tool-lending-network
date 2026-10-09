// Change this symbol if your project uses a different currency
export const CURRENCY = '₹';

export function formatDeposit(amount) {
  return amount > 0 ? `${CURRENCY}${amount}` : null;
}