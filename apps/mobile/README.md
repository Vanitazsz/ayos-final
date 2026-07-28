# A-yos — Provider Marketplace App

A mobile-first service provider marketplace built with React Native, Expo, and TypeScript. Users can browse service categories, view provider profiles, book appointments, pay securely, track live service status, and leave reviews.

> [!NOTE]
> This project is currently under development

## Tech Stack

- **React Native** (Expo SDK 54)
- **TypeScript**
- **Expo Router** (file-based navigation)
- **Lucide Icons** (expo vector icons)
- **React Native Reanimated** & **Gesture Handler**
- **Supabase** (database & auth ready)

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Expo dev server |
| `npm run build:web` | Export web build to `dist/` |
| `npm run typecheck` | Run TypeScript type check |
| `npm run lint` | Run Expo linter |

## Project Structure

```
app/
├── _layout.tsx              # Root layout (Stack)
├── index.tsx                # Landing page (role selection)
├── sign-up.tsx              # User registration
├── register-worker.tsx      # Worker 4-step registration wizard
├── (tabs)/
│   ├── _layout.tsx          # User bottom tab navigation
│   ├── index.tsx            # Home screen
│   ├── search.tsx           # Browse/search providers
│   ├── bookings.tsx         # My bookings list
│   ├── reviews.tsx          # Reviews feed
│   └── profile.tsx          # User profile
├── (worker)/
│   ├── _layout.tsx          # Worker bottom tab navigation
│   ├── index.tsx            # Dashboard
│   ├── search.tsx           # Job Posts
│   ├── bookings.tsx         # Worker bookings
│   ├── reviews.tsx          # Worker reviews
│   ├── profile.tsx          # Worker profile
│   └── settings.tsx         # Editable worker settings
├── provider/[id].tsx        # Provider profile detail
├── new-request/             # New request creation flow
│   ├── create.tsx           # Input category, photos, parts, description
│   ├── issue-summary.tsx    # AI summary and Urgency selection
│   ├── asap.tsx             # ASAP request review
│   ├── this-week.tsx        # Scheduled (This Week) review and time picker
│   ├── bidding.tsx          # Open Bidding review
│   └── success.tsx          # Booking success screen
├── accept-worker/[id].tsx   # Accept worker flow
├── chat/[id].tsx            # Chat screen
├── match/[id].tsx           # ASAP radar matching screen
├── request/[id].tsx         # Live request details (bids/applicants list)
├── booking/[id].tsx         # Traditional schedule booking flow
├── payment.tsx              # Payment screen (modal)
├── payment-received.tsx     # Payment success (modal)
├── tracking/[id].tsx        # Live tracking screen
└── review/[id].tsx          # Rate & review (modal)

components/
├── AppText.tsx              # Typography component
├── AppButton.tsx            # Button (primary/outline/ghost/danger)
├── AppCard.tsx              # Card wrapper
├── AppInput.tsx             # Text input with label/error
├── AppSelect.tsx            # Bottom sheet select
├── AppAutocomplete.tsx      # Autocomplete with multi-select
├── Avatar.tsx               # Profile image
├── Badge.tsx                # Status/verified badges
├── Chip.tsx                 # Filter chips
├── ImageUploadCard.tsx      # Image upload component
├── LocationPicker.tsx       # Location picker
├── MenuItemRow.tsx          # Menu item row
├── ProfileScreen.tsx        # Profile screen wrapper
├── RatingStars.tsx          # Star rating display
├── ReviewsTab.tsx           # Reviews tab component
├── SearchBar.tsx            # Search input
├── ScreenHeader.tsx         # Screen header
├── SectionHeader.tsx        # Section title + action
├── StatCard.tsx             # Stat card
├── ProviderCard.tsx         # Provider list item
├── ServiceCategoryCard.tsx  # Category grid icon card
├── JobPostCard.tsx          # LinkedIn-style job post card
├── JobSummary.tsx           # Job summary component
└── StatusTimeline.tsx       # Status timeline component

constants/
├── theme.ts                 # Design tokens (colors, spacing, radius, elevation)
├── mockData.ts              # Mock providers, reviews, bookings, time slots
├── workerData.ts            # Worker profile data
└── workerMockData.ts        # Worker jobs, comments, skills, industries

context/
└── RequestContext.tsx        # Request state management

docs/
├── worker-flow.md           # Worker flow documentation
└── user-flow.md             # User flow documentation

hooks/
└── useFrameworkReady.ts     # Expo framework init (required)
```

