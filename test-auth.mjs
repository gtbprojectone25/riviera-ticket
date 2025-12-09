import bcrypt from 'bcryptjs'
import { db } from './src/db/index.js'
import { users } from './src/db/schema.js'
import { eq } from 'drizzle-orm'

async function testAuth() {
  console.log('=== Teste de Autenticação ===\n')
  
  // Testar hash bcrypt regex
  const testHash = '$2b$12$L1FPFJVG/PUALvHmgZ/29uLQ6GWJq/MzNZ0TnxswOBOjTg9qrwa8G'
  const bcryptRegex = /^\$2[aby]\$\d{2}\$/
  console.log('Hash de teste:', testHash.substring(0, 15))
  console.log('É bcrypt (regex):', bcryptRegex.test(testHash))
  
  // Buscar usuário de teste
  const testUser = await db.select().from(users).where(eq(users.email, 'test@riviera.com'))
  
  if (testUser.length === 0) {
    console.log('Usuário test@riviera.com não encontrado!')
    process.exit(1)
  }
  
  const user = testUser[0]
  console.log('\nUsuário encontrado:', user.email)
  console.log('Hash armazenado:', user.hashedPassword.substring(0, 20) + '...')
  console.log('É bcrypt (regex):', bcryptRegex.test(user.hashedPassword))
  
  // Testar senha
  const password = 'test123'
  const isValid = await bcrypt.compare(password, user.hashedPassword)
  console.log('\nSenha "test123" válida:', isValid)
  
  process.exit(0)
}

testAuth().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
