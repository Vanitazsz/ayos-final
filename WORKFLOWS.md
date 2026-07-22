# Workflows

## Authentication and Google OAuth

```mermaid
sequenceDiagram
  participant U as User
  participant App as Expo/Web
  participant Auth as Supabase Auth
  participant DB as Postgres
  U->>App: Email/password or Google
  App->>Auth: signIn / signInWithOAuth (PKCE)
  Auth-->>App: ayos://auth/callback + code
  App->>Auth: Exchange code for session
  Auth->>DB: Provision account/profile if new
  DB-->>Auth: USER membership only for social user
  App->>DB: Load account and role context
  alt suspended or deleted
    DB-->>App: Reject protected navigation
  else active
    DB-->>App: Authorized role projection
  end
```

Google setup is not active until credentials/redirect URLs are supplied. Apple/X controls do not perform a fake action.

## Registration and password reset

Email signup creates an Auth user; the trigger creates the account/profile/membership. Unconfirmed accounts stay pending until Supabase verification completes. Recovery uses a Supabase email redirect and `updateUser`; there is no fixed application OTP.

## Customer request with optional AI

```mermaid
sequenceDiagram
  participant C as Customer
  participant App as Expo
  participant S as Storage
  participant AI as Edge AI
  participant DB as Postgres
  C->>App: Description, category, photos/audio, address
  App->>S: Upload to UUID-owned paths
  alt Consent accepted
    App->>AI: Queue with JWT, consent, idempotency key
    AI->>DB: Insert consent + QUEUED job
    DB-->>App: Realtime job updates
    App->>AI: Process owned job
    AI->>AI: Gemini attempts, conditional OpenAI fallback
    AI->>DB: Validate/persist result and attempts
    DB-->>App: SUCCEEDED or retryable FAILED
  else Manual path
    App->>App: Keep entered draft without provider processing
  end
  App->>DB: Atomically save address text + PostGIS point
  App->>DB: Create service request
```

Safety-critical AI output displays escalation advice and publishes only a manual/open request; it does not automatically run worker selection.

## Matching and booking

```mermaid
flowchart TD
  R["Open service request"] --> Mode{"Bidding or direct?"}
  Mode -->|Bidding| B["Approved workers submit/withdraw bounded bids"]
  Mode -->|Direct| M["generate_matches"]
  M --> E["Skill/category + approval + availability + PostGIS radius eligibility"]
  E --> S["Score distance, availability, rating, jobs, response, cancellations, priority"]
  S --> C["Auditable ranked candidates"]
  B --> Select["Customer selects eligible worker"]
  C --> Select
  Select --> T["Transactional booking + conversation + status event"]
```

AI may generate a display explanation but cannot modify the eligibility query or select a worker.

## Booking lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> ACCEPTED
  ACCEPTED --> WORKER_PREPARING
  WORKER_PREPARING --> WORKER_EN_ROUTE
  WORKER_EN_ROUTE --> WORKER_ARRIVED
  WORKER_ARRIVED --> SERVICE_STARTED
  SERVICE_STARTED --> IN_PROGRESS
  IN_PROGRESS --> COMPLETED
  PENDING --> CANCELLED
  ACCEPTED --> CANCELLED
  WORKER_PREPARING --> CANCELLED
  WORKER_EN_ROUTE --> CANCELLED
```

Every transition validates participant, current state/version, and required reason; an event row preserves history. Realtime refreshes both parties.

## Tracking and route ETA

The latest authorized worker point and request destination are sent to `route` in `[longitude, latitude]` order. OpenRouteService returns route GeoJSON, meters, and seconds. A route snapshot is stored for a booking party/admin. MapLibre renders the real route; straight-line distance is not used as ETA.

## Chat and translation

Conversation participants insert/read messages under RLS. Realtime publishes new messages. If participant locale differs, `ai-translate-message` checks participant access, returns an existing cached translation or generates one, and leaves the original untouched.

## Cash payment and wallet

```mermaid
sequenceDiagram
  participant C as Customer
  participant DB as Transactional RPC
  participant W as Worker wallet
  C->>DB: confirm_cash_payment(booking, idempotency)
  DB->>DB: Validate party/state and create/update payment + receipt
  DB->>W: Credit available balance once
  DB->>W: Append immutable wallet transaction
  DB-->>C: Real payment/receipt result
```

GCash/card remain disabled until configured.

## Payout

The worker selects an owned payout method and submits a bounded amount/idempotency key. The RPC locks the wallet, moves available funds to locked state, and creates a pending request. An AAL2 administrator approves/rejects through `admin_decide_payout`; balances and ledger are updated transactionally.

## Review/moderation

After completion, a customer creates one bounded review and optional owned images. Votes/reports/replies are separate normalized rows. AI sentiment runs asynchronously for aggregate administrator reporting and stores topics/risk/confidence/provider metadata. Only the administrator moderation RPC publishes/hides content.

## Notification campaign

An administrator creates a draft, then an AAL2 publish RPC materializes delivery rows for the selected audience. Recipient notifications/read state and delivery metrics update through Realtime. External push delivery is not active.

## Report export

An AAL2 administrator selects a report type/format. `report-generate` creates a PROCESSING row, reads a bounded dataset, generates CSV/XLSX/PDF, uploads to the administrator UUID path in `report-exports`, and marks COMPLETED. Failures persist FAILED with a reason. Downloads use short-lived signed URLs.

## Error handling

```mermaid
flowchart LR
  Input["Client request"] --> Gateway{"JWT valid?"}
  Gateway -->|No| E401["401"]
  Gateway -->|Yes| Validate{"Input/owner/role/state valid?"}
  Validate -->|No| E4["4xx consistent JSON / database code"]
  Validate -->|Yes| Work["Transactional or provider work"]
  Work -->|Retryable provider failure| Retry["Bounded retry/manual continuation"]
  Work -->|Success| OK["success/message/data"]
  Work -->|Unexpected failure| E500["Sanitized 500 + server log"]
```

Provider failures never fabricate AI, geocoding, payment, notification, or booking success.
## Profile completion and update

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Supabase Auth
  participant D as Profile RPC
  participant S as Storage
  C->>A: Restore authenticated session
  C->>D: get_my_profile()
  alt Profile incomplete
    D-->>C: profile_complete=false
    C->>D: complete_my_profile(real values)
  else Profile complete
    D-->>C: persisted profile and verification state
  end
  C->>S: Upload owned avatar path
  C->>D: set_my_avatar(path)
  D-->>C: refreshed profile
```

Email changes use Supabase Auth confirmation. Password changes use Auth first and record `password_changed_at` only after Auth succeeds. Missing historical password or session data is displayed as unavailable.
