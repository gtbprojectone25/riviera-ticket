# Backend Implementation - Resumo Completo

## ✅ Implementado

### 1. Migrations e Schema
- ✅ Tabela `email_verifications` para códigos de verificação
- ✅ Campos `encrypted_ssn` e `ssn_hash` na tabela `users`
- ✅ Campos de barcode na tabela `tickets` (path, blurred_path, revealed_at, data)

### 2. Serviços Core
- ✅ **Email Service** (`src/lib/email-service.ts`)
  - Envio de códigos de verificação
  - Envio de confirmação de tickets
  - Templates HTML

- ✅ **Barcode Service** (`src/lib/barcode-service.ts`)
  - Geração de Code128 com bwip-js
  - Aplicação de blur com sharp
  - Salvamento em storage
  - Lógica de revelação baseada em data

- ✅ **Encryption Service** (`src/lib/encryption-service.ts`)
  - Criptografia AES-256-GCM para SSN
  - Hash SHA-256 para validação de unicidade
  - Função para gerar chaves

### 3. API Routes de Autenticação
- ✅ `POST /api/auth/register-init` - Envia código 5 dígitos
- ✅ `POST /api/auth/register-continue` - Salva info + valida SSN
- ✅ `POST /api/auth/verify-email` - Verifica código e retorna JWT

### 4. API Routes de Pagamento
- ✅ `POST /api/payment/stripe/create-intent` - Cria payment intent Stripe
- ✅ `POST /api/payment/stripe/webhook` - Webhook Stripe
- ✅ `POST /api/payment/adyen/create-payment` - Cria payment Adyen
- ✅ `POST /api/payment/adyen/webhook` - Webhook Adyen

### 5. API Routes de Tickets
- ✅ `GET /api/ticket/:id/barcode` - Retorna barcode (blurred/real)
- ✅ `GET /api/user/events` - Lista eventos do usuário

## 📦 Dependências Necessárias

Execute para instalar todas as dependências:

```bash
npm install jsonwebtoken @types/jsonwebtoken nodemailer @types/nodemailer bwip-js sharp argon2 crypto-js @types/crypto-js
```

**Nota:** Se houver erro com o npm, tente instalar uma por vez ou verifique o package.json.

## 🔧 Configuração de Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

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
ADYEN_BASE_URL=https://checkout-test.adyen.com/v70

# Encryption
ENCRYPTION_KEY=your-32-byte-base64-encoded-key
SSN_SALT=your-salt-for-ssn-hashing

# Storage
STORAGE_PATH=./storage/barcodes

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Executar Migrations

Execute o SQL manualmente ou via drizzle-kit:

```bash
# Ver migration SQL em: src/db/migrations/add_email_verification_and_barcode.sql
npm run db:push
```

Ou execute o SQL diretamente no banco.

## 🚀 Próximos Passos

1. **Instalar dependências** (se ainda não instalou)
2. **Configurar variáveis de ambiente**
3. **Executar migrations**
4. **Testar endpoints**:
   - Criar conta → receber código
   - Verificar código → receber JWT
   - Criar payment intent → processar pagamento
   - Verificar webhook → criar tickets + barcodes

## 📝 Notas Importantes

- **Email Service**: Configurar SMTP antes de usar em produção
- **Barcode Service**: Criar diretório `storage/barcodes` ou configurar S3
- **Encryption**: Gerar chave segura com `EncryptionService.generateKey()`
- **Webhooks**: Configurar URLs no Stripe/Adyen dashboard
- **Autenticação**: Implementar middleware JWT para proteger rotas

## 🔒 Segurança

- ✅ HMAC verification nos webhooks
- ✅ Criptografia AES-GCM para dados sensíveis
- ✅ Hash para validação de unicidade sem expor dados
- ✅ Validação de signatures nos webhooks
- ⚠️ Implementar rate limiting nos endpoints de auth
- ⚠️ Implementar middleware de autenticação JWT

