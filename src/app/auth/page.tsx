'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState('login') // login, register, info, password, confirm, success
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    ssn: '',
    password: '',
    confirmPassword: ''
  })
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])

  const handleEmailSubmit = () => {
    if (email) {
      setCurrentStep('register')
    }
  }

  const handleInfoSubmit = () => {
    setCurrentStep('password')
  }

  const handlePasswordSubmit = () => {
    setCurrentStep('confirm')
  }

  const handleConfirmSubmit = () => {
    setCurrentStep('success')
  }

  const renderLoginStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">Create an account or log in</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-2">E-mail</label>
          <Input
            type="email"
            placeholder="Your e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <Button 
          onClick={handleEmailSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create account
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Already have an account? <span className="text-blue-400 cursor-pointer">Log in</span>
        </p>
      </div>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
          <p>Account and personal data protection</p>
        </div>
        <p className="ml-3">
          Your personal data will be processed in accordance with our Privacy Policy and Terms of Use. 
          We value your privacy and ensure the security of your information through advanced encryption 
          and security measures.
        </p>
      </div>
    </div>
  )

  const renderRegisterStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">Your information</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-2">Name</label>
          <Input
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-2">Surname</label>
          <Input
            placeholder="Your surname"
            value={formData.surname}
            onChange={(e) => setFormData({...formData, surname: e.target.value})}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-2">SSN</label>
          <Input
            placeholder="Your SSN"
            value={formData.ssn}
            onChange={(e) => setFormData({...formData, ssn: e.target.value})}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <Button 
          onClick={handleInfoSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Continue
        </Button>
      </div>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
          <p>Personal data and privacy</p>
        </div>
        <p className="ml-3">
          We collect your personal data to provide you with our services. Your data is protected in 
          accordance with applicable data protection laws and our Privacy Policy.
        </p>
      </div>
    </div>
  )

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">Enter a secure password</h2>
        <p className="text-sm text-gray-400">
          Your password must have at least 8 characters, including at least one capital 
          letter, a number and one special character.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-2">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="bg-gray-800 border-gray-600 text-white pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-2">Confirm password</label>
          <Input
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <Button 
          onClick={handlePasswordSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create account
        </Button>
      </div>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
          <p>Account security</p>
        </div>
        <p className="ml-3">
          Choose a strong password to protect your account. We recommend using a unique password 
          that you don&apos;t use for other services.
        </p>
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">Confirm your email</h2>
        <p className="text-sm text-gray-400">
          We send a 6-digit confirmation code to <span className="text-white">{email}</span>. 
          Check your inbox and enter the code here.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          {verificationCode.map((digit, index) => (
            <Input
              key={index}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => {
                const newCode = [...verificationCode]
                newCode[index] = e.target.value
                setVerificationCode(newCode)
                
                // Auto-focus next input
                if (e.target.value && index < 5) {
                  const nextInput = e.target.parentElement?.parentElement?.children[index + 1]?.children[0] as HTMLInputElement
                  if (nextInput) nextInput.focus()
                }
              }}
              className="w-12 h-12 text-center bg-gray-800 border-gray-600 text-white text-lg font-bold"
            />
          ))}
        </div>

        <Button 
          onClick={handleConfirmSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Confirm
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Didn&apos;t receive the code? <span className="text-blue-400 cursor-pointer">Resend</span>
        </p>
      </div>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
          <p>Account Verification</p>
        </div>
        <p className="ml-3">
          Email verification is required to complete your account setup and ensure the security 
          of your account.
        </p>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gray-800 rounded-lg flex items-center justify-center mb-4">
          <div className="text-4xl">🎬</div>
        </div>
        <h2 className="text-xl font-bold text-white">Matheus Linos</h2>
        <div className="text-gray-400 text-sm">Verificado</div>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="space-y-2 mb-4">
            <div className="text-xs text-gray-400 tracking-wider">
              UMA EXPERIÊNCIA SENSORIAL
            </div>
            <h3 className="text-2xl font-bold text-white">
              THE <span className="text-orange-400">ODYSSEY</span>
            </h3>
            <div className="text-orange-400 text-sm tracking-wider">
              DEFY THE GODS
            </div>
            <div className="text-xl font-bold text-white mt-2">
              07.17.25
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="text-white font-medium text-lg">3 Premium Ticket</div>
            <div className="text-3xl font-bold text-white">$1,497</div>
          </div>

          <Button 
            onClick={() => router.push('/ticket-selection')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue my reservation
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
          <p>Account verified successfully</p>
        </div>
        <p className="ml-3">
          Your account has been created and verified. You can now enjoy all the features 
          of our platform and make reservations.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (currentStep === 'login') {
                router.back()
              } else {
                // Go back to previous step
                const steps = ['login', 'register', 'password', 'confirm', 'success']
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
          <div className="text-white font-bold">LOGO</div>
        </div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            {currentStep === 'login' && renderLoginStep()}
            {currentStep === 'register' && renderRegisterStep()}
            {currentStep === 'password' && renderPasswordStep()}
            {currentStep === 'confirm' && renderConfirmStep()}
            {currentStep === 'success' && renderSuccessStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}