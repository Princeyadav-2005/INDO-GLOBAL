import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('token')
      if (!storedToken) {
        setLoading(false)
        return
      }

      try {
        const response = await authAPI.me()
        // Handle response wrapping (e.g. response.user or direct user object)
        const userData = response.user || response.data || response
        setUser(userData)
        setToken(storedToken)
      } catch (err) {
        console.error('Failed to restore session:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const response = await authAPI.login(email, password)
      const authToken = response.token || (response.data && response.data.token)
      const userData = response.user || (response.data && response.data.user) || response

      if (authToken) {
        localStorage.setItem('token', authToken)
        setToken(authToken)
      }
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
      }
      return response
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await authAPI.register(data)
      const authToken = response.token || (response.data && response.data.token)
      const userData = response.user || (response.data && response.data.user) || response

      if (authToken) {
        localStorage.setItem('token', authToken)
        setToken(authToken)
      }
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
      }
      return response
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    setUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
