import { redirect } from 'next/navigation'

/**
 * Root page that redirects to main landing page
 */
export default function RootPage() {
  redirect('/(main)')
}
