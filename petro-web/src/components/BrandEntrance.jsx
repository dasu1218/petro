import { useEffect, useRef, useState } from 'react'
const SEEN_KEY = 'petro_welcome_seen_v1'
function shouldShow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try { return sessionStorage.getItem(SEEN_KEY) !== '1' } catch { return true }
}
export default function BrandEntrance() {
  const [visible, setVisible] = useState(shouldShow)
  const dialogRef = useRef(null)
  useEffect(() => {
    if (!visible) return
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* The intro still works without browser storage. */ }
    const timer = setTimeout(() => setVisible(false), 2400)
    return () => { clearTimeout(timer); document.body.style.overflow = previousOverflow; dialog.close() }
  }, [visible])
  if (!visible) return null
  return <dialog ref={dialogRef} className="brand-entrance" aria-labelledby="brand-entrance-title" aria-describedby="brand-entrance-description" onCancel={(event) => { event.preventDefault(); setVisible(false) }}>
    <button type="button" className="entrance-skip" onClick={() => setVisible(false)} autoFocus>Skip introduction <span aria-hidden="true">↗</span></button>
    <div className="entrance-content">
      <div className="entrance-logo-stage"><span className="entrance-orbit" aria-hidden="true" /><span className="entrance-logo-frame"><img src="/petro-logo.jpeg" alt="Petro" width="520" height="636" fetchPriority="high" onError={() => setVisible(false)} /></span></div>
      <span className="entrance-eyebrow">A little care. A happier pet.</span>
      <h2 id="brand-entrance-title">Welcome to their happy place.</h2>
      <p id="brand-entrance-description">Everyday essentials for the paws you love.</p>
      <button type="button" className="btn btn-primary entrance-enter" onClick={() => setVisible(false)}>Enter Petro <span aria-hidden="true">→</span></button>
      <div className="entrance-progress" aria-hidden="true"><span /></div>
    </div>
    <span className="entrance-signoff" aria-hidden="true">PET CARE, WITH LOVE · PETRO</span>
  </dialog>
}
