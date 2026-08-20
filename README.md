# A-YOS

Home services marketplace platform.

## Prerequisites

- Node.js 20+
- pnpm 11+
- Supabase CLI
- Expo Go (iOS/Android) or a simulator

## Setup

```sh
git clone <repo-url> && cd ayos-final
pnpm install
cp .env.example .env.local
cp supabase/.env.example supabase/.env.local
```

Fill in the required keys in `.env.local` and `supabase/.env.local`.

Start the local database:

```sh
pnpm supabase:start
```

## Running

**Native (iOS/Android):**

```sh
pnpm start
```

**Web:**

```sh
pnpm start:web
```

**Edge Functions (separate terminal):**

```sh
pnpm functions:serve
```
