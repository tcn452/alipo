# Malawi 28-District Filling Station Data Collection & Ingestion Guide

This document outlines the pipeline, external APIs, and operator workflows for systematically discovering, validating, and populating retail fuel stations across all 28 districts of Malawi.

---

## 1. Overview & National Station Target

Malawi operates an estimated **350–450 retail filling stations** nationwide.

* **Current Database Coverage**: Over 350 stations in `public.stations` with coverage across major urban hubs (Lilongwe, Blantyre, Mzuzu, Zomba).
* **Target Objective**: Eliminate rural and highway blind spots along the M1 corridor, lakeshore M5, and border districts (Chitipa, Karonga, Mchinji, Mwanza, Nsanje) ahead of full public launch.

To achieve this, the repository includes an automated 28-district batch collector script:
[`scripts/collect_district_stations.py`](../scripts/collect_district_stations.py).

---

## 2. Supported Geospatial APIs

The batch collector integrates four data providers, designed to run gracefully with whatever credentials are configured:

| Provider | Purpose | Environment Variable | Key Required? | Cost / Quota Considerations |
| :--- | :--- | :--- | :--- | :--- |
| **OpenStreetMap (Overpass)** | Ground-truth baseline & nodes | None | **No** | Free public servers (`overpass-api.de`, `openstreetmap.fr`) |
| **Google Places (New)** | High-precision commercial POIs | `GOOGLE_PLACES_API_KEY` | Yes | Uses FieldMasks to minimize billing |
| **HERE Technologies** | Highway POIs & fuel categories | `HERE_API_KEY` | Yes | 250,000 free requests/month (Freemium) |
| **TomTom Search API** | Category `7311` POI discovery | `TOMTOM_API_KEY` | Yes | 2,500 free requests/day |

> [!TIP]
> **Zero-Config Baseline**: Even without API keys, running the collector with `--provider osm` queries all 28 districts for free using OpenStreetMap Overpass with built-in server failover.

---

## 3. Malawi 28 Districts Directory

The collector groups all queries by official administrative regions and centroids:

### Northern Region (6 Districts)
* **Chitipa**: Centroid `(-9.7028, 33.2706)`, radius 45 km. Focus: Chitipa Boma, Zambian/Tanzanian border.
* **Karonga**: Centroid `(-9.9333, 33.9333)`, radius 50 km. Focus: Karonga Boma, Chilumba, Songwe border.
* **Likoma**: Centroid `(-12.0500, 34.7333)`, radius 15 km. Focus: Likoma Island, Chizumulu.
* **Mzimba**: Centroid `(-11.9000, 33.6000)`, radius 65 km. Focus: Mzimba Boma, Jenda, M1 corridor.
* **Mzuzu**: Centroid `(-11.4589, 34.0152)`, radius 25 km. Focus: Mzuzu City CBD, Luwinga, Katoto.
* **Nkhata Bay**: Centroid `(-11.6067, 34.2908)`, radius 45 km. Focus: Nkhata Bay Boma, Chintheche lakeshore.
* **Rumphi**: Centroid `(-11.0186, 33.8575)`, radius 45 km. Focus: Rumphi Boma, Chiweta hills, Livingstonia turnoff.

### Central Region (9 Districts)
* **Dedza**: Centroid `(-14.3789, 34.3333)`, radius 45 km. Focus: Dedza Boma, Linthipe, Mozambique border.
* **Dowa**: Centroid `(-13.6542, 33.9378)`, radius 40 km. Focus: Mponela trading hub, Dowa Boma.
* **Kasungu**: Centroid `(-13.0333, 33.4833)`, radius 55 km. Focus: Kasungu Boma, Nkhamenya, Chatoloma.
* **Lilongwe**: Centroid `(-13.9712, 33.7845)`, radius 45 km. Focus: City Centre, Old Town, Kanengo, Area 47, Area 18.
* **Mchinji**: Centroid `(-13.8000, 32.8833)`, radius 40 km. Focus: Mchinji Boma, Mwami Zambian border post.
* **Nkhotakota**: Centroid `(-12.9167, 34.2833)`, radius 50 km. Focus: Nkhotakota Boma, Dwangwa sugar estate hub.
* **Ntcheu**: Centroid `(-14.8167, 34.6333)`, radius 45 km. Focus: Ntcheu Boma, Lizulu border market, Biriwiri.
* **Ntchisi**: Centroid `(-13.3667, 33.9167)`, radius 35 km. Focus: Ntchisi Boma, Malomo trading centre.
* **Salima**: Centroid `(-13.7804, 34.4587)`, radius 40 km. Focus: Salima Boma, Senga Bay, Chipoka port.

