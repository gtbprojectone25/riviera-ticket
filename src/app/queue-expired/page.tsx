'use client'

import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Queue Expired Page - Shown when user's session times out
 * Provides clear explanation and option to rejoin queue
 */
export default function QueueExpiredPage() {
  const router = useRouter()

  const handleTryAgain = () => {
    // Clear any existing cart data
    localStorage.removeItem('riviera-cart')
    localStorage.removeItem('user-session')
    
    // Redirect to landing page to start over
    router.push('/')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <PageContainer>
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-full mb-4 mx-auto">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-white text-2xl mb-2">Session Expired</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Time limit reached</span>
              </div>
              
              <p className="text-muted-foreground">
                Your 10-minute reservation window has expired. To ensure fairness for all customers, 
                your selected seats have been released back to the general pool.
              </p>
            </div>

            <div className="bg-muted/20 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">What happened?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• You had 10 minutes to complete your purchase</li>
                <li>• The timer expired during your session</li>
                <li>• Your selected seats are now available to other customers</li>
                <li>• You&apos;ve been placed back in the virtual queue</li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <h3 className="text-blue-400 font-semibold mb-2">Next steps</h3>
              <p className="text-sm text-muted-foreground">
                You can rejoin the queue and try again. We recommend having your payment 
                information ready to complete your purchase faster.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleTryAgain}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Join Queue Again
              </Button>
              
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                Return to Home
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Tip:</strong> Create an account and have your payment method ready 
                to complete purchases faster in the future.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}