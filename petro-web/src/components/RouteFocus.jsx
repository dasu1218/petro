import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
export default function RouteFocus() {
  const { pathname, hash } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const frame = requestAnimationFrame(() => {
      if (hash) return
      document.getElementById('main-content')?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}
