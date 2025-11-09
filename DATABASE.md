# Configuração do Banco de Dados

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/riviera_ticket"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (opcional)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@riviera-ticket.com"
```

## Setup do Banco de Dados

### 1. PostgreSQL Local

Instale o PostgreSQL localmente ou use Docker:

```bash
# Com Docker
docker run --name postgres-riviera -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=riviera_ticket -p 5432:5432 -d postgres:15

# Ou instale localmente e crie o banco
createdb riviera_ticket
```

### 2. Comandos do Banco

```bash
# Fazer push do schema para o banco
npm run db:push

# Gerar migrations
npm run db:generate

# Executar migrations
npm run db:migrate

# Popular com dados de teste
npm run db:seed

# Setup completo (push + seed)
npm run db:setup

# Abrir Drizzle Studio
npm run db:studio
```

## Estrutura do Banco

### Tabelas Principais

- **users** - Usuários do sistema
- **sessions** - Sessões de autenticação
- **showrooms** - Salas de cinema
- **seats** - Assentos das salas
- **showtimes** - Horários dos filmes
- **seat_reservations** - Reservas temporárias
- **carts** - Carrinhos de compra
- **cart_items** - Itens do carrinho
- **tickets** - Ingressos vendidos
- **payments** - Pagamentos processados

### Relacionamentos

- User 1:N Cart
- User 1:N Ticket
- Cart 1:N CartItem
- Showtime N:1 Showroom
- SeatReservation N:1 Seat
- SeatReservation N:1 Showtime
- Ticket N:1 Seat
- Ticket N:1 Showtime
- Payment 1:1 Cart

## Dados de Teste

O comando `npm run db:seed` criará:

- 2 salas de cinema (IMAX Premium e IMAX Standard)
- Assentos para cada sala
- Horários de filmes para os próximos 7 dias
- 1 usuário de teste

### Usuário de Teste

- Email: `test@example.com`
- Nome: `Usuário Teste`

## Drizzle Studio

Para visualizar e gerenciar os dados do banco:

```bash
npm run db:studio
```

Acesse: http://localhost:4983

## Backup e Restore

```bash
# Backup
pg_dump riviera_ticket > backup.sql

# Restore
psql riviera_ticket < backup.sql
```