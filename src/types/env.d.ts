declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
      STRIPE_SECRET_KEY?: string
      NEXT_PUBLIC_ENABLE_DEMO_TICKET_FALLBACK?: string
      ADMIN_EMAIL?: string
      ADMIN_PASSWORD?: string
      ADMIN_NAME?: string
      ADMIN_ROLE?: string
      SHOWTIMES_API_KEY?: string
      SHOWTIMES_BASE_URL?: string
      CRON_SECRET?: string
      ADYEN_API_KEY?: string
      ADYEN_MERCHANT_ACCOUNT?: string
      ADYEN_BASE_URL?: string
      ADYEN_HMAC_KEY?: string
      NEXT_PUBLIC_APP_URL?: string
      STRIPE_WEBHOOK_SECRET?: string
      DATABASE_URL?: string
      NETLIFY?: string
    }
  }
}

export {}
