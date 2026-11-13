import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'
import { AuthContext } from './authContext'

const TOKEN_KEY = 'petro_token'

const readStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const storeToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // storage unavailable (private mode); the session still works until refresh
  }
}

function AuthProvider({ children }) {
  const sessionVersion = useRef(0)
  const [token, setToken] = useState(readStoredToken)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))

  // On first load, confirm the stored token is still valid and fetch the user.
  useEffect(() => {
    if (!token || user) {
      return
    }

    let ignore = false

    apiRequest('/auth/me', { token })
      .then((data) => {
        if (!ignore) setUser(data.user)
      })
      .catch(() => {
        if (!ignore) {
          storeToken(null)
          setToken(null)
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [token, user])

  const startSession = useCallback((data) => {
    sessionVersion.current += 1
    storeToken(data.token)
    setToken(data.token)
    setUser(data.user)
    setIsLoading(false)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } })
      startSession(data)
      return data.user
    },
    [startSession],
  )

  const register = useCallback(
    async (name, email, password) => {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      })
      startSession(data)
      return data.user
    },
    [startSession],
  )

  const logout = useCallback(() => {
    sessionVersion.current += 1
    storeToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const updateAccount = useCallback(async (path, method, body) => {
    const version = sessionVersion.current
    const data = await apiRequest(path, { token, method, body })
    if (version !== sessionVersion.current) throw new Error('Your session changed. Please try again.')
    setUser((current) => current?.id === data.user.id ? data.user : current)
    return data.user
  }, [token])

  const changePassword = useCallback(async (body) => {
    const version = sessionVersion.current
    const data = await apiRequest('/profile/password', { method: 'PUT', token, body })
    if (version !== sessionVersion.current) throw new Error('Your session changed. Please log in again.')
    logout()
    return data
  }, [token, logout])

  const value = useMemo(
    () => ({
      user, token, isLoading, isAuthenticated: Boolean(user), login, register, logout, changePassword,
      updateProfile: (body) => updateAccount('/profile', 'PUT', body),
      saveAddress: (id, body) => updateAccount(id ? `/profile/addresses/${id}` : '/profile/addresses', id ? 'PUT' : 'POST', body),
      deleteAddress: (id) => updateAccount(`/profile/addresses/${id}`, 'DELETE'),
      setDefaultAddress: (id) => updateAccount(`/profile/addresses/${id}/default`, 'PATCH'),
    }),
    [user, token, isLoading, login, register, logout, updateAccount, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
