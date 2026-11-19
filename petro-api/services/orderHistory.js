import { ORDER_STATUSES } from './orderManagement.js';
export const HISTORY_PAGE_SIZE = 10;
export function orderHistoryQuery(query = {}) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  const rawPage = query.page === undefined ? '1' : query.page;
  if (typeof rawPage !== 'string' || !/^\d+$/.test(rawPage)) fail('Invalid order history page');
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) fail('Invalid order history page');
  const filter = {};
  if (query.status !== undefined && query.status !== '') {
    if (!ORDER_STATUSES.includes(query.status)) fail('Invalid order status filter');
    filter.status = query.status;
  }
  if (query.payment !== undefined && query.payment !== '') {
    if (!['paid', 'unpaid'].includes(query.payment)) fail('Invalid payment status filter');
    filter.paymentStatus = query.payment;
  }
  if (query.reference !== undefined && query.reference !== '') {
    if (typeof query.reference !== 'string' || !/^[a-fA-F0-9]{24}$/.test(query.reference.trim())) fail('Enter the full 24-character order reference');
    filter._id = query.reference.trim().toLowerCase();
  }
  const choice = query.sort === undefined || query.sort === '' ? 'newest' : query.sort;
  if (!['newest', 'oldest'].includes(choice)) fail('Invalid order sort');
  const direction = choice === 'oldest' ? 1 : -1;
  return { page, filter, sort: { createdAt: direction, _id: direction } };
}
