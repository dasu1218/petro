import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, SESSION_EXPIRED_EVENT } from '../lib/api'
import { AuthContext } from './authContext'
const TOKEN_KEY = 'petro_token'
const readStoredToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
const storeToken = (token) => {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY) } catch { /* The in-memory session still works. */ }
}
function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken)
  const activeToken = useRef(token)
  const sessionVersion = useRef(0)
  const requestSequence = useRef(0)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [sessionError, setSessionError] = useState('')
  const [notice, setNotice] = useState('')
  const logout = useCallback(() => {
    sessionVersion.current += 1; requestSequence.current += 1; activeToken.current = null
    storeToken(null); setToken(null); setUser(null); setIsLoading(false); setSessionError(''); setNotice('')
  }, [])
  const refreshSession = useCallback(async () => {
    const token = activeToken.current
    if (!token) return
    const version = sessionVersion.current
    const sequence = ++requestSequence.current
    const current = () => version === sessionVersion.current && sequence === requestSequence.current && token === activeToken.current
    try {
      const data = await apiRequest('/auth/me', { token })
      if (!current()) return
      setUser((existing) => JSON.stringify(existing) === JSON.stringify(data.user) ? existing : data.user)
      setSessionError(''); setIsLoading(false)
    } catch (error) {
      if (!current()) return
      if (error.status === 401) { logout(); setNotice('Your session expired. Please log in again.') }
      else { setSessionError(error.message); setIsLoading(false) }
    }
  }, [logout])
  useEffect(() => {
    if (token) refreshSession()
    return () => { requestSequence.current += 1 }
  }, [token, refreshSession])
  useEffect(() => {
    const storageChanged = (event) => {
      if (event.key !== TOKEN_KEY && event.key !== null) return
      if (event.storageArea && event.storageArea !== window.localStorage) return
      const next = readStoredToken()
      if (next === activeToken.current) return
      sessionVersion.current += 1; requestSequence.current += 1; activeToken.current = next
      setToken(next); setUser(null); setIsLoading(Boolean(next)); setSessionError('')
      setNotice(next ? '' : 'You were signed out in another tab.')
    }
    const expired = (event) => {
      if (event.detail?.token !== activeToken.current || !activeToken.current) return
      logout(); setNotice('Your session expired. Please log in again.')
    }
    window.addEventListener('storage', storageChanged)
    window.addEventListener('focus', refreshSession)
    window.addEventListener(SESSION_EXPIRED_EVENT, expired)
    return () => {
      window.removeEventListener('storage', storageChanged)
      window.removeEventListener('focus', refreshSession)
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired)
    }
  }, [logout, refreshSession])
  const startSession = useCallback((data) => {
    sessionVersion.current += 1; requestSequence.current += 1; activeToken.current = data.token
    storeToken(data.token); setToken(data.token); setUser(data.user); setIsLoading(false); setSessionError(''); setNotice('')
  }, [])
  const login = useCallback(async (email, password) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } })
    startSession(data); return data.user
  }, [startSession])
  const register = useCallback(async (name, email, password) => {
    const data = await apiRequest('/auth/register', { method: 'POST', body: { name, email, password } })
    startSession(data); return data.user
  }, [startSession])
  const updateAccount = useCallback(async (path, method, body) => {
    const version = sessionVersion.current
    const data = await apiRequest(path, { token, method, body })
    if (version !== sessionVersion.current) throw new Error('Your session changed. Please try again.')
    requestSequence.current += 1
    setUser((current) => current?.id === data.user.id ? data.user : current)
    return data.user
  }, [token])
  const changePassword = useCallback(async (body) => {
    const version = sessionVersion.current
    const data = await apiRequest('/profile/password', { method: 'PUT', token, body })
    if (version !== sessionVersion.current) throw new Error('Your session changed. Please log in again.')
    logout(); return data
  }, [token, logout])
  const value = useMemo(() => ({
    user, token, isLoading, isAuthenticated: Boolean(user), login, register, logout, changePassword,
    updateProfile: (body) => updateAccount('/profile', 'PUT', body),
    saveAddress: (id, body) => updateAccount(id ? `/profile/addresses/${id}` : '/profile/addresses', id ? 'PUT' : 'POST', body),
    deleteAddress: (id) => updateAccount(`/profile/addresses/${id}`, 'DELETE'),
    setDefaultAddress: (id) => updateAccount(`/profile/addresses/${id}/default`, 'PATCH'),
  }), [user, token, isLoading, login, register, logout, updateAccount, changePassword])
  return <AuthContext.Provider value={value}>
    {(notice || (sessionError && user)) && <p className="cart-sync-notice" role="status">{notice || `Could not refresh your account. ${sessionError}`}</p>}
    {token && !user && sessionError ? <section className="page-panel"><h1>We couldn't check your session</h1><p className="form-error" role="alert">{sessionError}</p><div className="cta-row"><button type="button" className="btn btn-primary btn-large" onClick={() => { setSessionError(''); setIsLoading(true); refreshSession() }}>Retry session check</button><button type="button" className="btn btn-secondary btn-large" onClick={logout}>Sign out</button></div></section> : children}
  </AuthContext.Provider>
}
export default AuthProvider
