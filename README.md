# Riviera Ticket

Sistema de reserva de ingressos para cinema IMAX.

## 🎯 Recursos

- ✅ Interface moderna com Next.js 15 e React 18
- ✅ Componentes UI com shadcn/ui e TailwindCSS
- ✅ Sistema de reserva de assentos em tempo real
- ✅ Countdown timer de 10 minutos para reservas
- ✅ Carrinho de compras com persistência
- ✅ Banco de dados PostgreSQL com Drizzle ORM
- ✅ Esquema completo de cinema com relacionamentos
- 🔄 Autenticação com Better Auth (em implementação)
- 🔄 Pagamentos com Stripe (em implementação)
- 🔄 Deploy automático no Vercel (em implementação)

## 🚀 Tecnologias

### Frontend
- **Next.js 15** - App Router com Server Components
- **React 18** - Componentes funcionais com hooks
- **TypeScript** - Tipagem estática
- **TailwindCSS** - Estilização utilitária
- **shadcn/ui** - Biblioteca de componentes
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

### Backend
- **Drizzle ORM** - ORM type-safe para PostgreSQL
- **PostgreSQL** - Banco de dados relacional
- **Better Auth** - Autenticação moderna
- **Stripe** - Processamento de pagamentos

### DevOps
- **Vercel** - Deploy e hosting
- **ESLint** - Linting de código
- **TypeScript** - Verificação de tipos

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/riviera-ticket.git
cd riviera-ticket
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas configurações:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/riviera_ticket"
BETTER_AUTH_SECRET="your-secret-key"
STRIPE_SECRET_KEY="sk_test_..."
```

4. **Configure o banco de dados**
```bash
# Setup completo do banco (push schema + dados de teste)
npm run db:setup

# Ou manualmente:
npm run db:push    # Criar tabelas
npm run db:seed    # Popular com dados
```

5. **Execute em desenvolvimento**
```bash
npm run dev
```

Acesse: http://localhost:3000

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Pages (App Router)
│   ├── (main)/            # Landing page
│   ├── auth/              # Autenticação
│   ├── ticket-selection/  # Seleção de ingressos
│   ├── cart/              # Carrinho
│   ├── checkout/          # Pagamento
│   └── confirmation/      # Confirmação
├── components/            # Componentes reutilizáveis
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── header.tsx        # Cabeçalho
│   └── animated-background.tsx
├── db/                   # Database layer
│   ├── schema.ts         # Schema do banco
│   ├── queries.ts        # Funções de consulta
│   ├── seed.ts          # Dados de teste
│   └── migrate.ts       # Migrations
├── hooks/               # React hooks customizados
│   ├── use-cart.ts      # Carrinho de compras
│   └── use-countdown.ts # Timer de reserva
├── lib/                 # Utilitários
└── types/              # TypeScript types
```

## 🎮 Funcionalidades

### 1. Página Principal
- Background animado com chamas vermelhas
- Navegação para seleção de ingressos
- Interface responsiva

### 2. Seleção de Ingressos
- Escolha de sala (IMAX Premium/Standard)
- Seleção de horário
- Mapa visual de assentos
- Countdown de 10 minutos para reserva
- Validação de disponibilidade em tempo real

### 3. Carrinho
- Persistência no localStorage
- Resumo dos ingressos selecionados
- Cálculo de preços
- Edição de quantidade

### 4. Checkout
- Formulário de dados pessoais
- Validação com Zod
- Integração com Stripe (em desenvolvimento)

### 5. Confirmação
- Detalhes da compra
- QR codes dos ingressos
- Informações da sessão

## 🗄️ Banco de Dados

### Schema Principal

- **users** - Usuários cadastrados
- **showrooms** - Salas de cinema (IMAX Premium/Standard)
- **seats** - Assentos das salas
- **showtimes** - Horários dos filmes
- **seat_reservations** - Reservas temporárias (10 min)
- **carts** - Carrinhos de compra
- **cart_items** - Itens do carrinho
- **tickets** - Ingressos vendidos
- **payments** - Pagamentos processados

### Comandos Úteis

```bash
# Visualizar banco no Drizzle Studio
npm run db:studio

# Gerar migration
npm run db:generate

# Executar migrations
npm run db:migrate

# Recriar dados de teste
npm run db:seed
```

## 🧪 Dados de Teste

O comando `npm run db:seed` cria:

- 2 salas IMAX (Premium 120 lugares, Standard 80 lugares)
- Horários para os próximos 7 dias
- Usuário teste: `test@example.com`

## 🚀 Deploy

### Vercel (Recomendado)

1. **Configure as variáveis de ambiente no Vercel**
2. **Configure o banco PostgreSQL** (Neon, Supabase, Railway)
3. **Deploy automático via Git**

```bash
npm run build  # Teste o build localmente
```

### Docker

```dockerfile
# Dockerfile incluído para deploy em containers
docker build -t riviera-ticket .
docker run -p 3000:3000 riviera-ticket
```

## 🔧 Scripts Disponíveis

```bash
npm run dev         # Desenvolvimento
npm run build       # Build de produção
npm run start       # Produção
npm run lint        # Linting
npm run db:setup    # Setup completo do banco
npm run db:studio   # Drizzle Studio
npm run db:seed     # Popular dados
```

## 🐛 Debug

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verifique `DATABASE_URL` em `.env.local`
   - Confirme se PostgreSQL está rodando

2. **Tipos TypeScript**
   - Execute `npm run db:generate` após mudanças no schema

3. **Dados de teste**
   - Execute `npm run db:seed` para recriar

### Logs

```bash
# Habilitar logs detalhados
DEBUG=drizzle:* npm run dev
```

## 📝 Próximos Passos

