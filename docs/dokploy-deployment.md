# Deploying Alipo on Dokploy (VPS Hosting)

Dokploy is a self-hosted PaaS alternative that manages Docker containers, Traefik reverse proxy, SSL certificates, and persistent storage on your VPS.

---

## Architecture Overview in Dokploy

You can deploy Alipo in Dokploy using either **Option A (Multi-container Compose Stack)** or **Option B (Separate Services)**.

### Option A: Dokploy Compose Stack (Recommended)

1. Log in to your **Dokploy Dashboard**.
2. Go to **Projects** → Create Project: `Alipo`.
3. Click **Create Service** → Select **Compose**.
4. Set Repository to your Git repo (or choose inline Compose).
5. Dokploy will read `docker-compose.yml`.

#### Environment Variables to configure in Dokploy:
```env
# PocketBase Admin credentials (initial setup)
PB_ADMIN_EMAIL=admin@alipo.mw
PB_ADMIN_PASSWORD=change_this_secure_password_123

# Public PocketBase URL (for frontend and webhooks)
NEXT_PUBLIC_POCKETBASE_URL=https://pb.alipo.mw
POCKETBASE_URL=http://pocketbase:8090

# Africa's Talking (USSD / SMS)
AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=your_africas_talking_username

# WhatsApp API (Meta Cloud / BSP)
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_ID=your_whatsapp_phone_id
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verify_token

# PayChangu (Phase 2 B2B Billing)
PAYCHANGU_API_KEY=your_paychangu_secret_key
```

#### Traefik / Domain Configuration in Dokploy:
- **Web App Service (`web`)**:
  - Domain: `alipo.mw` (or `app.yourdomain.com`)
  - Internal Port: `3000`
  - Enable Automatic HTTPS (Let's Encrypt)
- **PocketBase Service (`pocketbase`)**:
  - Domain: `pb.alipo.mw` (or `pb.yourdomain.com`)
  - Internal Port: `8090`
  - Enable Automatic HTTPS (Let's Encrypt)

---

## Persistent Volumes

Ensure Dokploy mounts the persistent volume for PocketBase:
- `alipo_pb_data` → `/pb/pb_data`

This guarantees SQLite databases, station records, and uploaded attachments persist across redeployments and container restarts.

---

## Webhook URLs for Gateways

Once deployed with your domains, configure external gateways:
- **Africa's Talking USSD Callback**:
  `https://pb.alipo.mw/api/ussd` (or `https://alipo.mw/api/ussd`)
- **WhatsApp Cloud API Webhook**:
  `https://pb.alipo.mw/api/whatsapp` (or `https://alipo.mw/api/whatsapp`)
