/**
 * Database seed script
 * Populates the database with initial data for development and testing
 */

import { db } from './index'
import { sessions, movies, users } from './schema'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'
import { hashPassword } from '@/lib/password'

async function seedDatabase() {
  console.log('🌱 Starting database seed...')

  try {
    // Hash passwords first
    const testUserPassword = await hashPassword('test123')
    const adminPassword = await hashPassword('admin123')

    // Create a test user
    const [testUser] = await db.insert(users).values({
      email: 'test@riviera.com',
      name: 'Test',
      surname: 'User',
      hashedPassword: testUserPassword,
      emailVerified: true,
      role: 'USER',
    }).onConflictDoNothing().returning()

    if (testUser) {
      console.log('✅ Created test user:', testUser.email)
    } else {
      console.log('ℹ️  Test user already exists')
    }

    // Create an admin user
    const [adminUser] = await db.insert(users).values({
      email: 'admin@riviera.com',
      name: 'Admin',
      surname: 'Riviera',
      hashedPassword: adminPassword,
      emailVerified: true,
      role: 'ADMIN',
    }).onConflictDoNothing().returning()

    if (adminUser) {
      console.log('✅ Created admin user:', adminUser.email, '(role: ADMIN)')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    // Create a super admin user
    const superAdminPassword = await hashPassword('superadmin123')
    const [superAdmin] = await db.insert(users).values({
      email: 'superadmin@riviera.com',
      name: 'Super',
      surname: 'Admin',
      hashedPassword: superAdminPassword,
      emailVerified: true,
      role: 'SUPER_ADMIN',
    }).onConflictDoNothing().returning()

    if (superAdmin) {
      console.log('✅ Created super admin user:', superAdmin.email, '(role: SUPER_ADMIN)')
    } else {
      console.log('ℹ️  Super admin user already exists')
    }

    // Create movie information
    const [movie] = await db.insert(movies).values({
      title: 'Die Odyssee',
      subtitle: 'DEFY THE GODS',
      releaseDate: '07.17.26',
      duration: 150, // 2.5 hours
      genre: ['Action', 'Adventure', 'Drama'],
      director: 'Christopher Nolan',
      cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
      synopsis: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
      posterUrl: '/images/odyssey-poster.jpg',
      trailerUrl: 'https://youtube.com/watch?v=example',
      imaxFormat: '70MM',
      imaxExperience: 'Experience the ultimate in sight and sound',
      imaxBenefits: [
        'Crystal clear images with incredible detail',
        'Powerful, precise sound that places you inside the action',
        'Immersive experience like no other'
      ],
    }).onConflictDoNothing().returning()

    if (movie) {
      console.log('✅ Created movie:', movie.title)
    } else {
      console.log('ℹ️  Movie already exists')
    }

    // Create movie sessions (skip if already exist)
    const sessionsData = [
      {
        movieTitle: 'Die Odyssee',
        movieDuration: 150,
        startTime: new Date('2026-04-16T16:00:00Z'),
        endTime: new Date('2026-04-16T18:30:00Z'),
        cinemaName: 'Roxy Cinema',
        screenType: 'IMAX_70MM' as const,
        totalSeats: 200,
        availableSeats: 200,
        basePrice: 34900, // in cents ($349.00)
        vipPrice: 44900,  // in cents ($449.00)
      },
      {
        movieTitle: 'Die Odyssee',
        movieDuration: 150,
        startTime: new Date('2026-04-16T19:00:00Z'),
        endTime: new Date('2026-04-16T21:30:00Z'),
        cinemaName: 'Roxy Cinema',
        screenType: 'IMAX_70MM' as const,
        totalSeats: 200,
        availableSeats: 200,
        basePrice: 34900, // in cents ($349.00)
        vipPrice: 44900,  // in cents ($449.00)
      },
      {
        movieTitle: 'Die Odyssee',
        movieDuration: 150,
        startTime: new Date('2026-04-17T14:00:00Z'),
        endTime: new Date('2026-04-17T16:30:00Z'),
        cinemaName: 'Bella UCI Center',
        screenType: 'IMAX_70MM' as const,
        totalSeats: 200,
        availableSeats: 200,
        basePrice: 34900, // in cents ($349.00)
        vipPrice: 44900,  // in cents ($449.00)
      },
    ]

    const createdSessions = await db.insert(sessions).values(sessionsData).onConflictDoNothing().returning()
    
    if (createdSessions.length > 0) {
      console.log(`✅ Created ${createdSessions.length} movie sessions`)

      // Create seats only through the canonical ensureSeatsForSession service.
      for (const session of createdSessions) {
        try {
          const result = await ensureSeatsForSession(session.id)
          console.log(`✅ Ensured ${result.created} seats for session ${session.id}`)
        } catch (error) {
          console.warn(`⚠️ Could not ensure seats for session ${session.id}:`, error)
        }
      }
    } else {
      console.log('ℹ️  Sessions already exist')
    }

    console.log('🎉 Database seed completed successfully!')
    
    // Print summary
    console.log('\n📊 Seed Summary:')
    console.log(`- Users: 3 (test, admin, superadmin)`)
    console.log(`- Movies: 1`)
    console.log(`- Sessions: ${createdSessions.length}`)
    console.log(`- Seats per session: 200`)
    console.log(`- Total seats: ${createdSessions.length * 200}`)
    console.log('\n🔐 Login credentials:')
    console.log('  - test@riviera.com / test123 (USER)')
    console.log('  - admin@riviera.com / admin123 (ADMIN)')
    console.log('  - superadmin@riviera.com / superadmin123 (SUPER_ADMIN)')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { seedDatabase }
