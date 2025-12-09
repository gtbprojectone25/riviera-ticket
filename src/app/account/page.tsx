'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronLeft, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { useBookingStore } from '@/stores/booking'
import { useAccountEvents } from '@/hooks/use-account-events'
import { useAccountProfile } from '@/hooks/use-account-profile'
import type { UserProfile } from '@/types/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'


type ActiveTab = 'pendants' | 'events' | 'account'

export default function AccountPage() {
  const router = useRouter()
  const { user, token, isAuthenticated, logout } = useAuth()
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedCinema = useBookingStore((s) => s.selectedCinema)

  const [activeTab, setActiveTab] = useState<ActiveTab>('pendants')
  const [profileForm, setProfileForm] = useState<UserProfile>({
    firstName: user?.name ?? '',
    lastName: user?.surname ?? '',
    ssn: '',
    email: user?.email ?? '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  // Eventos confirmados
  const {
    events,
    status: eventsStatus,
    error: eventsError,
  } = useAccountEvents(token, activeTab === 'events')

  // Perfil
  const {
    profile,
    status: profileStatus,
    error: profileError,
    setProfile,
  } = useAccountProfile(token, activeTab === 'account')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName ?? user?.name ?? '',
        lastName: profile.lastName ?? user?.surname ?? '',
        ssn: profile.ssn ?? '',
        email: profile.email ?? user?.email ?? '',
      })
    } else if (profileError) {
      // fallback para dados do auth se a API de perfil falhar
      setProfileForm((prev) => ({
        firstName: prev.firstName || user?.name || '',
        lastName: prev.lastName || user?.surname || '',
        ssn: prev.ssn || '',
        email: prev.email || user?.email || '',
      }))
    }
  }, [profile, profileError, user])

  const totalAmount = useMemo(
    () => finalizedTickets.reduce((acc, t) => acc + t.price, 0),
    [finalizedTickets],
  )
  const ticketCount = finalizedTickets.length

  const handleSaveProfile = async () => {
    if (!token) return
    setProfileMessage(null)
    setSavingProfile(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update profile')
      }
      const data = (await res.json()) as UserProfile
      setProfile(data)
      setProfileMessage('Profile updated successfully')
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : 'Failed to update profile',
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!token) return
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordMessage('New password and confirmation do not match')
      return
    }
    setPasswordMessage(null)
    setSavingPassword(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update password')
      }
      setPasswordMessage('Password updated successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
    } catch (err) {
      setPasswordMessage(
        err instanceof Error ? err.message : 'Failed to update password',
      )
    } finally {
      setSavingPassword(false)
    }
  }

  const renderTabs = () => (
    <div className="flex border-b border-gray-800 relative z-20">
      {(['pendants', 'events', 'account'] as ActiveTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 py-4 px-4 text-center text-sm font-medium transition-colors ${activeTab === tab
              ? 'border-b-2 border-[#0066FF] text-[#0066FF]'
              : 'text-gray-400 hover:text-white'
            }`}
        >
          {tab === 'pendants' && 'Pendants'}
          {tab === 'events' && 'My events'}
          {tab === 'account' && 'My account'}
        </button>
      ))}
    </div>
  )

  const renderPendants = () => (
    <div className="relative z-10">
      <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl mb-6">

        {/* Poster - same proportions as hero-section */}
        <div className="relative aspect-2/3 max-w-md mx-auto mt-4 rounded-2xl overflow-hidden cursor-pointer">
          <Image
            src="/theodyssey.jpg"
            alt="The Odyssey"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 420px, 320px"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-linear-to-t from-black/90 to-transparent" />
          <div className="absolute bottom-4 left-0 right-0 flex flex-wrap gap-2 justify-center px-4 z-10">
            
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm mb-1">Tickets</p>
              <p className="text-white font-bold text-lg">
                {ticketCount} Premium Ticket{ticketCount > 1 ? 's' : ''}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Tickets are available the week of the premiere.
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Total</p>
              <p className="text-white font-bold text-xl">
                ${totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {selectedCinema && (
            <div className="pt-4 border-top border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Cinema</p>
              <p className="text-white font-semibold">{selectedCinema.name}</p>
              <p className="text-gray-500 text-xs mt-1">{selectedCinema.address}</p>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={() => router.push('/payment')}
        className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white py-6 rounded-xl text-base font-bold shadow-[0_0_20px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        My reservation
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  )

  const renderEvents = () => (
    <div className="relative z-10 pt-2">
      {eventsStatus === 'loading' && (
        <p className="text-sm text-gray-400">Loading events...</p>
      )}
      {eventsError && (
        <p className="text-sm text-red-400">Error: {eventsError}</p>
      )}
      {eventsStatus === 'success' && events.length === 0 && (
        <p className="text-sm text-gray-400">You don&apos;t have confirmed events yet.</p>
      )}
      {events.map((event) => {
        const start = new Date(event.sessionTime)
        const dateLabel = start.toLocaleDateString()
        const timeLabel = start.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        return (
          <div
            key={event.id}
            className="bg-[#111827] border border-gray-800 rounded-2xl p-5 mb-4 shadow-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {event.movieTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {dateLabel} at {timeLabel} — {event.cinemaName}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Seats: {event.seatLabels.join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase">{event.status}</p>
                <p className="text-base font-bold text-white">
                  ${(event.amount / 100).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderAccount = () => (
    <div className="relative z-10 pt-2">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-6">
        <h2 className="text-xl font-bold text-white">My account</h2>

        {profileStatus === 'loading' && (
          <p className="text-sm text-gray-400">Loading profile...</p>
        )}
        {profileError && (
          <p className="text-sm text-amber-300">
            Unable to load profile from server. Using your login info—update and save to refresh.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-300 text-sm">
              First name
            </Label>
            <Input
              id="firstName"
              value={profileForm.firstName}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, firstName: e.target.value }))
              }
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-gray-300 text-sm">
              Last name
            </Label>
            <Input
              id="lastName"
              value={profileForm.lastName}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, lastName: e.target.value }))
              }
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="Last name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ssn" className="text-gray-300 text-sm">
              SSN
            </Label>
            <Input
              id="ssn"
              value={profileForm.ssn}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                setProfileForm((p) => ({ ...p, ssn: digits }))
              }}
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="9 digits"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300 text-sm">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, email: e.target.value }))
              }
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="email@example.com"
            />
          </div>
        </div>

        {profileMessage && (
          <p className="text-sm text-center text-gray-200">{profileMessage}</p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-[#0066FF] hover:bg-[#0052cc] text-white"
          >
            {savingProfile ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>

        <hr className="border-gray-800" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Change password</h3>

          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-gray-300 text-sm">
              Current password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
              }
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-gray-300 text-sm">
              New password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
              }
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword" className="text-gray-300 text-sm">
              Confirm new password
            </Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={passwordForm.confirmNewPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({
                  ...p,
                  confirmNewPassword: e.target.value,
                }))
              }
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500"
              placeholder="••••••••"
            />
          </div>

          {passwordMessage && (
            <p className="text-sm text-center text-gray-200">{passwordMessage}</p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="bg-[#0066FF] hover:bg-[#0052cc] text-white"
            >
              {savingPassword ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update password'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">You must be logged in.</p>
      </div>
    )
  }

  return (
    // quero menor esse card
    <div className="min-h-screen  text-white flex justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-3xl bg-[#0d1117] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#0066FF] text-white text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium tracking-wide">
          To guarantee your place, finish within 10:00 minutes (only 4 per session).
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-white hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-1">To go back</span>
              </Button>
              <div className="text-white font-bold text-lg">
                {user ? `${user.name} ${user.surname}` : 'My Account'}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout()
                router.push('/')
              }}
              className="text-white hover:bg-gray-800 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>To go out</span>
            </Button>
          </div>

          {/* Tabs */}
          {renderTabs()}

          {/* Content */}
          <div className="pb-2">
            {activeTab === 'pendants' && renderPendants()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'account' && renderAccount()}
          </div>
        </div>
      </div>
    </div>
  )
}
