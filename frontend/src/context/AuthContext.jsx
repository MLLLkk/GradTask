import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('gradtask_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)

  async function login(email, password) {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('gradtask_token', data.data.token)
      localStorage.setItem('gradtask_user', JSON.stringify(data.data.user))
      setUser(data.data.user)
      return data.data.user
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('gradtask_token')
    localStorage.removeItem('gradtask_user')
    setUser(null)
  }

  useEffect(() => {
    const token = localStorage.getItem('gradtask_token')
    if (!token) return
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.data)
        localStorage.setItem('gradtask_user', JSON.stringify(data.data))
      })
      .catch(() => logout())
  }, [])

  const value = useMemo(() => ({ user, login, logout, loading, isAuthenticated: Boolean(user) }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
