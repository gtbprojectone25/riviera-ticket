# Checkout Premium - Documentação de Implementação

## ✅ Frontend Implementado

### 1. Checkout Premium (`src/app/checkout/page.tsx`)
- ✅ Resumo de tickets com estilo premium conforme prints
- ✅ Cards explicativos com ícone Group.png
- ✅ Seção "100% Buyer Guarantee"
- ✅ Botão "Go to payment $valor" dinâmico
- ✅ Mapa de assentos arrastável e responsivo
- ✅ Visual futurista e premium conforme design

### 2. Componentes Premium (`src/app/checkout/_components/premium-summary.tsx`)
- ✅ `PremiumTicketSummary` - Card de resumo estilo prints
- ✅ `FeatureCards` - 3 cards explicativos com ícone
- ✅ `BuyerGuarantee` - Seção de garantia

### 3. Fluxo de Autenticação (`src/app/auth/page.tsx`)
- ✅ Etapa 1: Email → Envia código 5 dígitos
- ✅ Etapa 2: Name, Surname, SSN (validação 9 dígitos)
- ✅ Etapa 3: Senha com requisitos visuais (8 chars, maiúscula, minúscula, número, símbolo)
- ✅ Etapa 4: Código de verificação 5 dígitos
- ✅ Etapa 5: Animação de criptografia com progress bar
- ✅ Etapa 6: Sucesso e redirecionamento para pagamento

### 4. API Routes Básicas (`src/app/api/auth/`)
- ✅ `POST /api/auth/register-init` - Envia código por email
- ✅ `POST /api/auth/register-continue` - Salva info e valida SSN
- ✅ `POST /api/auth/verify-email` - Verifica código e retorna JWT

## 🔧 Próximos Passos - Backend Completo

### Dependências Necessárias

```bash
npm install jsonwebtoken @types/jsonwebtoken
npm install @nestjs-modules/mailer nodemailer
npm install bwip-js sharp
npm install argon2 # ou bcryptjs (já instalado)
npm install crypto-js # para criptografia AES-GCM
```

### Migrations Necessárias

1. **Tabela de Verificação de Email**
```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at);
```

2. **Campo SSN Criptografado na tabela users**
```sql
ALTER TABLE users ADD COLUMN encrypted_ssn TEXT;
ALTER TABLE users ADD COLUMN ssn_hash TEXT; -- Para validação de unicidade
```

3. **Tabela de Tickets com Barcode**
```sql
ALTER TABLE tickets ADD COLUMN barcode_path TEXT;
ALTER TABLE tickets ADD COLUMN barcode_blurred_path TEXT;
ALTER TABLE tickets ADD COLUMN barcode_revealed_at TIMESTAMP;
```

### Endpoints Backend NestJS Necessários

#### Auth Module
- `POST /auth/register-init` - Envia código 5 dígitos
- `POST /auth/register-continue` - Salva info + valida SSN único
- `POST /auth/set-password` - Define senha com hash
- `POST /auth/verify-email` - Verifica código, criptografa dados, retorna JWT
- `POST /auth/resend-code` - Reenvia código (rate limit)

#### Payment Module
- `POST /payment/stripe/create-intent` - Cria payment intent Stripe
- `POST /payment/adyen/create-payment` - Cria payment Adyen
- `POST /payment/webhook/stripe` - Webhook Stripe
- `POST /payment/webhook/adyen` - Webhook Adyen

#### Ticket Module
- `GET /ticket/:id/barcode` - Retorna barcode (blurred ou real conforme data)
- `GET /user/events` - Lista eventos/tickets do usuário
- `GET /user/tickets/:id` - Detalhes do ticket

### Serviços Necessários

#### Email Service
```typescript
// Usar @nestjs-modules/mailer + nodemailer
// Template HTML para código de verificação
```

#### Barcode Service
```typescript
// Usar bwip-js para gerar Code128/PDF417
// Usar sharp para aplicar blur
// Salvar em storage (local ou cloud)
```

#### Encryption Service
```typescript
// Criptografar SSN com AES-GCM
// Usar crypto do Node.js
// Chave mestra em variável de ambiente
```

#### SSN Validation Service
```typescript
// Validar formato 9 dígitos
// Verificar unicidade por sessão/evento
// Hash do SSN para busca sem expor dados
```

### Variáveis de Ambiente Necessárias

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@rivieratickets.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Adyen
ADYEN_API_KEY=your-adyen-api-key
ADYEN_MERCHANT_ACCOUNT=your-merchant-account
ADYEN_HMAC_KEY=your-hmac-key

# Encryption
ENCRYPTION_KEY=your-32-byte-encryption-key-base64

# Storage (para barcodes)
STORAGE_PATH=./storage/barcodes
# ou
AWS_S3_BUCKET=riviera-tickets-barcodes
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Database
DATABASE_URL=postgresql://...
```

### Regras de Negócio Implementar

1. **SSN Unicidade**
   - 1 SSN = 1 compra por sessão/filme
   - Validar no momento do registro
   - Hash do SSN para busca sem expor

2. **Código de Verificação**
   - 5 dígitos numéricos
   - Validade: 10 minutos
   - Rate limit: 3 tentativas por email a cada 15 minutos

3. **Barcode**
   - Gerar Code128 ou PDF417
   - Versão real: salvar em storage
   - Versão blurred: aplicar blur com sharp
   - Liberar real apenas >= eventDate
   - Proteger rota com autenticação + ownership check

4. **Criptografia**
   - SSN criptografado com AES-GCM
   - Chave mestra em env var
   - Não descriptografar em logs

5. **Pagamento**
   - Só confirmar ticket após webhook de sucesso
   - Criar tickets apenas após pagamento confirmado
   - Enviar email de confirmação após pagamento

### Estrutura de Pastas Backend NestJS (Sugerida)

```
backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   ├── payment/
│   │   ├── payment.controller.ts
│   │   ├── payment.service.ts
│   │   ├── stripe.service.ts
│   │   ├── adyen.service.ts
│   │   └── payment.module.ts
│   ├── ticket/
│   │   ├── ticket.controller.ts
│   │   ├── ticket.service.ts
│   │   ├── barcode.service.ts
│   │   └── ticket.module.ts
│   ├── email/
│   │   ├── email.service.ts
│   │   └── templates/
│   ├── encryption/
│   │   └── encryption.service.ts
│   └── common/
│       ├── guards/
│       ├── decorators/
│       └── interceptors/
├── test/
└── package.json
```

## 📝 Notas de Implementação

1. **Frontend está completo** conforme prints do Figma
2. **API Routes básicas** criadas na estrutura Next.js
3. **Backend NestJS** precisa ser criado separadamente ou migrar API routes
4. **Integrações** (Stripe, Adyen, Email) precisam ser configuradas
5. **Barcode generation** precisa ser implementada
6. **Criptografia** precisa ser implementada para SSN

## 🚀 Como Testar

1. Navegar até `/checkout` após selecionar assentos
2. Verificar resumo premium e cards explicativos
3. Clicar em "Go to payment"
4. Seguir fluxo de auth (5 etapas)
5. Verificar animação de criptografia
6. Redirecionar para página de pagamento

## ⚠️ Avisos

- Códigos de verificação estão sendo retornados em dev (remover em produção)
- JWT_SECRET precisa ser configurado
- Email service precisa ser configurado
- Barcode generation precisa ser implementada
- Criptografia precisa ser implementada

