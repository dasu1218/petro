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
  return { page, filter };
}
