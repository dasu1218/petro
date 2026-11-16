import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
export default function HomepageImageEditor() {
  const { token } = useAuth()
  const [draft, setDraft] = useState({ image: null, alt: '' })
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    apiRequest('/homepage').then((data) => { if (!ignore) { setDraft(data); setReady(true); setError(''); setLoading(false) } }).catch((failure) => { if (!ignore) { setError(failure.message); setLoading(false) } })
    return () => { ignore = true }
  }, [attempt])
  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setMessage('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP photo up to 5 MB.'); return }
    setBusy(true)
    try {
      const body = new FormData(); body.append('image', file); body.append('enhance', 'false')
      const image = await apiRequest('/upload', { method: 'POST', token, body, timeoutMs: 120000 })
      setDraft((current) => ({ image: { url: image.url, publicId: image.publicId }, alt: current.alt || 'Everyday pet care bundles' }))
      setMessage('Photo uploaded. Save the homepage image to publish it.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await apiRequest('/homepage', { method: 'PUT', token, body: draft })
      setMessage('Homepage image saved.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <section className="checkout-panel homepage-editor" aria-labelledby="homepage-image-heading"><h2 id="homepage-image-heading">Homepage bundle image</h2><p>Choose the photo shown above “Everyday Care Bundles” on the homepage. Uploading prepares a preview; saving publishes it. The full image is kept without cropping.</p>
    {loading ? <p role="status">Loading homepage image…</p> : !ready ? null : <form onSubmit={save}><fieldset disabled={busy} className="homepage-image-fields">
      {draft.image && <img className="homepage-image-preview" src={draft.image.url} alt={draft.alt || 'Homepage preview'} />}
      <label className="form-field"><span>Upload homepage photo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>
      {draft.image && <label className="form-field"><span>Image description</span><input required maxLength={160} value={draft.alt} onChange={(event) => setDraft((current) => ({ ...current, alt: event.target.value }))} /></label>}
      <div className="cta-row"><button type="submit" className="btn btn-primary">{busy ? 'Please wait…' : 'Save homepage image'}</button>{draft.image && <button type="button" className="btn btn-secondary" onClick={() => { setDraft({ image: null, alt: '' }); setMessage('Photo removed from preview. Save to restore the placeholder.'); setError('') }}>Remove homepage photo</button>}</div>
    </fieldset></form>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }} disabled={busy}>Reload homepage image</button></div>}
    <p role="status">{busy ? 'Uploading or saving homepage image…' : message}</p>
  </section>
}
