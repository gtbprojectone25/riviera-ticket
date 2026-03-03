async function verifyApiResponse() {
  const sessionId = 'b758dcf3-d6b4-499c-8e82-28dd5ab870a1'
  const url = `http://localhost:3001/api/sessions/${sessionId}/seats?ensure=true`
  
  console.log(`Fetching ${url}...`)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }
    const rows = await res.json()
    
    // Flatten seats
    const allSeats = rows.flatMap((r: any) => r.seats)
    
    // Check specific seats
    const targetIds = ['H-19', 'H-20', 'J-17', 'J-18']
    
    console.log('Verificando status na resposta da API:')
    targetIds.forEach(id => {
      const seat = allSeats.find((s: any) => s.seatId === id)
      if (seat) {
        console.log(`  Seat ${id}: status="${seat.status}", soldCartId="${seat.soldCartId}"`)
      } else {
        console.log(`  Seat ${id}: NÃO ENCONTRADO na resposta`)
      }
    })
    
  } catch (err) {
    console.error('Erro ao chamar API:', err)
  }
}

verifyApiResponse()
