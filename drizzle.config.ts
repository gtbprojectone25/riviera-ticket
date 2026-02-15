import type { Config } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { join } from 'path'

const env = process.env as unknown as Record<string, string | undefined>

function loadEnvLocal() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')

    envContent.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        const trimmedKey = key.trim()
        if (trimmedKey && !trimmedKey.startsWith('#')) {
          env[trimmedKey] = value.trim()
        }
      }
    })
  } catch {
    console.warn('Warning: .env.local not found or unreadable')
  }
}

loadEnvLocal()

const databaseUrl = env.ADMIN_DATABASE_URL || env.DATABASE_URL

if (!databaseUrl || databaseUrl.includes('YOUR_PASSWORD') || databaseUrl.includes('seu_usuario')) {
  console.error('ADMIN_DATABASE_URL or DATABASE_URL is not configured correctly')
  process.exit(1)
}

export default {
  schema: ['./src/db/schema.ts', './src/db/admin-schema.ts'],
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
} satisfies Config
