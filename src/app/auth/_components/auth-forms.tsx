'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Zod schemas for validation
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  surname: z.string().min(2, 'Surname must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

interface AuthFormsProps {
  onLoginSuccess?: () => void
  onRegisterSuccess?: () => void
}

/**
 * Authentication forms component with login and register tabs
 * Uses React Hook Form with Zod validation
 */
export function AuthForms({ onLoginSuccess, onRegisterSuccess }: AuthFormsProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  })

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      surname: '',
    }
  })

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Login data:', data)
      
      // Store user session (simplified)
      localStorage.setItem('user-session', JSON.stringify({
        email: data.email,
        isAuthenticated: true,
        loginTime: new Date().toISOString()
      }))
      
      onLoginSuccess?.()
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Register data:', data)
      
      // Store user session (simplified)
      localStorage.setItem('user-session', JSON.stringify({
        email: data.email,
        name: `${data.name} ${data.surname}`,
        isAuthenticated: true,
        loginTime: new Date().toISOString()
      }))
      
      onRegisterSuccess?.()
    } catch (error) {
      console.error('Register error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Tab Switcher */}
      <div className="flex mb-6 bg-muted/20 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('login')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'login'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'register'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Login Form */}
      {activeTab === 'login' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Register Form */}
      {activeTab === 'register' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Create Account</CardTitle>
            <CardDescription>
              Sign up to purchase tickets and manage your bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Name</Label>
                  <Input
                    id="register-name"
                    placeholder="John"
                    {...registerForm.register('name')}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-surname">Surname</Label>
                  <Input
                    id="register-surname"
                    placeholder="Doe"
                    {...registerForm.register('surname')}
                  />
                  {registerForm.formState.errors.surname && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.surname.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your@email.com"
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Choose a strong password"
                  {...registerForm.register('password')}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirm Password</Label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  {...registerForm.register('confirmPassword')}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Terms and Privacy */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        By continuing, you agree to our{' '}
        <a href="#" className="text-blue-400 hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="text-blue-400 hover:underline">
          Privacy Policy
        </a>
      </p>
    </div>
  )
}