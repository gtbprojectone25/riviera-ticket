/**
 * Drizzle configuration file
 * Defines database connection and migration settings
 */

import type { Config } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { join } from 'path'

// Função para carregar .env.local manualmente
function loadEnvLocal() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        if (key.trim() && !key.startsWith('#')) {
          process.env[key.trim()] = value.trim()
        }
      }
    })
  } catch {
    console.warn('⚠️  Arquivo .env.local não encontrado ou não pode ser lido')
  }
}

// Carregar variáveis de ambiente
loadEnvLocal()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl || databaseUrl.includes('YOUR_PASSWORD') || databaseUrl.includes('seu_usuario')) {
  console.error('❌ DATABASE_URL não configurada corretamente!')
  console.error('\n🎯 CONFIGURAÇÃO RÁPIDA:')
  console.error('1. Acesse: https://neon.tech')
  console.error('2. Crie conta gratuita')
  console.error('3. Crie projeto "riviera-ticket"')
  console.error('4. Copie a Connection String')
  console.error('5. Cole no arquivo .env.local')
  console.error('\n📖 Veja: NEON-SETUP.md para instruções detalhadas')
  process.exit(1)
}

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
} satisfies Config