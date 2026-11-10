import { FREE_DELIVERY_THRESHOLD } from '../context/cartContext'
import { formatLKR } from '../lib/format'

function DeliveryProgress({ subtotal }) {
  const remaining = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0)

  return (
    <div className="delivery-progress">
      <p aria-live="polite">
        {remaining === 0
          ? 'Your order qualifies for free delivery.'
          : `Add ${formatLKR(remaining)} more for free delivery.`}
      </p>
      <progress
        aria-label="Progress toward free delivery"
        max={FREE_DELIVERY_THRESHOLD}
        value={Math.min(subtotal, FREE_DELIVERY_THRESHOLD)}
      />
    </div>
  )
}

export default DeliveryProgress
