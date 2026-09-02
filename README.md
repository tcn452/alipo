# Alipo — Malawi Fuel Availability & Fleet Management Network

> **Alipo** (*Chichewa: "it is there / it is available"*) is a crowdsourced and station-verified fuel availability platform for Malawi.

---

## 🌟 Architecture Overview

1. **Consumer Core (Phase 1)**
   - **Public Web Map (PWA)**: Fast, offline-capable Leaflet/OSM map showing station fuel statuses, queue wait estimates, and prices.
   - **USSD Gateway (Africa's Talking)**: Numeric menu protocol for the 82% of citizens without continuous mobile internet.
   - **WhatsApp Bot**: Transactional chatbot mirroring availability lookups and report submissions.
   - **Decay & Trust Engine**: 3h/6h report expiration model with weighted station verification.

2. **B2B Fleet Fuel Management (Phase 2)**
   - **Fleet Portal**: Vehicle and driver management with fuel card allocations.
   - **Smart Dispatch Engine**: Recommends the top 3 optimal fuel stations based on real-time queues, proximity, and fuel type.
   - **Consumption Auditing & Export**: CSV logs and anomaly detection flags.

3. **Hosting & Deployment (Dokploy on VPS)**
   - Dockerized Next.js standalone web frontend.
   - PocketBase single-process SQLite backend with automated migrations and hooks.
   - Reverse proxy, SSL, and persistent volumes handled via Dokploy / Traefik.

---

## 📁 Repository Structure

```
alipo/
├── docker-compose.yml              # Multi-container Compose for Dokploy & local test
├── .env.example                    # Environment configuration template
├── pb/                             # PocketBase backend application
│   ├── Dockerfile                  # PocketBase Alpine container
│   ├── pb_hooks/                   # Server-side business logic & cron jobs
│   │   ├── ussd.pb.js              # Africa's Talking USSD session flow
│   │   ├── whatsapp.pb.js          # WhatsApp webhook handler
│   │   ├── report_decay.pb.js      # Report TTL & decay calculation cron
│   │   ├── dispatch.pb.js          # Nearest available station calculation
│   │   └── auth_otp.pb.js          # SMS OTP verification & auth handler
│   └── pb_migrations/              # Automated schema & initial seed migrations
│       ├── 1700000000_initial_schema.js
│       └── 1700000001_seed_stations.js
├── web/                            # Next.js Application (App Router, Tailwind, TypeScript)
│   ├── Dockerfile                  # Standalone multi-stage Next.js Dockerfile
│   ├── public/                     # PWA manifest, icons & static assets
│   └── src/
│       ├── app/                    # Web pages (Public Map, Login, B2B Dashboard)
│       ├── components/             # UI, Map, StationCard, ReportModal
│       ├── lib/                    # PocketBase client, constants & utils
│       └── types/                  # TypeScript definitions
└── docs/
    ├── alipo-technical-spec.md     # Product technical specification
    └── dokploy-deployment.md       # Dokploy setup and hosting guide
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Web Dependencies
```bash
cd web
npm install
```

### 2. Start Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live fuel map and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the B2B fleet portal.

### 3. Run with Docker Compose
```bash
docker compose up --build
```
- **Web Map**: `http://localhost:3000`
- **PocketBase Admin & API**: `http://localhost:8090/_/`

---

## ☁️ Deploying to Dokploy VPS

Refer to the detailed guide in [docs/dokploy-deployment.md](docs/dokploy-deployment.md).

1. Connect your repository to Dokploy.
2. Select **Compose Stack** pointing to `docker-compose.yml`.
3. Set your custom domains (e.g. `alipo.mw` and `pb.alipo.mw`) with automatic Let's Encrypt SSL.
4. Mount persistent volume `alipo_pb_data` to `/pb/pb_data`.
