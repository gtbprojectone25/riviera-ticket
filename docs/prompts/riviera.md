# Riviera Ticket — Project Context

## Visão Geral
Aplicação de venda de ingressos de cinema com reserva de assentos, pagamento online e painel admin.
Stack:
- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind + shadcn
- Drizzle ORM + PostgreSQL (Neon)
- Stripe (principal)
- Zod, Zustand

Fluxo do usuário:
Location → Ticket Selection → Seat Selection → Checkout → Register → Payment → Confirmation

Admin:
src/app/admin/(dashboard)
Abas: Images, Texts, Prices, Times, Sessions, Sales

---

## Regras Arquiteturais (OBRIGATÓRIO RESPEITAR)
- Preços SEMPRE em centavos no DB e Stripe.
- Assentos nunca podem ser vendidos sem lock transacional.
- Assentos têm status: available | held | sold.
- HOLD deve acontecer ANTES do pagamento.
- Webhook é responsável por consumir assentos e criar tickets.
- Auth deve ser único (cookies + sessions).
- Tokens devem usar crypto seguro.
- Nada de URL de imagem solta → sempre via tabela assets.
- Admin controla conteúdo e operação via DB (não hardcode).

---

## Problemas Conhecidos (para correção)
HIGH:
- Assentos não são reservados no backend antes do pagamento.
- Webhook confirma pagamento mas não consome assentos.

MEDIUM:
- createTicketsFromCart só atualiza 1 assento.
- Auth inconsistente (bcrypt vs argon2).
- Token de sessão inseguro (Math.random).
- Preço inconsistente (UI, Stripe, DB).
- Webhook assume userId não-null.

LOW:
- Schema duplicado/divergente.
- Falta de testes automatizados.

---

## Modelagem Atual (resumo)
Tabelas principais:
- users
- user_sessions
- cinemas
- auditoriums
- movies
- sessions
- seats
- carts
- cart_items
- tickets
- payment_intents
- webhook_logs
- email_verifications

---

## Objetivos do Admin
- CRUD de filmes, cinemas, salas, sessões, preços.
- Upload e controle de imagens (assets + slots).
- Dashboard de vendas:
  - receita total
  - ingressos vendidos
  - ticket médio
  - ocupação por sessão
  - vendas por região/cinema/usuário

---

## Padrões de Código
- Usar Drizzle + Zod.
- Transactions explícitas para fluxo crítico.
- Nomes claros e consistentes.
- Evitar lógica crítica no client.
- Separar domínio (db/queries) de UI.

---

## Arquivos Críticos
- src/actions/bookings.ts
- src/db/queries.ts
- src/app/api/payments/stripe/webhook/route.ts
- src/actions/auth.ts
- src/app/api/auth/*
- src/db/schema.ts