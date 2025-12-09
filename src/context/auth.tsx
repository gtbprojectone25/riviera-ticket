'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type AuthUser = {
  id: string
  email: string
  name: string
  surname: string
}

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const TOKEN_KEY = 'riviera_token'
const USER_KEY = 'riviera_user'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restaurar token/user do localStorage ao montar
  useEffect(() => {
    try {
      const storedToken =
        typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
      const storedUser =
        typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null
      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser) as AuthUser
        setToken(storedToken)
        setUser(parsed)
      } else {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    } catch (err) {
      console.error('Erro ao restaurar auth do localStorage:', err)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao fazer login')
      }

      const data = (await res.json()) as {
        success: boolean
        token: string
        user: AuthUser
      }

      if (!data.success || !data.token || !data.user) {
        throw new Error('Resposta inválida do servidor')
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      // garante que nenhum resíduo de estado fique pendurado
      sessionStorage.clear()
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
