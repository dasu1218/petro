import { useEffect } from 'react'
export function useUnsavedChanges(active) {
  useEffect(() => {
    if (!active) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}
