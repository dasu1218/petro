const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '')

export async function apiRequest(path, { method = 'GET', body, token, timeoutMs = 30000 } = {}) {
  const headers = {}
  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    if (controller.signal.aborted) throw new Error('The request timed out. Please try again; for photo uploads, try turning enhancement off.')
    throw new Error('Cannot reach the PETRO API. Is the server running?')
  } finally {
    clearTimeout(timer)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong')
    error.status = response.status
    throw error
  }

  return data
}
