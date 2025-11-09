#!/usr/bin/env node

/**
 * 🚀 Script de Setup do Banco de Dados Riviera Ticket
 * 
 * Este script ajuda a configurar e popular o banco de dados
 */

import { seedDatabase, checkDatabaseConnection, getDatabaseStats } from '../src/lib/database-setup.js'

async function setup() {
  console.log('🎬 === RIVIERA TICKET DATABASE SETUP === 🎬\n')

  try {
    // Verificar conexão
    console.log('1️⃣ Verificando conexão com banco...')
    const connectionTest = await checkDatabaseConnection()
    
    if (!connectionTest.success) {
      console.error('❌ Erro na conexão com banco:')
      console.error(connectionTest.error)
      console.log('\n📝 Verifique se:')
      console.log('   - O arquivo .env.local está configurado')
      console.log('   - A DATABASE_URL está correta')
      console.log('   - O banco de dados está online')
      process.exit(1)
    }

    console.log('✅ Conexão estabelecida!\n')

    // Executar seed se necessário
    if (!connectionTest.hasData) {
      console.log('2️⃣ Banco vazio detectado. Populando com dados de exemplo...')
      const seedResult = await seedDatabase()
      
      if (seedResult.success) {
        console.log('✅ Banco populado com sucesso!')
        console.log(`   - ${seedResult.data?.sessions} sessões criadas`)
        console.log(`   - ${seedResult.data?.totalSeats} assentos criados\n`)
      } else {
        console.error('❌ Erro ao popular banco:', seedResult.error)
      }
    } else {
      console.log('2️⃣ Banco já contém dados. Pulando seed...\n')
    }

    // Mostrar estatísticas
    console.log('3️⃣ Estatísticas do banco:')
    const stats = await getDatabaseStats()
    
    if (stats.success && stats.stats) {
      console.log(`   📊 Sessões: ${stats.stats.sessions}`)
      console.log(`   🪑 Assentos: ${stats.stats.seats}`)
      console.log(`   👥 Usuários: ${stats.stats.users}`)
      console.log(`   🛒 Carrinhos: ${stats.stats.carts}`)
      console.log(`   💳 Pagamentos: ${stats.stats.payments}`)
      console.log(`   ✅ Assentos disponíveis: ${stats.stats.availableSeats}`)
      console.log(`   🔒 Assentos reservados: ${stats.stats.reservedSeats}`)
    }

    console.log('\n🎉 Setup concluído! Banco pronto para uso.')
    console.log('\n▶️  Execute: npm run dev')
    console.log('🌐 Acesse: http://localhost:3000')

  } catch (error) {
    console.error('\n❌ Erro durante setup:', error)
    process.exit(1)
  }
}

// Executar setup
setup()