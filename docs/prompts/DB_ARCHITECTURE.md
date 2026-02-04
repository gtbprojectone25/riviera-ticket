# DB Architecture – Riviera Ticket

This document is a **static, source-of-truth snapshot** based on:
- `src/db/schema.ts`
- `src/db/migrations/*`
- `src/db/queries.ts`

No runtime assumptions. Any divergence in other schema files is called out explicitly.

---

## 1) Domain Sources of Truth

**Authentication / Users**
- `users` (source of truth for user identity)
- `user_sessions` (auth session)
- `email_verifications` (email verification state)

**Catalog (Cinema / Auditorium / Session / Movie)**
- `cinemas`
- `auditoriums`
- `sessions`
- `movies`
- `price_rules` (pricing logic)

**Seats**
- `seats` (single source of truth for seat status)

**Cart**
- `carts`
- `cart_items`

**Payment**
- `payment_intents` (Stripe/Adyen status)

**Tickets**
- `tickets` (source of truth for issued tickets)

**Assets / Media**
- `assets`
- `image_slots`

**Queue**
- `queue_counters`
- `queue_entries`

**Audit / Webhooks**
- `webhook_logs`

---

## 2) ERD Textual (Tables, PK/FK, Cardinality)

### users
- PK: `id`
- FKs: —
- Relationships:
  - users (1) → carts (N)
  - users (1) → tickets (N)
  - users (1) → user_sessions (N)
  - users (1) → email_verifications (N)
  - users (1) → webhook_logs (N)
  - users (1) → seats.held_by / seats.reserved_by (N)

### user_sessions
- PK: `id`
- FK: `user_id → users.id`
- Cardinality: users (1) → user_sessions (N)

### email_verifications
- PK: `id`
- FK: —
- Cardinality: email_verifications (N) → users (implicit by email, no FK)

### cinemas
- PK: `id`
- FKs: —
- Cardinality: cinemas (1) → auditoriums (N)

### auditoriums
- PK: `id`
- FK: `cinema_id → cinemas.id`
- Cardinality: auditoriums (1) → sessions (N)

### sessions
- PK: `id`
- FKs:
  - `cinema_id → cinemas.id`
  - `auditorium_id → auditoriums.id`
- Cardinality:
  - sessions (1) → seats (N)
  - sessions (1) → carts (N)
  - sessions (1) → tickets (N)
- Implicit relation:
  - sessions.movieTitle → movies (no FK)

### price_rules
- PK: `id`
- FKs:
  - `cinema_id → cinemas.id`
  - `auditorium_id → auditoriums.id`
  - `session_id → sessions.id`
- Cardinality: price_rules (N) → sessions (0..1), auditoriums (0..1), cinemas (0..1)

### seats
- PK: `id`
- FKs:
  - `session_id → sessions.id`
  - `held_by → users.id`
  - `reserved_by → users.id`
- Cardinality:
  - sessions (1) → seats (N)
  - seats (1) → cart_items (N)
  - seats (1) → tickets (0..1) via unique constraint on tickets

### carts
- PK: `id`
- FKs:
  - `user_id → users.id`
  - `session_id → sessions.id`
- Cardinality:
  - carts (1) → cart_items (N)
  - carts (1) → tickets (N)
  - carts (1) → payment_intents (N)

### cart_items
- PK: `id`
- FKs:
  - `cart_id → carts.id`
  - `seat_id → seats.id`
- Cardinality:
  - carts (1) → cart_items (N)
  - seats (1) → cart_items (N)

### tickets
- PK: `id`
- FKs:
  - `session_id → sessions.id`
  - `user_id → users.id`
  - `seat_id → seats.id`
  - `cart_id → carts.id`
- Constraints:
  - UNIQUE `(session_id, seat_id)` → 1 ticket per seat per session

### payment_intents
- PK: `id`
- FK: `cart_id → carts.id`
- Cardinality: carts (1) → payment_intents (N)

### assets
- PK: `id`
- Relationships:
  - assets (1) → image_slots (N)

