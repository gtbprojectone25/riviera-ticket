import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  withPadding?: boolean
}

/**
 * Standard page container component that provides consistent 
 * spacing, margin and layout across all pages
 */
export function PageContainer({ 
  children, 
  className,
  withPadding = true
}: PageContainerProps) {
  return (
    <div 
      className={cn(
        "min-h-screen w-full",
        withPadding && "px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12",
        className
      )}
    >
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </div>
  )
}