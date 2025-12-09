'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Eye, EyeOff, Check, Lock } from 'lucide-react'

type AuthStep = 'email' | 'info' | 'password' | 'verify' | 'encrypting' | 'success'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    ssn: '',
    password: '',
    confirmPassword: ''
  })
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', ''])
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [encryptionProgress, setEncryptionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)
  const [verificationCodeFromApi, setVerificationCodeFromApi] = useState<string | null>(null)

  // Password requirements
  const passwordRequirements = {
    minLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  }

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean)

  // Timer para reenvio de código
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendTimer])

  // Step 1: Email submission
  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('Por favor, insira um email válido')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/register-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao enviar código')
        return
      }

      // Salvar código se retornado (modo desenvolvimento)
      if (data.code) {
        setVerificationCodeFromApi(data.code)
        // Preencher automaticamente os campos de código
        const codeArray = data.code.split('')
        setVerificationCode(codeArray)
      }

      setResendTimer(60)
      setCurrentStep('info')
    } catch (error) {
      console.error('Error sending code:', error)
      setError('Erro ao enviar código. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Info submission
  const handleInfoSubmit = async () => {
    if (!formData.name || !formData.surname || !formData.ssn) {
      setError('Todos os campos são obrigatórios')
      return
    }

    const ssnDigits = formData.ssn.replace(/\D/g, '')
    if (ssnDigits.length !== 9) {
      setError('SSN deve ter 9 dígitos')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/register-continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: formData.name,
          surname: formData.surname,
          ssn: ssnDigits
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao salvar informações')
        return
      }

      setCurrentStep('password')
    } catch (error) {
      console.error('Error saving info:', error)
      setError('Erro ao salvar informações. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Password submission
  const handlePasswordSubmit = async () => {
    if (!allRequirementsMet) {
      setError('A senha deve atender a todos os requisitos')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao definir senha')
        return
      }

      setCurrentStep('verify')
    } catch (error) {
      console.error('Error setting password:', error)
      setError('Erro ao definir senha. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 4: Verify code
  const handleVerifySubmit = async () => {
    const code = verificationCode.join('')
    if (code.length !== 5) {
      setError('Por favor, insira o código completo')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Código inválido')
        return
      }

      // Salvar token e dados do usuário
      if (data.token) {
        localStorage.setItem('auth-token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      setCurrentStep('encrypting')
      simulateEncryption()
    } catch (error) {
      console.error('Error verifying code:', error)
      setError('Erro ao verificar código. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const simulateEncryption = () => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setEncryptionProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          setCurrentStep('success')
          // Redirecionar para página de pagamento após 2 segundos
          setTimeout(() => {
            const returnUrl = searchParams.get('returnUrl') || '/payment'
            router.push(returnUrl)
          }, 2000)
        }, 500)
      }
    }, 200)
  }

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...verificationCode]
    newCode[index] = value.slice(-1)
    setVerificationCode(newCode)

    // Auto-focus next input
    if (value && index < 4) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      nextInput?.focus()
    }
  }

  // Handle resend code
  const handleResendCode = async () => {
    if (resendTimer > 0) return
    await handleEmailSubmit()
    setCurrentStep('verify')
  }

  // Render Step 1: Email
  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Create an account or log in</h2>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="email" className="text-gray-400 text-sm">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#1F2933] border-white/10 text-white placeholder:text-gray-500 mt-2"
            onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
          />
        </div>

        <Button
          onClick={handleEmailSubmit}
          disabled={isLoading || !email}
          className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white py-6 rounded-xl text-base font-bold"
        >
          {isLoading ? 'Sending...' : 'Create account'}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
          >
            Tap to log in
          </Link>
        </p>
      </div>

      {/* Encryption Info */}
      <div className="mt-8 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Advanced end-to-end encryption</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              In today&apos;s digital world, privacy isn&apos;t optional - it&apos;s essential. That&apos;s why we implement advanced end-to-end encryption powered by state-of-the-art security technologies.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mt-2">
              Unlike basic encryption methods, our system ensures that your data is locked at the source and only unlocked by its rightful recipient. Not even we can access it. Every message, file, or transaction is shielded with cutting-edge cryptographic protocols - the same level of protection trusted by global banks, governments, and cybersecurity leaders.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render Step 2: Info
  const renderInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Your information</h2>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="name" className="text-gray-400 text-sm">Name</Label>
          <Input
            id="name"
            placeholder="enter your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-[#1F2933] border-white/10 text-white placeholder:text-gray-500 mt-2"
          />
        </div>

        <div>
          <Label htmlFor="surname" className="text-gray-400 text-sm">Surname</Label>
          <Input
            id="surname"
            placeholder="enter your last name"
            value={formData.surname}
            onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
            className="bg-[#1F2933] border-white/10 text-white placeholder:text-gray-500 mt-2"
          />
        </div>

        <div>
          <Label htmlFor="ssn" className="text-gray-400 text-sm">SSN</Label>
          <Input
            id="ssn"
            placeholder="enter the number"
            value={formData.ssn}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
              setFormData({ ...formData, ssn: digits })
            }}
            className="bg-[#1c1c1c] border-white/10 text-white mt-2"
          />
          <p className="text-xs text-gray-500 mt-1">9 digits required</p>
        </div>

        <Button
          onClick={handleInfoSubmit}
          disabled={isLoading || !formData.name || !formData.surname || formData.ssn.length !== 9}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-6 rounded-xl text-base font-bold"
        >
          {isLoading ? 'Validating...' : 'Continue'}
        </Button>
      </div>

      {/* Encryption Info */}
      <div className="mt-8 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Advanced end-to-end encryption</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              In today&apos;s digital world, privacy isn&apos;t optional - it&apos;s essential. That&apos;s why we implement advanced end-to-end encryption powered by state-of-the-art security technologies.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mt-2">
              Unlike basic encryption methods, our system ensures that your data is locked at the source and only unlocked by its rightful recipient. Not even we can access it. Every message, file, or transaction is shielded with cutting-edge cryptographic protocols - the same level of protection trusted by global banks, governments, and cybersecurity leaders.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render Step 3: Password
  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Enter a secure password</h2>
        <p className="text-sm text-gray-400">
          Your password must meet the security requirements, remember to write it down so you don&apos;t forget it.
        </p>
      </div>

      {/* Requirements Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-400' : 'text-gray-400'}`}>
          <Check className={`w-4 h-4 ${passwordRequirements.minLength ? 'text-green-400' : 'text-gray-600'}`} />
          <span className="text-xs">8 Digits</span>
        </div>
        <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
          <Check className={`w-4 h-4 ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-gray-600'}`} />
          <span className="text-xs">Numbers</span>
        </div>
        <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-400' : 'text-gray-400'}`}>
          <Check className={`w-4 h-4 ${passwordRequirements.hasUppercase ? 'text-green-400' : 'text-gray-600'}`} />
          <span className="text-xs">Uppercase Letter</span>
        </div>
        <div className={`flex items-center gap-2 ${passwordRequirements.hasSymbol ? 'text-green-400' : 'text-gray-400'}`}>
          <Check className={`w-4 h-4 ${passwordRequirements.hasSymbol ? 'text-green-400' : 'text-gray-600'}`} />
          <span className="text-xs">Symbols</span>
        </div>
        <div className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-green-400' : 'text-gray-400'}`}>
          <Check className={`w-4 h-4 ${passwordRequirements.hasLowercase ? 'text-green-400' : 'text-gray-600'}`} />
          <span className="text-xs">Lowcase Letter</span>
        </div>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="password" className="text-gray-400 text-sm">Password</Label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="enter a secure password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="bg-[#1F2933] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-gray-400 text-sm">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="type it again"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="bg-[#1F2933] border-white/10 text-white placeholder:text-gray-500 mt-2"
          />
        </div>

        <Button
          onClick={handlePasswordSubmit}
          disabled={!allRequirementsMet || formData.password !== formData.confirmPassword || isLoading}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-6 rounded-xl text-base font-bold"
        >
          {isLoading ? 'Creating...' : 'Create account'}
        </Button>
      </div>

      {/* Encryption Info */}
      <div className="mt-8 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Advanced end-to-end encryption</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              In today&apos;s digital world, privacy isn&apos;t optional - it&apos;s essential. That&apos;s why we implement advanced end-to-end encryption powered by state-of-the-art security technologies.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mt-2">
              Unlike basic encryption methods, our system ensures that your data is locked at the source and only unlocked by its rightful recipient. Not even we can access it. Every message, file, or transaction is shielded with cutting-edge cryptographic protocols - the same level of protection trusted by global banks, governments, and cybersecurity leaders.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render Step 4: Verify
  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Confirm your email</h2>
        <p className="text-sm text-gray-400">
          we sent a 5-digit confirmation code to <span className="text-white font-medium">{email}</span>. Please check your inbox and verify the code.
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Mostrar código em desenvolvimento */}
        {verificationCodeFromApi && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-200 px-4 py-3 rounded text-center">
            <p className="text-xs mb-1">Código de verificação (modo desenvolvimento):</p>
            <p className="text-2xl font-bold tracking-widest">{verificationCodeFromApi}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {verificationCode.map((digit, index) => (
            <Input
              key={index}
              id={`code-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
            className="w-14 h-14 text-center bg-[#1F2933] border-white/10 text-white text-xl font-bold rounded-lg"
            />
          ))}
        </div>

        <Button
          onClick={handleVerifySubmit}
          disabled={isLoading || verificationCode.join('').length !== 5}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-6 rounded-xl text-base font-bold"
        >
          {isLoading ? 'Verifying...' : 'Confirm'}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          if you haven&apos;t received it,{' '}
          <span
            className={`${resendTimer > 0 ? 'text-gray-500' : 'text-blue-400 underline cursor-pointer'}`}
            onClick={handleResendCode}
          >
            tap here to resend it{resendTimer > 0 ? ` in ${resendTimer} seconds` : ''}
          </span>.
        </p>
      </div>

      {/* Encryption Info */}
      <div className="mt-8 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Advanced end-to-end encryption</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              In today&apos;s digital world, privacy isn&apos;t optional - it&apos;s essential. That&apos;s why we implement advanced end-to-end encryption powered by state-of-the-art security technologies.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mt-2">
              Unlike basic encryption methods, our system ensures that your data is locked at the source and only unlocked by its rightful recipient. Not even we can access it. Every message, file, or transaction is shielded with cutting-edge cryptographic protocols - the same level of protection trusted by global banks, governments, and cybersecurity leaders.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render Step 5: Encrypting
  const renderEncryptingStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center">
          <Lock className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Criptografando dados...</h2>

        {/* Progress Bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${encryptionProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            Estamos protegendo seus dados com segurança avançada.
          </p>
          <p className="text-sm text-gray-400">
            Sua conta está sendo criada.
          </p>
        </div>
      </div>

      {/* Encryption Info */}
      <div className="mt-8 space-y-2">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white">Advanced Encryption</h3>
        </div>
      </div>
    </div>
  )

  // Render Step 6: Success
  const renderSuccessStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Account Created!</h2>
        <p className="text-sm text-gray-400">
          Redirecting to payment...
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen  text-white flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827] rounded-3xl p-8 border border-white/5 shadow-xl">
        <div className="flex items-center justify-start mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (currentStep === 'email') {
                router.back()
              } else {
                const steps: AuthStep[] = ['email', 'info', 'password', 'verify', 'encrypting', 'success']
                const currentIndex = steps.indexOf(currentStep)
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1])
                }
              }
            }}
            className="text-white hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'info' && renderInfoStep()}
          {currentStep === 'password' && renderPasswordStep()}
          {currentStep === 'verify' && renderVerifyStep()}
          {currentStep === 'encrypting' && renderEncryptingStep()}
          {currentStep === 'success' && renderSuccessStep()}
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}