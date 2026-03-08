'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import bwipjs from 'bwip-js'
import { useAuth } from '@/context/auth'
import { useAccountEvents } from '@/hooks/use-account-events'
import { useAccountPendents } from '@/hooks/use-account-pendents'
import { useAccountProfile } from '@/hooks/use-account-profile'
import type { AccountEvent, UserProfile } from '@/types/account'
import { SupportTab } from '@/app/account/_components/support/SupportTab'
import { formatCurrency } from '@/lib/utils'
import React from 'react'

type ActiveTab = 'events' | 'account' | 'support' | 'orders'
type ProfileForm = Pick<UserProfile, 'firstName' | 'lastName' | 'email'>

const formatSessionDateUTC = (ts: string | number | Date) => {
  const d = new Date(ts)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}
const formatSessionTimeUTC = (ts: string | number | Date) => {
  const d = new Date(ts)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(d)
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <AccountPageContent />
    </Suspense>
  )
}

const TicketFaceContent = ({ selectedEvent, isVip, noiseBg }: { selectedEvent: AccountEvent, isVip: boolean, noiseBg: string, face: 'front' | 'back' }) => {
  const mockBars = React.useMemo(() => {
    const seedStr = selectedEvent.orderId || selectedEvent.movieTitle || selectedEvent.cinemaName || 'default'
    let seed = 0
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
    }
    let t = seed || 123456789
    const rand = () => {
      t = (t * 1664525 + 1013904223) >>> 0
      return t / 0x100000000
    }
    return Array.from({ length: 60 }).map(() => ({
      width: rand() > 0.5 ? '2px' : '1px',
      opacity: rand() > 0.3 ? 0.8 : 0.3,
    }))
  }, [selectedEvent.orderId, selectedEvent.movieTitle, selectedEvent.cinemaName])

  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (canvas && selectedEvent.barcode) {
      try {
        bwipjs.toCanvas(canvas, {
          bcid: 'code128',
          text: selectedEvent.barcode,
          scale: 3,
          height: 10,
          includetext: false,
          textxalign: 'center',
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <div 
      className="transition-colors duration-300 relative overflow-hidden" 
      style={{
        width: '100%', 
        height: '100%',
        perspective: '1400px', // Mais suave, menos distorção
      }}
    >
      <div
        className="relative w-full h-full rounded-[24px] overflow-hidden"
        style={{
          background: isVip ? '#121212' : '#ffffff', 
          color: isVip ? '#fff' : '#000',
          backgroundImage: isVip ? `${noiseBg}, linear-gradient(to bottom, #1a1a1a, #0d0d0d)` : undefined,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Recortes laterais (Notches) via Pseudo-elementos para não distorcer */}
        <div className="absolute top-[72%] -left-3 w-6 h-6 rounded-full bg-black z-20" style={{ backgroundColor: 'var(--background-color, #000)' }}></div>
        <div className="absolute top-[72%] -right-3 w-6 h-6 rounded-full bg-black z-20" style={{ backgroundColor: 'var(--background-color, #000)' }}></div>

        {/* Separator Line (Dashed) - Posicionamento Absoluto RETA */}
        <div className="absolute left-6 right-6 bottom-[142px] h-px z-10 border-t-2 border-dashed border-white/20 opacity-50"></div>

        <div className="px-8 pt-8 pb-4 flex flex-col h-full relative z-10">
          {/* Header */}
          <div className="flex justify-between items-end mb-6">
            <span className={`text-3xl font-bold tracking-widest ${isVip ? 'text-white' : 'text-[#0057ff]'}`}>
              {isVip ? 'VIP' : 'STANDARD'}
            </span>
            <span className={`text-2xl font-black tracking-tighter italic ${isVip ? 'text-white' : 'text-[#0057ff]'}`}>IMAX</span>
          </div>
          
          {/* Gradient Line (Metallic) */}
          <div className="h-1.5 w-[calc(100%+4rem)] -mx-8 mb-10 relative z-20">
              <div className="absolute inset-0 bg-linear-to-r from-[#7b2ff7] via-[#2f8ff7] to-[#ffffff] opacity-90"></div>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/50 to-transparent mix-blend-overlay"></div>
          </div>
          
          {/* Info Grid */}
          <div className="flex flex-col flex-1 space-y-4">
            {/* Order ID */}
            <div className="mb-6">
              <p className={`text-[11px] uppercase mb-2 tracking-widest font-normal ${isVip ? 'text-white/50' : 'text-gray-400'}`}>Order ID</p>
              <p className="text-lg font-normal tracking-wide opacity-90">{selectedEvent.orderId || '#-------'}</p>
            </div>
            
            {/* Movie & Date */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className={`text-[11px] uppercase mb-2 tracking-widest font-normal ${isVip ? 'text-white/50' : 'text-gray-400'}`}>Movie</p>
                <p className="text-xl font-medium leading-tight tracking-tight">{selectedEvent.movieTitle}</p>
              </div>
              <div>
                <p className={`text-[11px] uppercase mb-2 tracking-widest font-normal ${isVip ? 'text-white/50' : 'text-gray-400'}`}>Date</p>
                <p className="text-xl font-normal tracking-tight opacity-90">{formatSessionDateUTC(selectedEvent.sessionTime)}</p>
              </div>
            </div>
            
            {/* Seat & Time */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className={`text-[11px] uppercase mb-2 tracking-widest font-normal ${isVip ? 'text-white/50' : 'text-gray-400'}`}>Seat</p>
                <p className="text-3xl font-bold tracking-tight">{selectedEvent.seatLabels[0]}</p>
              </div>
              <div>
                <p className={`text-[11px] uppercase mb-2 tracking-widest font-normal ${isVip ? 'text-white/50' : 'text-gray-400'}`}>Time</p>
                <p className="text-xl font-normal tracking-tight opacity-90">
                  {formatSessionTimeUTC(selectedEvent.sessionTime)}
                </p>
              </div>
            </div>
            
            {/* Location */}
            <div className="mt-8">
              <p className={`text-[11px] uppercase mb-2 tracking-widest font-normal ${isVip ? 'text-white/50' : 'text-gray-400'}`}>Exhibition location</p>
              <p className="text-[15px] font-bold tracking-wide leading-none mb-1">{selectedEvent.cinemaName}</p>
              <p className={`text-[13px] font-normal leading-relaxed mb-2 ${isVip ? 'text-white/40' : 'text-gray-500'}`}>
                {selectedEvent.cinemaAddress || `${selectedEvent.cinemaCity || 'City'}, Country`}
              </p>
            </div>
          </div>
          
          {/* Barcode Area (Position Absolute Bottom) */}
          <div className="absolute bottom-5 left-5 right-5 h-[60px] flex items-center justify-center overflow-hidden">
               {selectedEvent.barcode ? (
                   <div className="relative w-full h-full flex items-center justify-center"
                        style={{
                            maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
                        }}>
                       {/* Gaussian Blur forte aplicado diretamente ao elemento do código */}
                       <canvas ref={canvasRef} className={`w-[95%] h-[80%] object-cover opacity-80 mix-blend-screen blur-[3px] ${isVip ? 'filter invert brightness-125' : ''}`}></canvas>
                   </div>
               ) : (
                   <div className="relative w-full h-full flex items-center justify-center"
                        style={{
                            maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
                        }}>
                       {/* Gaussian Blur forte aplicado diretamente ao container das barras */}
                       <div className={`w-[95%] h-[80%] flex justify-center items-center gap-0.5 opacity-70 ${isVip ? 'mix-blend-screen' : 'mix-blend-multiply'} blur-[3px]`}>
                           {mockBars.map((b, i) => (
                               <div key={i} 
                                   className={`h-full ${isVip ? 'bg-white' : 'bg-black'}`} 
                                   style={{ 
                                       width: b.width,
                                       opacity: b.opacity,
                                       boxShadow: isVip ? '0 0 2px rgba(255,255,255,0.2)' : 'none'
                                   }} 
                               />
                           ))}
                       </div>
                   </div>
               )}
          </div>
          
          {/* Disclaimer text */}
          <p className={`absolute bottom-2 left-0 right-0 text-[8px] text-center font-medium tracking-wide ${isVip ? 'text-white/20' : 'text-gray-400/50'}`}>
            The barcode is for demonstration purposes only.
          </p>
        </div>
        
        {/* Glass Reflection Edge */}
        <div className={`absolute inset-x-0 top-0 h-px z-30 ${isVip ? 'bg-linear-to-r from-transparent via-white/10 to-transparent' : 'bg-linear-to-r from-transparent via-white/40 to-transparent'}`}></div>
      </div>
    </div>
  )
}

const TicketModal = ({ selectedEvent, onClose }: { selectedEvent: AccountEvent, onClose: () => void }) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const state = useRef({
    rotationY: 0,
    velocityX: 0,
    lastMouseX: 0,
    isAutoRotating: true,
    isInteracting: false
  })

  useEffect(() => {
    let animationFrameId: number
    
    const update = () => {
      const s = state.current
      
      // Auto rotation
      if (s.isAutoRotating && !s.isInteracting) {
        s.rotationY += 0.2 // Smooth slow rotation
      } 
      // Inertia when not interacting
      else if (!s.isInteracting) {
        s.rotationY += s.velocityX
        s.velocityX *= 0.95 // Friction
        
        // Resume auto-rotation if almost stopped
        if (Math.abs(s.velocityX) < 0.01) {
          s.isAutoRotating = true
        }
      }

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateY(${s.rotationY}deg)`
      }
      
      animationFrameId = requestAnimationFrame(update)
    }
    
    update()
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const onStart = (clientX: number) => {
    state.current.isInteracting = true
    state.current.isAutoRotating = false
    state.current.lastMouseX = clientX
    state.current.velocityX = 0
    setIsDragging(true)
  }

  const onMove = (clientX: number) => {
    if (!state.current.isInteracting) return
    const deltaX = clientX - state.current.lastMouseX
    state.current.rotationY += deltaX * 0.5
    state.current.velocityX = deltaX * 0.5
    state.current.lastMouseX = clientX
  }

  const onEnd = () => {
    state.current.isInteracting = false
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    onStart(e.clientX)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    onMove(e.clientX)
  }

  const handleMouseUp = () => {
    onEnd()
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    onStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    onMove(e.touches[0].clientX)
  }

  const isVip = selectedEvent.type === 'VIP' || 
               selectedEvent.seatLabels?.some(s => s.includes('VIP') || ['A', 'B'].some(row => s.startsWith(row)))
  const noiseBg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ticket-modal-close" onClick={onClose} style={{zIndex: 50}}>✕</button>

        <div 
          className="ticket-3d-wrapper"
          style={{ perspective: '1000px' }}
        >
          <div 
            ref={cardRef}
            className="w-full h-full relative"
            style={{ 
              transformStyle: 'preserve-3d', 
              cursor: isDragging ? 'grabbing' : 'grab',
              minHeight: '620px',
              willChange: 'transform'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={onEnd}
          >
            {/* Front Face */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}>
              <TicketFaceContent selectedEvent={selectedEvent} isVip={isVip} noiseBg={noiseBg} face="front" />
            </div>

            {/* Back Face (Identical content rotated) */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)' }}>
              <TicketFaceContent selectedEvent={selectedEvent} isVip={isVip} noiseBg={noiseBg} face="back" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token, isAuthenticated, isLoading, logout } = useAuth()

  const [activeTab, setActiveTab] = useState<ActiveTab>('events')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSupportSystem, setShowSupportSystem] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [faqExpandedIndex, setFaqExpandedIndex] = useState<number | null>(null)
  const [ordersData, setOrdersData] = useState<Array<{
    id: string
    orderNumber: string | null
    status: string
    totalAmount: number
    createdAt: string | null
    paidAt: string | null
    movieTitle: string | null
    sessionTime: string | null
    cinemaName: string | null
  }>>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const [refreshKey, setRefreshKey] = useState(0)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: user?.name ?? '',
    lastName: user?.surname ?? '',
    email: user?.email ?? '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const [selectedEvent, setSelectedEvent] = useState<AccountEvent | null>(null)
  
  // Eventos confirmados
  const {
    events,
    status: eventsStatus,
    error: eventsError,
  } = useAccountEvents(token, activeTab === 'events', refreshKey)

  const {
    pendents,
  } = useAccountPendents(token, activeTab === 'events', refreshKey) // Fetch pendents when events tab is active

  // Perfil
  const {
    profile,
    error: profileError,
    setProfile,
  } = useAccountProfile(token, activeTab === 'account')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const tab = searchParams.get('tab') as ActiveTab | null
    const refresh = searchParams.get('refresh')
    if (tab && (['events', 'account', 'support', 'orders'] as ActiveTab[]).includes(tab)) {
      setActiveTab(tab)
    } else {
      setActiveTab('events')
    }

    if (refresh) {
      setRefreshKey(Date.now())
      const params = new URLSearchParams(searchParams.toString())
      params.delete('refresh')
      const next = params.toString()
      router.replace(next ? `/account?${next}` : '/account')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName ?? user?.name ?? '',
        lastName: profile.lastName ?? user?.surname ?? '',
        email: profile.email ?? user?.email ?? '',
      })
    } else if (profileError) {
      // fallback para dados do auth se a API de perfil falhar
      setProfileForm((prev) => ({
        firstName: prev.firstName || user?.name || '',
        lastName: prev.lastName || user?.surname || '',
        email: prev.email || user?.email || '',
      }))
    }
  }, [profile, profileError, user])

  useEffect(() => {
    if (selectedEvent && selectedEvent.barcode) {
      // Small timeout to ensure modal is in DOM
      const timer = setTimeout(() => {
        try {
          const canvas = document.getElementById('barcode-canvas') as HTMLCanvasElement;
          if (canvas) {
            bwipjs.toCanvas(canvas, {
              bcid: 'code128',
              text: selectedEvent.barcode!,
              scale: 3,
              height: 10,
              includetext: false,
              textxalign: 'center',
            })
          }
        } catch (e) {
          console.error(e)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [selectedEvent])

  useEffect(() => {
    if (activeTab !== 'orders') return
    let aborted = false
    setOrdersLoading(true)
    setOrdersError(null)
    fetch('/api/account/orders', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (aborted) return
        setOrdersData(Array.isArray(data?.orders) ? data.orders : [])
      })
      .catch((err) => {
        if (aborted) return
        setOrdersError(err?.message || 'Failed to load orders')
        setOrdersData([])
      })
      .finally(() => {
        if (aborted) return
        setOrdersLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [activeTab, token, refreshKey])

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
      
      // Update localStorage with new user data
      if (typeof window !== 'undefined' && user) {
        const updatedUser = {
          ...user,
          name: profileForm.firstName,
          surname: profileForm.lastName,
          email: profileForm.email,
        }
        localStorage.setItem('riviera_user', JSON.stringify(updatedUser))
      }
      
      setProfileMessage('Profile updated successfully')
      
      // Refresh page to update user data in header
      setTimeout(() => {
        window.location.reload()
      }, 1000)
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

  const renderTicketModal = () => {
    if (!selectedEvent) return null
    return <TicketModal selectedEvent={selectedEvent} onClose={() => setSelectedEvent(null)} />
  }

  const renderEvents = () => {
    return (
      <div className="animate-in">
        {/* Welcome Banner */}
        <div className="welcome-banner animate-in">
          <div>
            <div className="welcome-name">{user?.name?.toUpperCase()} {user?.surname?.toUpperCase()} <span className="vip-tag">⭑ VIP</span></div>
            <div className="welcome-sub">Member since January 2025 · {events[0]?.cinemaCity || 'Sacramento, CA'}</div>
          </div>
          <div className="welcome-stats">
            <div className="stat-item">
              <span className="stat-num">{events.length}</span>
              <div className="stat-label">Tickets</div>
            </div>
            <div className="stat-item">
              <span className="stat-num">2</span>
              <div className="stat-label">Events</div>
            </div>
            <div className="stat-item">
              <span className="stat-num">{pendents.length}</span>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>

        {/* Notification Strip */}
        {selectedEvent && renderTicketModal()}
        {pendents.length > 0 && (
          <div className="notif-strip animate-in delay-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            You have {pendents.length} pending reservation(s). Complete payment to secure your seat before it expires.
          </div>
        )}

        {/* Pending Payments */}
        {pendents.length > 0 && (
          <>
            <div className="section-header animate-in delay-1">
              <div className="section-title">PENDING PAYMENT <span className="section-badge badge-pending">{pendents.length} Pending</span></div>
            </div>

            {pendents.map((pending) => (
              <div key={pending.orderId} className="pending-card animate-in delay-1 mb-6">
                <div className="pending-header">
                  <div className="pending-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <div className="pending-title">{pending.movieTitle}</div>
                    <div className="pending-sub">
                      {pending.cinemaName} {pending.cinemaCity && `· ${pending.cinemaCity}`} · {pending.cinemaAddress && `${pending.cinemaAddress} · `}
                      {pending.sessionTime && new Date(pending.sessionTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="pending-timer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Reservation expires in <span>08:42</span>
                </div>

                <div className="ticket-breakdown">
                  <div className="ticket-breakdown-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>
                    TOTAL AMOUNT
                  </div>
                  <div className="ticket-breakdown-rows">
                    <div className="tkt-total-row">
                      <span className="tkt-total-label">Total</span>
                      <span className="tkt-total-value">{formatCurrency(pending.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="pending-actions">
                  <button
                    className="btn-pay"
                    disabled={resumingOrderId === pending.orderId}
                    onClick={async () => {
                      try {
                        if (!token) return
                        setResumingOrderId(pending.orderId)
                        const res = await fetch('/api/payments/resume', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ orderId: pending.orderId }),
                        })
                        if (!res.ok) {
                          const payload = await res.json().catch(() => ({}))
                          throw new Error(payload.error || 'Failed to resume payment')
                        }
                        router.push(`/payment?resumeOrderId=${encodeURIComponent(pending.orderId)}`)
                      } catch (error) {
                        console.error('Failed to resume payment:', error)
                      } finally {
                        setResumingOrderId(null)
                      }
                    }}
                  >
                    {resumingOrderId === pending.orderId ? 'Resuming...' : `Complete Payment — ${formatCurrency(pending.totalAmount)}`}
                  </button>
                  <button className="btn-cancel">Cancel</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Confirmed Events */}
        <div className="section-header animate-in delay-2">
          <div className="section-title">MY TICKETS <span className="section-badge badge-confirmed">{events.length} Confirmed</span></div>
          <a className="section-link">
            View all
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        {eventsStatus === 'loading' && (
          <p className="text-sm text-riv-text2">Loading events...</p>
        )}
        {eventsError && (
          <p className="text-sm text-riv-red">Error: {eventsError}</p>
        )}
        {eventsStatus === 'success' && events.length === 0 && (
          <div className="qa-item" style={{textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div className="qa-icon" style={{background: 'var(--riv-blue-dim)', margin: 0}}>🎬</div>
            <div>
              <div className="qa-label" style={{color: 'var(--riv-text)', fontSize: '14px', marginBottom: '4px'}}>No tickets yet</div>
              <div className="text-xs text-riv-text3">Browse our sessions to book your first experience.</div>
            </div>
            <button 
              onClick={() => router.push('/pre-order')}
              className="btn-sm btn-blue-sm ml-auto"
            >
              Browse
            </button>
          </div>
        )}

        <div className="events-grid animate-in delay-2">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="card-status-bar status-confirmed"></div>
              <div className="event-card-banner">
                <div className="glow-overlay"></div>
                <div className="film-title">{event.movieTitle}</div>
              </div>
              <div className="event-card-body">
                <div className="event-meta-top">
                  <div className="event-film-name">{event.movieTitle}</div>
                  <div className={`event-format ${event.type === 'VIP' || event.seatLabels?.some(s => s.includes('VIP') || ['A','B'].some(r => s.startsWith(r))) ? 'vip' : ''}`}>
                    {event.type === 'VIP' || event.seatLabels?.some(s => s.includes('VIP') || ['A','B'].some(r => s.startsWith(r))) ? 'VIP EXPERIENCE' : 'STANDARD'}
                  </div>
                </div>
                <div className="event-details">
                  <div className="event-detail-item">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{formatSessionDateUTC(event.sessionTime)}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">
                      {formatSessionTimeUTC(event.sessionTime)}
                    </span>
                  </div>
                </div>
                <div className="event-venue">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {event.cinemaName} {event.cinemaCity && `· ${event.cinemaCity}`}
                </div>
                <div className="event-footer">
                  <div className="ticket-count">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>
                    {event.seatLabels?.length || 1} tickets
                  </div>
                  <button className="btn-sm btn-blue-sm" onClick={() => setSelectedEvent(event)}>View Tickets</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-header animate-in delay-3" style={{marginTop: '32px'}}>
          <div className="section-title">QUICK ACTIONS</div>
        </div>

        <div className="quick-actions animate-in delay-3">
          <div className="qa-item" onClick={() => setActiveTab('orders')} style={{cursor: 'pointer'}}>
            <div className="qa-icon" style={{background: 'rgba(34,197,94,0.08)'}}>📋</div>
            <div className="qa-label">Order<br/>History</div>
          </div>
          <div className="qa-item">
            <div className="qa-icon" style={{background: 'rgba(239,68,68,0.08)'}}>🎁</div>
            <div className="qa-label">Gift<br/>Tickets</div>
          </div>
        </div>
      </div>
    )
  }

  const renderAccount = () => (
    <div className="page-content active" id="page-account">
      <div className="welcome-banner" style={{marginBottom: '28px'}}>
        <div>
          <div className="welcome-name">MY ACCOUNT</div>
          <div className="welcome-sub">Manage your personal information and preferences</div>
        </div>
      </div>

      <div className="account-grid">
        <div className="account-card">
          <h3>Personal Info</h3>
          <div className="info-row">
            <span className="info-label">First Name</span>
            <div className="flex items-center gap-2">
              <input 
                className="bg-transparent border-none text-right text-riv-text2 text-[13.5px] font-medium outline-none focus:text-riv-text"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">Last Name</span>
            <div className="flex items-center gap-2">
              <input 
                className="bg-transparent border-none text-right text-riv-text2 text-[13.5px] font-medium outline-none focus:text-riv-text"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">E-mail</span>
            <div className="flex items-center gap-2">
              <input 
                className="bg-transparent border-none text-right text-riv-text2 text-[13.5px] font-medium outline-none focus:text-riv-text w-full"
                value={profileForm.email}
                onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-sm btn-blue-sm"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          {profileMessage && <p className="text-xs text-riv-green mt-2 text-right">{profileMessage}</p>}
        </div>

        <div className="account-card">
          <h3>Security</h3>
          <div className="info-row">
            <span className="info-label">Current Password</span>
            <input 
              type="password"
              className="bg-transparent border border-riv-border2 rounded px-2 py-1 text-riv-text2 text-[13.5px] outline-none focus:border-riv-blue"
              placeholder="••••••••"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div className="info-row">
            <span className="info-label">New Password</span>
            <input 
              type="password"
              className="bg-transparent border border-riv-border2 rounded px-2 py-1 text-riv-text2 text-[13.5px] outline-none focus:border-riv-blue"
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div className="info-row">
            <span className="info-label">Confirm</span>
            <input 
              type="password"
              className="bg-transparent border border-riv-border2 rounded px-2 py-1 text-riv-text2 text-[13.5px] outline-none focus:border-riv-blue"
              placeholder="••••••••"
              value={passwordForm.confirmNewPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmNewPassword: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="btn-sm btn-ghost-sm"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
          {passwordMessage && <p className="text-xs text-riv-green mt-2 text-right">{passwordMessage}</p>}
        </div>

        <div className="account-card">
          <h3>Preferences</h3>
          <div className="info-row">
            <span className="info-label">Language</span>
            <span className="info-value">English <button className="btn-edit">Change</button></span>
          </div>
          <div className="info-row">
            <span className="info-label">Currency</span>
            <span className="info-value">USD ($)</span>
          </div>
          <div className="info-row">
            <span className="info-label">Notifications</span>
            <span className="info-value">Email + Push <button className="btn-edit">Edit</button></span>
          </div>
          <div className="info-row">
            <span className="info-label">Newsletter</span>
            <span className="info-value" style={{color: 'var(--riv-green)'}}>Subscribed</span>
          </div>
        </div>

        <div className="account-card">
          <h3>Membership</h3>
          <div className="info-row">
            <span className="info-label">Plan</span>
            <span className="info-value">VIP Member <span className="vip-tag">⭑ VIP</span></span>
          </div>
          <div className="info-row">
            <span className="info-label">Member since</span>
            <span className="info-value">January 2025</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Spent</span>
            <span className="info-value" style={{fontFamily: 'var(--riv-font-mono)'}}>$2,440.00</span>
          </div>
          <div className="info-row">
            <span className="info-label">Events attended</span>
            <span className="info-value">5 events</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSupport = () => {
    if (showFaq) {
      const items = [
        'How do I receive my ticket?',
        'What is Riviera?',
        'Is there a limit on tickets per person?',
        'Will there be another batch later?',
        "Is there a guarantee I'll get a ticket in the queue?",
        "Am I entitled to a refund if I change my mind?",
        'What is the difference between standard and premium tickets?',
        'When and how will I receive my VIP Kit items?',
        'Tickets are sold out everywhere else. How is Riviera offering now?',
      ]
      return (
        <div className="page-content active" id="page-faq">
          <div className="welcome-banner" style={{marginBottom: 28}}>
            <div>
              <div className="welcome-name">FAQ</div>
              <div className="welcome-sub">Frequent doubts</div>
            </div>
            <button
              className="btn-account-back"
              onClick={() => {
                setShowFaq(false)
                setFaqExpandedIndex(null)
              }}
              type="button"
              aria-label="Back to support"
              style={{marginLeft: 'auto'}}
            >
              <span aria-hidden="true">&larr;</span>
              <span>Back to Support</span>
            </button>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24}}>
            <div>
              {items.map((q, idx) => {
                const open = faqExpandedIndex === idx
                return (
                  <div key={q} style={{padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
                    <button
                      onClick={() => setFaqExpandedIndex(open ? null : idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        color: 'var(--riv-text)',
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                      }}
                    >
                      <span style={{flex: 1, textAlign: 'left', paddingRight: 12}}>{q}</span>
                      <span style={{width: 16, display: 'inline-block', textAlign: 'right', opacity: 0.8}}>
                        {open ? '×' : '+'}
                      </span>
                    </button>
                    {open && (
                      <div style={{marginTop: 12, color: 'var(--riv-text2)', fontSize: 14, lineHeight: 1.6}}>
                        <p>Answer will be added here.</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="page-content active" id="page-support">
        <div className="welcome-banner" style={{marginBottom: '28px'}}>
          <div>
            <div className="welcome-name">SUPPORT CENTER</div>
            <div className="welcome-sub">How can we help you today?</div>
          </div>
        </div>

        {!showSupportSystem ? (
          <div className="support-grid">
            <div 
              className="support-item"
              onClick={() => setShowSupportSystem(true)}
            >
              <div className="support-icon">📧</div>
              <div className="support-info">
                <h4>Contact Support</h4>
                <p>Open a ticket for bugs, questions, payment or refund requests. Avg reply: 2 hours · 9am–10pm.</p>
              </div>
            </div>
            <div
              className="support-item"
              onClick={() => setShowFaq(true)}
              style={{cursor: 'pointer'}}
            >
              <div className="support-icon">❓</div>
              <div className="support-info">
                <h4>FAQ</h4>
                <p>Find quick answers to the most common questions about tickets and events.</p>
              </div>
            </div>
          </div>
        ) : (
          <SupportTab token={token} onExit={() => setShowSupportSystem(false)} />
        )}
      </div>
    )
  }

  const renderOrders = () => (
    <div className="page-content active" id="page-orders">
      <div className="welcome-banner" style={{marginBottom: '28px'}}>
        <div>
          <div className="welcome-name">ORDER HISTORY</div>
          <div className="welcome-sub">Your purchases and totals</div>
        </div>
        <button
          type="button"
          className="btn-account-back"
          onClick={() => setActiveTab('events')}
          aria-label="Back to events"
          style={{marginLeft: 'auto'}}
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to Events</span>
        </button>
      </div>
      {ordersLoading ? (
        <div className="text-riv-text2 text-sm">Loading orders...</div>
      ) : ordersError ? (
        <div className="text-red-400 text-sm">{ordersError}</div>
      ) : ordersData.length === 0 ? (
        <div className="text-riv-text2 text-sm">No orders found.</div>
      ) : (
        <div className="account-card" style={{padding: 0}}>
          <div style={{padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '160px 1fr 140px 120px', columnGap: 16, fontSize: 12, color: 'var(--riv-text3)'}}>
            <div>Date</div>
            <div>Purchase</div>
            <div>Status</div>
            <div style={{textAlign: 'right'}}>Total</div>
          </div>
          {ordersData.map((o) => {
            const d = o.paidAt || o.createdAt
            const dateTxt = d ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(d)) : '-'
            const title = o.movieTitle ? o.movieTitle : `Order ${o.orderNumber ?? o.id.slice(0,6).toUpperCase()}`
            return (
              <div key={o.id} style={{padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '160px 1fr 140px 120px', columnGap: 16, alignItems: 'center'}}>
                <div style={{color: 'var(--riv-text2)', fontSize: 13}}>{dateTxt}</div>
                <div style={{fontSize: 14, fontWeight: 600, color: 'var(--riv-text)'}}>
                  {title}
                  {o.cinemaName ? <span style={{marginLeft: 8, color: 'var(--riv-text3)', fontSize: 12}}>· {o.cinemaName}</span> : null}
                </div>
                <div style={{fontSize: 12, color: 'var(--riv-text2)'}}>{o.status}</div>
                <div style={{textAlign: 'right', fontWeight: 700}}>{formatCurrency(o.totalAmount ?? 0)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-riv-bg text-riv-text flex items-center justify-center">
        <p className="text-sm text-riv-text2">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-riv-bg text-riv-text flex items-center justify-center">
        <p className="text-sm text-riv-text2">You must be logged in.</p>
      </div>
    )
  }

  const mobileMenuButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '12px 14px',
    borderRadius: 10,
    margin: '6px 4px',
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: active ? 'var(--riv-text, #fff)' : 'var(--riv-text2, #a6a6ab)',
    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'background 140ms ease, color 140ms ease',
  })

  return (
    <div className="riviera-dashboard">
      {/* Cabeçalho Mobile com Hamburguer */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-3"
        style={{
          background: 'rgba(0,0,0,0.45)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          aria-label="Open Menu"
          onClick={() => setMobileMenuOpen(true)}
          className="h-10 w-10 rounded-md flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--riv-text, #fff)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>
        <div style={{ fontWeight: 900, letterSpacing: '0.12em' }}>RIVIERA<span style={{ color: '#5aa3ff' }}>.</span></div>
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}
        >
          {user?.name?.[0]}{user?.surname?.[0]}
        </div>
      </div>

      {/* Overlay escuro ao abrir o menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setMobileMenuOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Sidebar deslizante (mobile) */}
      <div
        className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px]"
        style={{
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 220ms ease',
          background: 'var(--riv-bg, #0b0b0c)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '8px 0 24px rgba(0,0,0,0.6)',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, letterSpacing: '0.08em' }}>RIVIERA</div>
          <button
            aria-label="Close Menu"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              height: 36,
              width: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '8px 8px' }}>
          <button
            className="w-full text-left"
            style={mobileMenuButtonStyle(activeTab === 'events')}
            onClick={() => {
              setActiveTab('events')
              setMobileMenuOpen(false)
            }}
          >
            🎫 My Events
          </button>
          <button
            className="w-full text-left"
            style={mobileMenuButtonStyle(activeTab === 'account')}
            onClick={() => {
              setActiveTab('account')
              setMobileMenuOpen(false)
            }}
          >
            👤 My Account
          </button>
          <button
            className="w-full text-left"
            style={mobileMenuButtonStyle(activeTab === 'support')}
            onClick={() => {
              setActiveTab('support')
              setMobileMenuOpen(false)
            }}
          >
            ❓ Support
          </button>
          <hr style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '10px 4px' }} />
          <button
            className="w-full text-left"
            style={mobileMenuButtonStyle(false)}
            onClick={() => {
              logout()
              router.push('/')
              setMobileMenuOpen(false)
            }}
          >
            ↳ Sign Out
          </button>
        </div>
        <div style={{ marginTop: 'auto', padding: '12px 16px', opacity: 0.6, fontSize: 12 }}>
          {user?.name} {user?.surname}
        </div>
      </div>
      <nav className="navbar hidden md:flex">
        <div className="nav-logo">
          <img src="/riviera-logo.ico" alt="Riviera Logo" style={{ height: '24px' }} />
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            My Events
          </button>
          <button 
            className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            My Account
          </button>
          <button 
            className={`nav-link ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            Support
          </button>
          <button 
            className="nav-link" 
            style={{color: 'var(--riv-text3)'}}
            onClick={() => {
              logout()
              router.push('/')
            }}
          >
            Sign Out
          </button>
        </div>
        <div className="nav-avatar">
          {user?.name?.[0]}{user?.surname?.[0]}
          <div className="nav-notif"></div>
        </div>
      </nav>

      <div
        className="main pt-16 md:pt-0"
        style={{
          minHeight: '100dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="page-content active">
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'account' && renderAccount()}
          {activeTab === 'support' && renderSupport()}
          {activeTab === 'orders' && renderOrders()}
        </div>
      </div>

      {/* Oculta a barra inferior antiga no mobile para usar o drawer */}
      <nav className="mobile-nav" style={{ display: 'none' }}>
        <button 
          className={`mnav-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>
          Events
        </button>
        <button 
          className={`mnav-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Account
        </button>
        <button 
          className={`mnav-btn ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Support
        </button>
        <button 
          className="mnav-btn"
          onClick={() => {
            logout()
            router.push('/')
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </nav>
    </div>
  )
}


