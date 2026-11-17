import { useEffect, useRef, useState } from 'react'
export default function ClearCartButton({ itemCount, onClear }) {
  const [confirming, setConfirming] = useState(false)
  const triggerRef = useRef(null)
  const cancelRef = useRef(null)
  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])
  const cancel = () => { setConfirming(false); requestAnimationFrame(() => triggerRef.current?.focus()) }
  if (!confirming) return <button ref={triggerRef} type="button" className="cart-clear" onClick={() => setConfirming(true)}>Clear cart</button>
  return <div className="cart-clear-confirmation" role="group" aria-label="Confirm clearing your cart" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancel() } }}>
    <p>Remove all {itemCount} {itemCount === 1 ? 'item' : 'items'} from your cart?</p>
    <div className="cta-row"><button ref={cancelRef} type="button" className="btn btn-secondary" onClick={cancel}>Keep my items</button><button type="button" className="btn btn-primary" onClick={onClear}>Clear all items</button></div>
  </div>
}
