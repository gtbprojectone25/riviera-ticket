# 🎬 Riviera Ticket - Sistema de Reserva IMAX

Sistema completo de reserva de ingressos para cinema IMAX, desenvolvido com Next.js 15, seguindo exatamente os designs do Figma fornecidos.

## 📱 Funcionalidades Implementadas

### ✅ Interface Completa (100%)
- **Landing Page**: Hero section com poster do filme e seleção de localização
- **Modal de Localização**: Fluxo completo de 3 etapas (Estado → Cidade → Cinema)  
- **Seleção de Ingressos**: Interface com horários, tipos de ingresso e mapa de assentos
- **Checkout**: Resumo do pedido com preview dos assentos selecionados
- **Autenticação**: Sistema completo de registro e login com múltiplas etapas
- **Confirmação**: Página de sucesso com QR codes e detalhes do pedido

### ✅ Backend Completo (100%)
- **Banco PostgreSQL**: Schema completo com relacionamentos
- **Server Actions**: Autenticação, reservas e pagamentos
- **Gestão de Assentos**: Sistema de reserva temporária (10 minutos)
- **Carrinho**: Persistência de seleções e expiração automática
- **Pagamentos**: Simulação de processamento com diferentes métodos

## 🛠️ Stack Tecnológica

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Banco de Dados**: PostgreSQL + Drizzle ORM
- **Autenticação**: Server Actions + Cookies
- **Validação**: Zod
- **State Management**: Hooks customizados + localStorage

## 📁 Estrutura do Projeto

```
src/
├── app/                      # Pages e layouts
│   ├── (main)/              # Landing page
│   ├── auth/                # Autenticação
│   ├── cart/                # Carrinho
│   ├── checkout/            # Finalização
│   ├── confirmation/        # Confirmação
│   ├── queue-expired/       # Tempo esgotado
│   └── ticket-selection/    # Seleção de ingressos
├── components/              # Componentes reutilizáveis
│   ├── ui/                 # shadcn/ui components
│   └── ...
├── actions/                 # Server Actions
│   ├── auth.ts             # Autenticação
│   ├── bookings.ts         # Reservas
│   └── payments.ts         # Pagamentos
├── db/                      # Configuração do banco
│   ├── schema.ts           # Schema completo
│   ├── index.ts            # Conexão
│   └── migrations/         # Migrações
├── hooks/                   # Hooks customizados
│   ├── use-cart.ts         # Gestão do carrinho
│   └── use-countdown.ts    # Timer de reserva
├── lib/                     # Utilitários
│   ├── database-setup.ts   # Setup e seed do banco
│   └── utils.ts            # Funções auxiliares
└── types/                   # Definições TypeScript
```

## 🚀 Como Executar

### 1. Pré-requisitos
```bash
- Node.js 18+
- PostgreSQL
- npm ou yarn
```

### 2. Instalação
```bash
# Clone o projeto
git clone <url-do-repositorio>
cd riviera-ticket

# Instale as dependências
npm install
```

### 3. Configuração do Banco
```bash
# Configure as variáveis de ambiente
cp .env.example .env.local

# Adicione sua string de conexão PostgreSQL
DATABASE_URL="postgresql://usuario:senha@localhost:5432/riviera_ticket"
```

### 4. Setup do Banco de Dados
```bash
# Execute as migrações
npm run db:push

# Popular com dados de exemplo (opcional)
npm run db:seed
```

### 5. Executar em Desenvolvimento
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 🎯 Fluxo do Usuário

### 1. **Landing Page** (`/`)
- Exibe poster do filme DUNE 2
- Botão "SELECIONAR LOCALIZAÇÃO" abre modal

### 2. **Seleção de Local** (Modal)
- **Etapa 1**: Escolher estado (São Paulo selecionado)
- **Etapa 2**: Escolher cidade (São Paulo selecionada)  
- **Etapa 3**: Escolher cinema (Riviera Shopping)

### 3. **Seleção de Ingressos** (`/ticket-selection`)
- Lista de horários disponíveis
- Seleção de tipos de ingresso (Standard/VIP)
- Mapa interativo de assentos
- Timer de 10 minutos para reserva

### 4. **Checkout** (`/checkout`)
- Resumo do pedido
- Preview dos assentos selecionados
- Seleção de método de pagamento
- Formulário de dados pessoais

### 5. **Autenticação** (`/auth`)
- **Login**: Email e senha
- **Registro**: Nome, sobrenome, email, senha
- **Verificação**: Código enviado por email (simulado)

### 6. **Confirmação** (`/confirmation`)
- QR codes dos ingressos
- Detalhes da sessão
- Informações dos assentos
- Botão para compartilhar

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start

# Linting
npm run lint

# Banco de dados
npm run db:push      # Aplicar schema
npm run db:studio    # Interface visual do banco
npm run db:seed      # Popular com dados de exemplo
```

## 📊 Server Actions Implementadas

### Autenticação (`/actions/auth.ts`)
- `loginUser()`: Login com email/senha
- `registerUser()`: Registro de novo usuário
- `logoutUser()`: Logout e limpeza de sessão
- `getCurrentUser()`: Verificar usuário logado

### Reservas (`/actions/bookings.ts`)
- `getAvailableSeats()`: Buscar assentos disponíveis
- `reserveSeats()`: Reservar assentos temporariamente
- `createCart()`: Criar carrinho de compras
- `getShowtimes()`: Listar sessões disponíveis
- `clearExpiredReservations()`: Limpar reservas expiradas

### Pagamentos (`/actions/payments.ts`)
- `processPayment()`: Processar pagamento
- `getPaymentStatus()`: Status do pagamento
- `refundPayment()`: Processar reembolso

## 🎨 Design System

O projeto segue fielmente os designs do Figma:

- **Cores**: Paleta escura com acentos em azul/roxo
- **Tipografia**: Fonts modernas e legíveis
- **Componentes**: shadcn/ui customizados
- **Responsividade**: Mobile-first design
- **Animations**: Transições suaves e microinterações

## 🔐 Segurança

- Autenticação baseada em cookies HTTPOnly
- Validação de dados com Zod em todas as camadas
- Sanitização de inputs
- Rate limiting (a implementar)
- HTTPS em produção

## 📈 Próximos Passos

### Para Produção:
1. **Integração Real de Pagamento** (Stripe, PagSeguro)
2. **Sistema de Email** (verificação, confirmações)
3. **Rate Limiting** e proteção DDoS
4. **Monitoring** e logs estruturados
5. **Cache** com Redis
6. **CDN** para assets estáticos
7. **Testes** automatizados (Jest, Cypress)

### Funcionalidades Adicionais:
1. **Notificações Push**
2. **Sistema de Avaliações**
3. **Programa de Fidelidade**
4. **Integração com Redes Sociais**
5. **Dashboard Administrativo**

## 📝 Notas de Desenvolvimento

### Decisões Técnicas:
- **Server Actions**: Escolhidas por simplicidade e performance
- **Drizzle ORM**: Type-safety e melhor DX que Prisma
- **Estado Local**: Hooks customizados em vez de Redux/Zustand
- **Hash Simples**: Para desenvolvimento (substituir por bcrypt em produção)

### Padrões de Code:
- **ESLint + Prettier**: Formatação consistente
- **TypeScript Strict**: Type safety máxima
- **Convention over Configuration**: Estrutura padronizada
- **Component Composition**: Reutilização máxima

---

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Desenvolvido com ❤️ seguindo exatamente os designs do Figma fornecidos**