/**
 * Database seed script
 * Populates the database with initial data for development and testing
 */

import { db } from './index'
import { sessions, movies, users } from './schema'
import { createSeatsForSession } from './queries'

async function seedDatabase() {
  console.log('🌱 Starting database seed...')

  try {
    // Create a test user
    const [testUser] = await db.insert(users).values({
      email: 'test@riviera.com',
      name: 'Test',
      surname: 'User',
      hashedPassword: '$2a$10$test.hash.placeholder', // In real app, use proper hashing
      emailVerified: true,
    }).returning()

    console.log('✅ Created test user:', testUser.email)

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
    }).returning()

    console.log('✅ Created movie:', movie.title)

    // Create movie sessions
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
        basePrice: 2999, // $29.99
        vipPrice: 4999,  // $49.99
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
        basePrice: 2999, // $29.99
        vipPrice: 4999,  // $49.99
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
        basePrice: 2999, // $29.99
        vipPrice: 4999,  // $49.99
      },
    ]

    const createdSessions = await db.insert(sessions).values(sessionsData).returning()
    console.log(`✅ Created ${createdSessions.length} movie sessions`)

    // Create seats for each session
    for (const session of createdSessions) {
      const seats = await createSeatsForSession(session.id)
      console.log(`✅ Created ${seats.length} seats for session ${session.id}`)
    }

    console.log('🎉 Database seed completed successfully!')
    
    // Print summary
    console.log('\n📊 Seed Summary:')
    console.log(`- Users: 1`)
    console.log(`- Movies: 1`)
    console.log(`- Sessions: ${createdSessions.length}`)
    console.log(`- Seats per session: 200`)
    console.log(`- Total seats: ${createdSessions.length * 200}`)

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