### image_slots
- PK: `id`
- FKs:
  - `asset_id → assets.id`
  - `cinema_id → cinemas.id`
  - `auditorium_id → auditoriums.id`
- Constraint:
  - UNIQUE `(slot, cinema_id, auditorium_id)`

### queue_counters
- PK: `scope_key`
- Cardinality: queue_counters (1) → queue_entries (N)

### queue_entries
- PK: `id`
- FKs:
  - `user_id → users.id` (nullable)
  - `cart_id → carts.id` (nullable)
- Constraint:
  - UNIQUE `(scope_key, queue_number)`

### webhook_logs
- PK: `id`
- FK: `user_id → users.id`

---

## 3) Integrity Rules (Constraints & Checks)

**Explicit constraints in schema**
- `users.email` UNIQUE
- `tickets` UNIQUE `(session_id, seat_id)`
- `queue_entries` UNIQUE `(scope_key, queue_number)`
- `image_slots` UNIQUE `(slot, cinema_id, auditorium_id)`
- Multiple FK constraints across carts/items/tickets/payment_intents

**Implicit (code-only) rules**
- Seat lifecycle: AVAILABLE → HELD → SOLD (not enforced by CHECK)
- `cart.total_amount` = sum of `cart_items.price` (not enforced)
- `sessions.movieTitle` should match `movies.title` (no FK)
- “1 active cart per user/session” (not enforced)

**Missing constraints (risk)**
- UNIQUE `(cart_id, seat_id)` in `cart_items` (prevents duplicates)
- FK `sessions.movie_id` (avoid movieTitle drift)
- CHECK: `status = 'SOLD' => sold_at IS NOT NULL`
- CHECK: `status = 'HELD' => held_until IS NOT NULL`

---

## 4) Legacy / Duplicate Schema Risk

**⚠️ Duplicate schema definitions exist**
- `src/db/schema.ts` (current)
- `src/db/schema/*` (legacy table definitions with varchar statuses)
- `src/db/admin-schema.ts` (admin domain)

**Risk**
- Queries may import from different schema files (enum vs varchar)
- Divergent column definitions can cause runtime mismatch

**Plan (no implementation here)**
1. Choose **one** schema file as source of truth (recommended: `src/db/schema.ts`)
2. Audit imports and replace legacy schema usage
3. Remove or archive legacy schema files after migration

---

## 5) Legacy Fields (to be removed or migrated)

**seats table**
- `is_available` (legacy) → replaced by `status`
- `is_reserved` (legacy) → replaced by `status`
- `reserved_by`, `reserved_until` (legacy) → replaced by `held_by`, `held_until`

**Plan**
- Keep temporarily for backward compatibility
- Deprecate once all queries use `status/held_*`

---

## 6) Business Invariants (must always hold)

**Seats**
- A seat **SOLD** must never return to AVAILABLE.
- A seat **HELD** must have `held_until` in the future.
- A seat **HELD** must be linked to a single cart (`held_by_cart_id`).

**Tickets**
- One ticket per seat per session (already enforced).
- Ticket must reference a sold seat or a confirmed payment.

**Carts**
- Cart status transitions: ACTIVE → COMPLETED or EXPIRED.
- ACTIVE cart must have `expires_at` in the future.

**Payments**
- PaymentIntent SUCCEEDED should lock seats as SOLD and issue tickets.

**Queue**
- `(scope_key, queue_number)` must never repeat.
- `queue_counters.next_number` must only increase.

---

## 7) Risk Summary (Production)

**High Risk**
- Duplicate schema definitions (enum vs varchar)
- Seat status duplicated with isAvailable/isReserved
- Missing FK for sessions.movie

**Medium Risk**
- cart_items duplication (no UNIQUE)
- No CHECKs enforcing status → dates

**Low Risk**
- queue without FK to counters (acceptable if code enforced)

---

## 8) Recommended Next Steps (Documentation Only)

1. Consolidate schema to `src/db/schema.ts`
2. Add UNIQUE `(cart_id, seat_id)`
3. Add CHECKs for seat status consistency
4. Add FK from sessions → movies
5. Remove legacy seat fields after migration

