import { useState } from 'react'
export default function ProductPhoto({ src, alt, className = '', ...props }) {
  const [failedUrl, setFailedUrl] = useState(null)
  if (!src || failedUrl === src) return <span className={`${className} product-photo-fallback`} role={alt ? 'img' : undefined} aria-label={alt ? `${alt}: photo unavailable` : undefined} aria-hidden={alt ? undefined : true}><span aria-hidden="true">PETRO</span><small aria-hidden="true">Photo unavailable</small></span>
  return <img {...props} src={src} alt={alt} className={className} onError={() => setFailedUrl(src)} />
}
