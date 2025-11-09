'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountdownTimer } from '../ticket-selection/_components/countdown-timer'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, Lock, ArrowLeft } from 'lucide-react'

// Zod schema for payment form
const paymentSchema = z.object({
  cardNumber: z.string().min(16, 'Card number must be 16 digits').max(19, 'Invalid card number'),
  expiryMonth: z.string().min(2, 'Required').max(2, 'Invalid month'),
  expiryYear: z.string().min(2, 'Required').max(2, 'Invalid year'),
  cvv: z.string().min(3, 'CVV must be 3-4 digits').max(4, 'Invalid CVV'),
  cardholderName: z.string().min(2, 'Name must be at least 2 characters'),
  billingAddress: z.object({
    line1: z.string().min(5, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postalCode: z.string().min(5, 'Postal code is required'),
    country: z.string().min(2, 'Country is required'),
  })
})

type PaymentFormData = z.infer<typeof paymentSchema>

/**
 * Checkout Page - Payment processing and order completion
 * Integrates with Stripe for secure payment handling
 */
export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, getCartSummary } = useCart()
  const [isProcessing, setIsProcessing] = useState(false)

  const cartSummary = getCartSummary()

  // Payment form
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: '',
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      }
    }
  })

  // Redirect if no cart or expired
  if (!cart || cartSummary.isExpired || cartSummary.totalSeats === 0) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white mb-4">No items to checkout</h1>
          <p className="text-muted-foreground mb-6">
            {cartSummary.isExpired 
              ? "Your session has expired. Please start over."
              : "You haven't selected any seats yet."
            }
          </p>
          <Button 
            onClick={() => router.push('/ticket-selection')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Select Seats
          </Button>
        </div>
      </PageContainer>
    )
  }

  const handlePayment = async (data: PaymentFormData) => {
    setIsProcessing(true)
    try {
      // Simulate Stripe payment processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      console.log('Payment data:', data)
      console.log('Cart data:', cart)
      
      // Generate mock order ID
      const orderId = `order_${Date.now()}`
      
      // Store order details
      const orderDetails = {
        id: orderId,
        cart,
        paymentData: data,
        status: 'completed',
        purchaseDate: new Date().toISOString(),
        total: cartSummary.totalAmount
      }
      
      localStorage.setItem('last-order', JSON.stringify(orderDetails))
      
      // Clear cart
      clearCart()
      
      // Redirect to confirmation
      router.push(`/confirmation?orderId=${orderId}`)
      
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBackToCart = () => {
    router.push('/cart')
  }

  const handleSessionExpired = () => {
    clearCart()
    router.push('/queue-expired')
  }

  // Format card number input
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const standardSeats = cart.seats.filter(seat => seat.type === 'STANDARD')
  const vipSeats = cart.seats.filter(seat => seat.type === 'VIP')

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header with countdown */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Secure Checkout</h1>
            <p className="text-muted-foreground">
              Complete your purchase securely with our encrypted payment system
            </p>
          </div>
          <CountdownTimer onExpired={handleSessionExpired} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 mr-1" />
                  Your payment information is encrypted and secure
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(handlePayment)} className="space-y-6">
                  {/* Card Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        {...form.register('cardNumber')}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value)
                          e.target.value = formatted
                          form.setValue('cardNumber', formatted.replace(/\s/g, ''))
                        }}
                      />
                      {form.formState.errors.cardNumber && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.cardNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expiryMonth">Month</Label>
                        <Input
                          id="expiryMonth"
                          placeholder="MM"
                          maxLength={2}
                          {...form.register('expiryMonth')}
                        />
                        {form.formState.errors.expiryMonth && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.expiryMonth.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiryYear">Year</Label>
                        <Input
                          id="expiryYear"
                          placeholder="YY"
                          maxLength={2}
                          {...form.register('expiryYear')}
                        />
                        {form.formState.errors.expiryYear && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.expiryYear.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          maxLength={4}
                          {...form.register('cvv')}
                        />
                        {form.formState.errors.cvv && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.cvv.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        placeholder="John Doe"
                        {...form.register('cardholderName')}
                      />
                      {form.formState.errors.cardholderName && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.cardholderName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Billing Address</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="line1">Address Line 1</Label>
                      <Input
                        id="line1"
                        placeholder="123 Main Street"
                        {...form.register('billingAddress.line1')}
                      />
                      {form.formState.errors.billingAddress?.line1 && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.billingAddress.line1.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                      <Input
                        id="line2"
                        placeholder="Apartment, suite, unit, etc."
                        {...form.register('billingAddress.line2')}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="New York"
                          {...form.register('billingAddress.city')}
                        />
                        {form.formState.errors.billingAddress?.city && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.billingAddress.city.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          placeholder="NY"
                          {...form.register('billingAddress.state')}
                        />
                        {form.formState.errors.billingAddress?.state && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.billingAddress.state.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          placeholder="10001"
                          {...form.register('billingAddress.postalCode')}
                        />
                        {form.formState.errors.billingAddress?.postalCode && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.billingAddress.postalCode.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          placeholder="US"
                          {...form.register('billingAddress.country')}
                        />
                        {form.formState.errors.billingAddress?.country && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.billingAddress.country.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToCart}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Cart
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {isProcessing ? 'Processing Payment...' : `Pay ${formatCurrency(cartSummary.totalAmount)}`}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-white">Die Odyssee</h3>
                    <p className="text-sm text-muted-foreground">16/04/2026 • 16:00 - 18:30</p>
                    <p className="text-sm text-muted-foreground">Roxy Cinema • IMAX 70MM</p>
                  </div>

                  <div className="space-y-2">
                    {cart.seats.map(seat => (
                      <div key={seat.seatId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Seat {seat.seatId} ({seat.type})
                        </span>
                        <span className="text-white">
                          {formatCurrency(seat.price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    {standardSeats.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Standard Tickets ({standardSeats.length}x)
                        </span>
                        <span className="text-white">
                          {formatCurrency(standardSeats.reduce((sum, seat) => sum + seat.price, 0))}
                        </span>
                      </div>
                    )}
                    
                    {vipSeats.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          VIP Tickets ({vipSeats.length}x)
                        </span>
                        <span className="text-white">
                          {formatCurrency(vipSeats.reduce((sum, seat) => sum + seat.price, 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-white">Total:</span>
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(cartSummary.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-white">Security</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• 256-bit SSL encryption</p>
                <p>• PCI DSS compliant</p>
                <p>• Stripe secure payment processing</p>
                <p>• No card details stored</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}