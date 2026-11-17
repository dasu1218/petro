import { ORDER_STATUSES } from './orderManagement.js';
export function dashboardSummary(groups, products, now = new Date()) {
  const orders = { total: 0, active: 0, recordedPayments: 0, deliveredCashDue: 0, deliveredCashOrders: 0, byStatus: Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) };
  for (const group of groups) {
    const { status, paymentStatus, paymentMethod } = group._id;
    orders.total += group.count;
    if (Object.hasOwn(orders.byStatus, status)) orders.byStatus[status] += group.count;
    if (['placed', 'processing', 'shipped'].includes(status)) orders.active += group.count;
    if (paymentStatus === 'paid') orders.recordedPayments += group.total;
    if (status === 'delivered' && paymentStatus === 'unpaid' && paymentMethod === 'cod') {
      orders.deliveredCashDue += group.total;
      orders.deliveredCashOrders += group.count;
    }
  }
  const visible = products.filter((product) => !product.isArchived);
  const lowStock = visible.flatMap((product) => product.variants.filter((variant) => variant.stock <= 5).map((variant) => ({ slug: product.slug, name: product.name, variantLabel: variant.label, stock: variant.stock })))
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'en') || a.variantLabel.localeCompare(b.variantLabel, 'en'));
  return {
    orders,
    products: { total: products.length, visible: visible.length, hidden: products.length - visible.length, lowStockVariants: lowStock.length },
    lowStock: lowStock.slice(0, 10), lowStockThreshold: 5, generatedAt: now.toISOString(),
  };
}
