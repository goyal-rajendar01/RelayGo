import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/auth/profile')
      if (res.data.success) {
        const u = res.data.data.user || res.data.data
        const tp = res.data.data.travelerProfile || {}
        setUser({
          ...u,
          ...tp,
          verificationStatus: tp.verification_status || u.verification_status || u.verificationStatus || 'pending',
          travelerProfile: tp,
        })
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [token, fetchProfile])

  const login = (userData, jwtToken) => {
    localStorage.setItem('token', jwtToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(jwtToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const refreshUser = () => {
    if (token) fetchProfile()
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