### Southern Region (13 Districts)
* **Balaka**: Centroid `(-14.9833, 34.9500)`, radius 35 km. Focus: Balaka Boma railway junction, Phalula turnoff.
* **Blantyre**: Centroid `(-15.7861, 35.0058)`, radius 30 km. Focus: Blantyre CBD, Limbe, Chichiri, Kameza, Chileka.
* **Chikwawa**: Centroid `(-16.0333, 34.8000)`, radius 50 km. Focus: Chikwawa Boma, Nchalo sugar estate, Ngabu.
* **Chiradzulu**: Centroid `(-15.7000, 35.1833)`, radius 25 km. Focus: Chiradzulu Boma, Thumbwe.
* **Machinga**: Centroid `(-15.0333, 35.2333)`, radius 40 km. Focus: Liwonde junction & national park corridor.
* **Mangochi**: Centroid `(-14.4781, 35.2644)`, radius 55 km. Focus: Mangochi Boma, Monkey Bay, Lake resorts.
* **Mulanje**: Centroid `(-16.0333, 35.5000)`, radius 40 km. Focus: Mulanje Boma, Chitakale, Muloza border post.
* **Mwanza**: Centroid `(-15.6000, 34.5167)`, radius 30 km. Focus: Mwanza Boma, Mozambique transit border.
* **Neno**: Centroid `(-15.4000, 34.6833)`, radius 35 km. Focus: Neno Boma, Zalewa junction.
* **Nsanje**: Centroid `(-16.9167, 35.2667)`, radius 50 km. Focus: Nsanje Boma, Bangula, Marka border.
* **Phalombe**: Centroid `(-15.8000, 35.6500)`, radius 35 km. Focus: Phalombe Boma, Chiringa.
* **Thyolo**: Centroid `(-16.0667, 35.1333)`, radius 35 km. Focus: Thyolo Boma, Luchenza municipal council.
* **Zomba**: Centroid `(-15.3833, 35.3333)`, radius 35 km. Focus: Zomba City, Thondwe, Lake Chilwa road.

---

## 4. Usage Guide

### Basic Commands

#### 1. Scan a Specific District with Free OpenStreetMap Provider
```bash
python3 scripts/collect_district_stations.py \
  --district Chitipa \
  --provider osm \
  --output tmp/station-import/chitipa-candidates.json \
  --output-sql tmp/station-import/seed-chitipa.sql
```

#### 2. Scan All 28 Districts with OpenStreetMap & Generate Direct Seeding SQL
```bash
python3 scripts/collect_district_stations.py \
  --district all \
  --provider osm \
  --output tmp/station-import/all-district-candidates.json \
  --output-sql tmp/station-import/seed-district-candidates.sql \
  --output-stations-sql tmp/station-import/seed-new-stations.sql
```

#### 3. Full Multi-Provider District Scan (Google + HERE + TomTom + OSM)
Set your keys in your shell or `.env`:
```bash
export GOOGLE_PLACES_API_KEY="AIzaSy..."
export HERE_API_KEY="here_api_key_..."
export TOMTOM_API_KEY="tomtom_api_key_..."

python3 scripts/collect_district_stations.py \
  --district all \
  --provider all \
  --output tmp/station-import/multi-provider-candidates.json \
  --output-sql tmp/station-import/seed-all-candidates.sql
```

#### 4. Filter for Brand New Station Locations Only
To omit any candidate that is within 75 metres of an already known station:
```bash
python3 scripts/collect_district_stations.py \
  --district all \
  --new-only \
  --output tmp/station-import/unmapped-stations.json
```

#### 5. Direct Supabase PostgREST Sync
To write candidates directly into the remote Supabase database:
```bash
export SUPABASE_URL="https://xsnkzaweqeeocsdduhoi.supabase.co"
export SUPABASE_SECRET_KEY="your_service_role_key"

python3 scripts/collect_district_stations.py \
  --district all \
  --sync-supabase
```

---

## 5. Local Caching & Rate Limiting

To ensure reproducibility and eliminate billable API requests:
* All HTTP responses from Google Places, HERE, TomTom, and OSM are cached at:
  `tmp/station-import/district-scan-cache.json`
* Subsequent runs with the same district query load from disk in milliseconds.
* If a scan fails midway due to network issues, re-running the script picks up where it left off without duplicate API calls.

---

## 6. Reviewing Candidates in Alipo Web Dashboard

Once candidates are populated into `public.station_geocoding_candidates`, operators and community members can review them in the Alipo app:

1. Navigate to `/dashboard/stations/candidates` (or `/stations/candidates`).
2. Each candidate card displays:
   * Candidate Name and Operator / Brand (Puma, TotalEnergies, Petroda, Mount Meru, etc.)
   * District and administrative region
   * Distance to nearest known station in metres
   * Confidence score (0–100)
3. Click **"View Proposed Pin on Map"**:
   * Displays the proposed candidate coordinates (orange pin)
   * Displays the nearest existing station (green pin)
   * If &le; 75m, displays a warning: *"A live station is already located within 75m. Confirm if this is an update to an existing station rather than a new location."*
4. Moderation Actions:
   * **Accept Match**: Links the candidate to the existing station.
   * **Create Live Station**: Immediately inserts the candidate as a new active station in `public.stations`.
   * **Reject**: Closes the candidate without modifying stations.
