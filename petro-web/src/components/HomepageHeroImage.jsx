import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
export default function HomepageHeroImage() {
  const [settings, setSettings] = useState(null)
  const [failedUrl, setFailedUrl] = useState('')
  useEffect(() => {
    let ignore = false
    const load = () => apiRequest('/homepage').then((data) => { if (!ignore) setSettings(data) }).catch(() => {})
    load()
    window.addEventListener('focus', load)
    return () => { ignore = true; window.removeEventListener('focus', load) }
  }, [])
  return <div className="product-image product-rose homepage-hero-photo">{settings?.image?.url && settings.image.url !== failedUrl ? <img src={settings.image.url} alt={settings.alt} width="640" height="400" fetchPriority="high" onError={() => setFailedUrl(settings.image.url)} /> : <span aria-label="Pet care bundles">🐾</span>}</div>
}