- [ ] Implementar Better Auth completo
- [ ] Finalizar integração Stripe
- [ ] Sistema de notificações por email
- [ ] Relatórios de vendas
- [ ] App mobile React Native
- [ ] Sistema de fidelidade

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👥 Autor

Desenvolvido para o Painel Riviera.

---

**Status do Projeto**: 🟡 Em Desenvolvimento Ativo

- ✅ Frontend completo e funcional
- ✅ Database layer implementado
- 🔄 Backend em integração
- 🔄 Deploy em preparação - IMAX 70MM Ticket Booking System

## 🎬 Project Overview

Riviera Ticket is a modern, responsive ticket booking system built specifically for "The ODYSSEY" IMAX 70MM experience. The platform provides a seamless user experience from seat selection to payment confirmation.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Better Auth (ready for implementation)
- **Database**: Drizzle ORM + PostgreSQL (ready for implementation)
- **Payments**: Stripe (ready for implementation)
- **Deployment**: Vercel (ready for implementation)

## 🌟 Key Features

### ✅ Implemented Features

1. **Landing Page**
   - Animated red flames background (Canvas API)
   - Hero section with movie information
   - Responsive design (desktop-first)

2. **Seat Selection System**
   - Interactive cinema layout visualization
   - Real-time seat availability
   - Maximum 4 tickets per user limit
   - VIP and Standard seat types
   - Visual seat status indicators

3. **Shopping Cart**
   - Persistent cart state (localStorage)
   - Real-time pricing calculations
   - Seat management (add/remove)
   - Order summary display

4. **Authentication**
   - Login/Register forms
   - Form validation with Zod
   - Session management (localStorage)

5. **Checkout System**
   - Secure payment form
   - Billing address collection
   - Order validation
   - Payment processing simulation

6. **Confirmation & Tickets**
   - Order confirmation page
   - QR code generation (mock)
   - Ticket download functionality
   - Email and calendar integration

7. **Session Management**
   - 10-minute countdown timer
   - Auto-expiration handling
   - Queue system for expired sessions

### 🔧 Technical Features

- **Responsive Design**: Mobile-first approach with desktop optimization
- **Type Safety**: Full TypeScript implementation
- **Form Validation**: Zod schemas for all forms
- **State Management**: React hooks + localStorage
- **Component Architecture**: Modular, reusable components
- **Error Handling**: Comprehensive error states
- **Accessibility**: Semantic HTML and ARIA labels

## 📁 Project Structure

```
src/
├── actions/                 # Server Actions (ready for implementation)
├── app/                     # Next.js App Router pages
│   ├── (main)/             # Landing page
│   ├── auth/               # Authentication pages
│   ├── ticket-selection/   # Seat selection
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Payment processing
│   ├── confirmation/       # Order confirmation
│   └── queue-expired/      # Session expired
├── components/             # Reusable components
│   ├── ui/                 # shadcn/ui components
│   ├── animated-background.tsx
│   ├── header.tsx
│   └── page-container.tsx
├── hooks/                  # Custom React hooks
│   ├── use-cart.ts         # Cart state management
│   └── use-countdown.ts    # Timer functionality
├── lib/                    # Utility functions
│   └── utils.ts
└── types/                  # TypeScript definitions
    └── index.ts
```

## 🎯 User Flow

1. **Landing Page** → Movie information and CTA
2. **Seat Selection** → Choose up to 4 seats with 10-minute timer
3. **Cart Review** → Confirm selection and pricing
4. **Authentication** → Login or create account
5. **Checkout** → Payment and billing information
6. **Confirmation** → Ticket generation and QR codes

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Navigate to project directory
cd riviera-ticket

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

Create a `.env.local` file with the following variables (when implementing backend):

```env
# Database
DATABASE_URL="your-postgresql-url"

# Authentication
AUTH_SECRET="your-auth-secret"

# Stripe
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"

# Email (optional)
RESEND_API_KEY="your-resend-api-key"
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#2563eb)
- **Background**: Dark (#0a0a0a)
- **Accent**: Red flames animation
- **Text**: White/Gray scale

### Typography
- **Headlines**: H1/H2 semantic tags
- **Body**: Clean, readable fonts
- **Interactive**: Clear button states

### Components
All components follow shadcn/ui patterns with custom styling for the dark theme.

## 🔒 Security Features

- **Form Validation**: Zod schemas prevent invalid input
- **Session Management**: Time-based expiration
- **Payment Security**: Stripe integration (when implemented)
- **Data Sanitization**: TypeScript type safety

## 📱 Responsive Design

- **Desktop First**: Optimized for large screens
- **Tablet Support**: Responsive grid layouts
- **Mobile Friendly**: Touch-optimized interactions
- **Accessibility**: WCAG compliance ready

## 🧪 Testing Strategy (Ready for Implementation)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 🚀 Deployment

The project is configured for Vercel deployment:

```bash
# Build for production
npm run build

# Preview build locally
npm run start
```

## 🔄 Future Enhancements

### Backend Integration
- [ ] Drizzle ORM database setup
- [ ] Better Auth implementation
- [ ] Stripe payment processing
- [ ] Email notifications
- [ ] Real-time seat updates

### Features
- [ ] Mobile app version
- [ ] Multiple movie support
- [ ] User profiles and history
- [ ] Admin dashboard
- [ ] Analytics integration

### Performance
- [ ] Image optimization
- [ ] Code splitting
- [ ] CDN integration
- [ ] Caching strategies

## 🐛 Known Issues

- Payment processing is currently simulated
- Real-time seat updates require WebSocket implementation
- Email functionality needs backend integration

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript and ESLint conventions
4. Write tests for new features
5. Submit a pull request

## 📄 License

This project is part of a portfolio demonstration.

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with ❤️ for an amazing IMAX experience**
