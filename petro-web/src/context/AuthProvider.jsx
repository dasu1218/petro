import { useCallback, useEffect, useMemo, useState } from 'react'
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
    storeToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, isAuthenticated: Boolean(user), login, register, logout }),
    [user, token, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