## Design System

All styling uses centralized design tokens in `constants/theme.ts`. The project aligns to an iPhone 15 (393×852 dp) baseline and includes tokens for spacing, type, radii, and shadows.

- **Design Target**: iPhone 15 / iPhone 15 Pro — 393 × 852 dp
- **Safe Area**: Top = 59px, Bottom = 34px (use `react-native-safe-area-context`)
- **Layout tokens**: `Layout.screenPadding` = 20, `Layout.sectionSpacing` = 24, `Layout.cardPadding` = 16
- **Spacing**: 4px step scale with named keys (see `Spacing` in `constants/theme.ts`)
- **Typography**: `Display`/`H1`/`H2`/`H3`/`Title`/`Section`/`Card`/`Body`/`Small`/`Caption` tokens
- **Radius**: `xs`=8, `sm`=10, `md`=12, `lg`=14, `xl`=16, `xxl`=20
- **Buttons**: height 56, radius 14, horizontal padding 20 (`ButtonSize` tokens)
- **Avatar sizes**: small 40, medium 48, large 64, xl 96
- **Navigation**: nav height 80, header height 56
- **Shadows**: card & floating elevation presets in `Elevation`

Colors have been refined for balance and accessibility. Key color tokens (in `constants/theme.ts`):

- **Primary / CTA**: `#071022` (dark navy)
- **Primary Light**: `#1A2B4C`
- **Success**: `#117A5C`
- **Warning**: `#F59E0B`
- **Error**: `#C53030`
- **Info**: `#0B63D6`
- **Background**: `#F8F9FB`
- **Surface / Card**: `#FFFFFF`
- **Border**: `#E6EBF6`

Use these tokens rather than hard-coded colors to maintain consistency and ensure complementary palettes across screens.

## Navigation

- **User Tabs**: Home, Browse, Bookings, Profile
- **Worker Tabs**: Dashboard, Job Posts, Bookings, Reviews, Profile
- **Stack screens**: Provider detail, Booking, Payment, Tracking, Chat, Match, Accept Worker, Request Details
- **Modals**: Payment, Rate & Review, Booking Success

## Screens

1. **Home** — Welcome header, search, category carousel, promo banner, top-rated providers, recently viewed
2. **Browse** — Search bar, filter chips, sort options, provider list with live filtering
3. **Provider Profile** — Cover image, avatar, stats, about, services, reviews preview, contact, book CTA
4. **Schedule Booking** — Date picker, time slots, address input, notes, price summary
5. **Payment** — Payment method selection, promo code, order summary, secure CTA
6. **Live Tracking** — Map background, provider pin, ETA, 5-step tracking timeline, call/message actions
7. **My Bookings** — Tab-filtered list (upcoming/completed/cancelled) with contextual actions
8. **Reviews** — Rating summary with distribution chart, filterable review list, review submission modal
9. **New Request Flow**:
    - **Creation**: Upload photos, select category, write description, choose parts preference.
    - **AI Summary**: AI analyzes issue and recommends urgency.
    - **Urgency Paths**:
      - **ASAP**: Direct review, posts directly to **Match Radar** screen with live cascading worker discovery.
      - **This Week**: Select Day/Time, then review and post.
      - **Open Bidding**: Direct review, post to receive bids.
10. **Request Details**: Compact Job Summary display with a list of incoming worker applications/bids for the user to review and hire.

### Worker App Screens

11. **Worker Dashboard**: Stats grid (active jobs, pending, completed, earnings) with active bookings list.
12. **Job Posts**: LinkedIn-style post cards with image previews, comments, and share. Workers can post offers with description + price range.
13. **Worker Bookings**: Status-filtered booking list with contextual actions (Start Job, Complete, Contact).
14. **Worker Reviews**: Rating summary with distribution chart, filterable review list.
15. **Worker Profile**: Real stats, worker-only menu items, verification state, and profile editing.
16. **Worker Settings**: Fully editable worker profile form.
17. **Worker Registration**: 4-step wizard with industry/skills autocomplete, employment type, and profile setup.

### Shared Screens (User & Worker)

18. **Accept Worker**: Confirm incoming job request from worker.
19. **Chat**: Message worker/customer before hiring.
20. **Worker Match (ASAP Radar)**: Live map with pulsing radar animation, sequential worker discovery.
21. **Booking Success**: Confirmation screen after successful booking.

## Platform

Default platform is **Web**. Native-only APIs use `Platform.select()` for web compatibility.
