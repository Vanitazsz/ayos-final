# 📍 AYOS Live Dispatch & Real-Time Worker Tracking Guide

This document outlines the complete architecture, setup instructions, database migrations, and step-by-step verification guide for the **Live Worker Dispatch** and **Grab/InDrive-Style Real-Time Location Tracking** system.

---

## 🏛️ System Architecture

```
+------------------+         Supabase Broadcast Channel         +--------------------+
|   Worker App     | -----------------------------------------> |    Customer App    |
| (expo-location)  |   channel: booking-location:{booking_id}   | (MapLibre tracking) |
+------------------+                                            +--------------------+
         |                                                                |
         | RPC: update_worker_presence                                   | RPC: start_live_dispatch
         v                                                                v
+------------------------------------------------------------------------------------+
|                               Supabase PostgreSQL DB                               |
|  - private.refresh_live_dispatch (Matches online workers within search radius)      |
|  - public.validate_and_confirm_worker_arrival (50m PostGIS proximity check)         |
+------------------------------------------------------------------------------------+
```

---

## 🗄️ Database Migrations Setup

Ensure the following two migrations are applied in your Supabase **SQL Editor** in this exact order:

### 1. Worker Arrival Proximity (50m Gate)
- **File**: [`supabase/migrations/20260731020000_worker_arrival_proximity.sql`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/supabase/migrations/20260731020000_worker_arrival_proximity.sql)
- **Purpose**: Creates `public.validate_and_confirm_worker_arrival(p_booking_id, p_worker_lat, p_worker_lng)` to calculate PostGIS distance between worker's live GPS and customer's requested `service_location`. Confirms arrival if distance <= 50 meters.
- **Rollback Script**: [`supabase/migrations/20260731020000_worker_arrival_proximity_REVERT.sql`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/supabase/migrations/20260731020000_worker_arrival_proximity_REVERT.sql)

### 2. Resilient Worker Matching & Session Sync
- **File**: [`supabase/migrations/20260731030000_resilient_matching_configuration.sql`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/supabase/migrations/20260731030000_resilient_matching_configuration.sql)
- **Purpose**:
  - Automatically updates `worker_profiles.is_available = true` on location update.
  - Fixes `get_my_worker_matching_readiness` so active workers always evaluate `matchable = true`.
  - Refreshes session timestamps on `start_live_dispatch` so sessions never get stuck expired.
  - Matches workers by primary industry when explicit category skills are unassigned.
  - Falls back to 24/7 schedule when `worker_availability` rows are empty.
- **Rollback Script**: [`supabase/migrations/20260731030000_resilient_matching_configuration_REVERT.sql`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/supabase/migrations/20260731030000_resilient_matching_configuration_REVERT.sql)

---

## 📲 Step-by-Step E2E Verification Workflow (For New Device)

### Phase 1: Worker Account Readiness
1. **Check Active Bookings**: Ensure worker account has **0 Active Bookings** (`Active: 0`).
   > *Note*: If the dashboard shows `1 Active` (e.g. an existing booking in progress), complete or cancel that booking first. Workers with active jobs are not assigned new matching offers.
2. **Go Online**: On the worker home screen, tap **`Refresh location and matching setup`**.
   - The card title will change to green: **`Live and receiving nearby requests`**.
   - Subtitle: **`Your foreground location updates every 10–15 seconds.`**

### Phase 2: Customer Request & Live Matching
1. **Create Service Request**: Log into customer app and create a service request (e.g. *Plumbing*, *Electrical*, or *Cleaning*).
2. **Start Matching**: Tap **`Find Workers`**.
   - The customer app calls `start_live_dispatch` and displays **`Searching within 50 km`**.
3. **Receive Offer**: On the worker device, an offer card will pop up under **New Requests** with **Accept** and **Decline** buttons.

### Phase 3: Live Tracking & Arrival Validation
1. **Accept Job**: Worker taps **`Accept`**. Booking status transitions to `ACCEPTED` -> `WORKER_EN_ROUTE`.
2. **GPS Broadcast Started**: Worker app automatically starts `startEnRouteLocationPublisher`, broadcasting live GPS coordinates every **5–8 seconds** via Supabase Realtime Channel (`booking-location:${bookingId}`).
3. **Live Customer Map**: Customer opens **`Tracking`** screen ([`app/tracking/[id].tsx`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/app/tracking/%5Bid%5D.tsx)).
   - Customer sees the worker marker move smoothly on MapLibre towards customer home location in real time with estimated distance/ETA.
4. **50m Proximity Arrival**:
   - When worker arrives at customer destination (<= 50m), worker taps **`I Have Arrived`**.
   - App calls `validate_and_confirm_worker_arrival(bookingId, lat, lng)`.
   - PostGIS validates distance:
     - If <= 50m: Booking status transitions to **`WORKER_ARRIVED`** and customer screen updates instantly.
     - If > 50m: App alerts worker: *"You are X meters away. Please get within 50 meters of the destination."*

---

## 🛠️ Key Code Reference Files

| Feature | Primary File |
| :--- | :--- |
| **Live GPS Publisher & Broadcast Subscriber** | [`apps/mobile/services/liveDispatch.ts`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/services/liveDispatch.ts) |
| **Arrival RPC API Client** | [`apps/mobile/services/api.ts`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/services/api.ts#L1730-L1760) |
| **Worker Dispatch Screen** | [`apps/mobile/app/(worker)/index.tsx`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/app/%28worker%29/index.tsx) |
| **Worker Booking Request / En Route Screen** | [`apps/mobile/app/(worker)/booking-request/[id].tsx`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/app/%28worker%29/booking-request/%5Bid%5D.tsx) |
| **Customer Tracking & Map Screen** | [`apps/mobile/app/tracking/[id].tsx`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/app/tracking/%5Bid%5D.tsx) |
| **MapLibre Interactive Component** | [`apps/mobile/components/booking/BookingMap.tsx`](file:///c:/Users/arias/Downloads/STARTUPLABB/ayos-final/apps/mobile/components/booking/BookingMap.tsx) |

---

## ❓ Troubleshooting & Edge Cases

| Issue / Error | Cause | Resolution |
| :--- | :--- | :--- |
| **"Live matching is not active"** | Worker has active booking OR setup incomplete. | Ensure `Active: 0` on worker screen and run migration `20260731030000_resilient_matching_configuration.sql`. |
| **"Searching within 50 km" (0 workers found)** | Previous matching session expired or worker location stale. | Tap "Refresh location and matching setup" on worker dashboard, then tap "Try matching again" on customer app. |
| **"You are X meters away" error on arrival** | Worker GPS location is > 50 meters from customer `service_location`. | Worker must physically move within 50 meters of destination (or adjust test coordinates in dev). |
