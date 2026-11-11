export const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
export const NEXT_STATUS = { placed: 'processing', processing: 'shipped', shipped: 'delivered' };
export function validateStatusChange(current, next) {
  if (!NEXT_STATUS[current] || NEXT_STATUS[current] !== next) throw Object.assign(new Error('Orders must progress from placed to processing, shipped, then delivered.'), { status: 409 });
}
