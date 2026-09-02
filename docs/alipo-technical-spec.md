# Alipo — Technical Specification (v1)

**For:** WeKode · **Prepared:** 2 September 2026

**Name note:** The product is **Alipo** (Chichewa: *"it is there / it is available"*) — not "Ilipo". Use this spelling everywhere: repo name, package name, app identifiers, UI strings.

---

## 1. What Alipo is

A fuel-availability network for Malawi. Two sides of one product:

1. **Consumer side (free, deliberately):** Crowd-sourced plus station-verified reporting of which fuel stations currently have fuel, what queue length looks like, and price — reachable over USSD and WhatsApp first, a lightweight web map second. No app install, no data bundle required to use the core feature.
2. **B2B side (the actual revenue):** Fleet fuel management for logistics companies, NGOs, delivery operators and government fleets — allocation tracking, dispatch-to-available-station recommendations, consumption reporting, and fraud/anomaly flags on fuel cards and vehicles.

### Strategic Rationale
- **Counter-cyclical value**: gets more useful exactly when fuel is scarce.
- **Reach reality**: Malawi has ~18% internet penetration. General driving public reaches USSD (majority-reach), while B2B fleet managers are reliably online.
- **Trust & Decay**: Reports decay rapidly. Trust model prioritizes verified stations and high recent confirmation counts.

---

## 2. Target Users

| User | Channel | Role / Action |
| :--- | :--- | :--- |
| **General Consumer** | USSD, WhatsApp, Web Map | Checks nearest station's fuel status; submits reports |
| **Station Attendant / Owner (verified)** | WhatsApp, Web Form | Posts verified status for their station (weighted higher) |
| **Fleet Dispatcher (B2B)** | Web Dashboard | Sees live map filtered to operating area; gets station recommendations |
| **Fleet Driver (B2B)** | WhatsApp or USSD | Confirms refuel events tied to vehicle / fuel card |
| **Fleet Admin (B2B)** | Web Dashboard | Manages company vehicles, drivers, allocations, reports |
| **WeKode Ops / Moderator** | Web Admin Panel | Verifies stations, resolves disputed reports, reviews fraud flags |

---

## 3. Data Model Summary

- **`stations`**: `name`, `brand`, `location` (`geoPoint`), `district`, `city`, `verified`, `owner_user`, `fuel_types`, `contact_phone`.
- **`reports`**: `station` (relation), `reporter` (relation/phone), `status` (`available`, `low`, `out`), `fuel_type`, `queue_estimate` (`none`, `short`, `medium`, `long`), `price`, `source` (`ussd`, `whatsapp`, `web`, `verified_station`), `confirmations`.
- **`users`**: `phone`, `name`, `role` (`consumer`, `station_attendant`, `fleet_admin`, `fleet_dispatcher`, `fleet_driver`, `wekode_ops`), `company`, `trust_score`.
- **`companies`** (Phase 2): `name`, `type`, `billing_status`, `plan`.
- **`vehicles`** (Phase 2): `company`, `plate`, `assigned_driver`, `fuel_card_id`, `fuel_type`.
- **`fuel_allocations`** (Phase 2): `company`, `vehicle`, `period_start`, `period_end`, `allocated_litres`, `consumed_litres`.
- **`refuel_events`** (Phase 2): `vehicle`, `station`, `litres`, `reported_by`, `logged_at`.
- **`fraud_flags`** (Phase 3): `vehicle`, `flag_type`, `severity`, `detail`, `resolved`.

---

## 4. Channels

- **USSD**: Africa's Talking gateway webhook. Fast numeric menu for checking & reporting fuel without data.
- **WhatsApp**: Webhook handler mirroring transactional actions.
- **Web (PWA)**: Next.js responsive map with offline caching + B2B fleet dashboard.
