/**
 * Seed do Admin Inicial
 * Executa: npx tsx src/db/seed-admin.ts
 */

import { db } from './index'
import { 
  adminUsers,
  permissions,
  cities,
  ticketCategories,
} from './admin-schema'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = 'growthhub85@gmail.com'
const ADMIN_PASSWORD = 'growthhubRiviera2025@'
const ADMIN_NAME = 'Growth Hub Admin'

async function seedAdmin() {
  console.log('🌱 Iniciando seed do Admin...\n')

  try {
    // 1. Criar admin principal
    console.log('1️⃣ Criando admin principal...')
    
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
    
    const [admin] = await db
      .insert(adminUsers)
      .values({
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      })
      .onConflictDoNothing()
      .returning()

    if (admin) {
      console.log(`   ✅ Admin criado: ${admin.email}`)
    } else {
      console.log(`   ⚠️ Admin já existe: ${ADMIN_EMAIL}`)
    }

    // 2. Criar permissões base
    console.log('\n2️⃣ Criando permissões...')
    
    const permissionsData = [
      // Cinemas
      { code: 'cinema.view', name: 'Ver Cinemas', module: 'cinemas' },
      { code: 'cinema.create', name: 'Criar Cinema', module: 'cinemas' },
      { code: 'cinema.edit', name: 'Editar Cinema', module: 'cinemas' },
      { code: 'cinema.delete', name: 'Deletar Cinema', module: 'cinemas' },
      
      // Sessões
      { code: 'session.view', name: 'Ver Sessões', module: 'sessions' },
      { code: 'session.create', name: 'Criar Sessão', module: 'sessions' },
      { code: 'session.edit', name: 'Editar Sessão', module: 'sessions' },
      { code: 'session.delete', name: 'Deletar Sessão', module: 'sessions' },
      
      // Pedidos
      { code: 'order.view', name: 'Ver Pedidos', module: 'orders' },
      { code: 'order.refund', name: 'Reembolsar Pedido', module: 'orders' },
      { code: 'order.cancel', name: 'Cancelar Pedido', module: 'orders' },
      
      // Usuários
      { code: 'user.view', name: 'Ver Usuários', module: 'users' },
      { code: 'user.block', name: 'Bloquear Usuário', module: 'users' },
      
      // Relatórios
      { code: 'report.view', name: 'Ver Relatórios', module: 'reports' },
      { code: 'report.export', name: 'Exportar Relatórios', module: 'reports' },
      
      // Admin
      { code: 'admin.view', name: 'Ver Administradores', module: 'admin' },
      { code: 'admin.create', name: 'Criar Administrador', module: 'admin' },
      { code: 'admin.edit', name: 'Editar Administrador', module: 'admin' },
    ]

    for (const perm of permissionsData) {
      await db
        .insert(permissions)
        .values(perm)
        .onConflictDoNothing()
    }
    console.log(`   ✅ ${permissionsData.length} permissões criadas`)

    // 3. Criar categorias de ticket
    console.log('\n3️⃣ Criando categorias de ticket...')
    
    const categoriesData = [
      { name: 'Inteira', code: 'FULL', discountPercent: 0, sortOrder: 1 },
      { name: 'Meia-Entrada', code: 'HALF', discountPercent: 50, requiresDocument: true, documentType: 'Documento de meia-entrada', sortOrder: 2 },
      { name: 'VIP', code: 'VIP', discountPercent: 0, sortOrder: 3 },
      { name: 'Estudante', code: 'STUDENT', discountPercent: 50, requiresDocument: true, documentType: 'Carteira de estudante', sortOrder: 4 },
      { name: 'Idoso', code: 'SENIOR', discountPercent: 50, requiresDocument: true, documentType: 'RG ou documento com foto', sortOrder: 5 },
    ]

    for (const cat of categoriesData) {
      await db
        .insert(ticketCategories)
        .values(cat)
        .onConflictDoNothing()
    }
    console.log(`   ✅ ${categoriesData.length} categorias criadas`)

    // 4. Criar cidades exemplo
    console.log('\n4️⃣ Criando cidades exemplo...')
    
    const citiesData = [
      { name: 'São Paulo', state: 'SP', country: 'BR' },
      { name: 'Rio de Janeiro', state: 'RJ', country: 'BR' },
      { name: 'Los Angeles', state: 'CA', country: 'US' },
      { name: 'New York', state: 'NY', country: 'US' },
    ]

    for (const city of citiesData) {
      await db
        .insert(cities)
        .values(city)
        .onConflictDoNothing()
    }
    console.log(`   ✅ ${citiesData.length} cidades criadas`)

    console.log('\n✅ Seed concluído com sucesso!')
    console.log('\n📋 Credenciais do Admin:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Senha: ${ADMIN_PASSWORD}`)
    console.log('\n🔗 Acesse: http://localhost:3000/admin/login')

  } catch (error) {
    console.error('❌ Erro no seed:', error)
    throw error
  }
}

// Executar
seedAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
