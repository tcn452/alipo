#!/usr/bin/env python3
"""Batch collector for Malawi retail fuel stations across all 28 districts.

Supports:
- Google Places API (New & Legacy text/nearby search)
- HERE Technologies Discover & Browse POI APIs
- TomTom Category Search API
- OpenStreetMap Overpass API (no API key required)

Deduplicates against existing stations, evaluates confidence, calculates
distance to nearest known stations, and exports candidates in JSON and SQL format
for Supabase moderation in the Alipo dashboard.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE_PATH = ROOT / "tmp" / "station-import" / "district-scan-cache.json"
DEFAULT_OUTPUT_JSON = ROOT / "tmp" / "station-import" / "district-candidates.json"
DEFAULT_OUTPUT_SQL = ROOT / "tmp" / "station-import" / "seed-district-candidates.sql"
DEFAULT_STATIONS_FILE = ROOT / "tmp" / "station-import" / "existing-stations.json"
DEFAULT_OUTPUT_STATIONS_SQL = ROOT / "tmp" / "station-import" / "seed-new-stations.sql"

# ---------------------------------------------------------------------------
# 28 Malawi Districts Directory with Centroids & Radii
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DistrictInfo:
    name: str
    region: str  # Northern, Central, Southern
    latitude: float
    longitude: float
    radius_km: int
    aliases: Tuple[str, ...] = ()


MALAWI_DISTRICTS: Dict[str, DistrictInfo] = {
    # Northern Region (6)
    "Chitipa": DistrictInfo("Chitipa", "Northern", -9.7028, 33.2706, 45, ("Chitipa Boma",)),
    "Karonga": DistrictInfo("Karonga", "Northern", -9.9333, 33.9333, 50, ("Karonga Boma", "Chilumba")),
    "Likoma": DistrictInfo("Likoma", "Northern", -12.0500, 34.7333, 15, ("Likoma Island", "Chizumulu")),
    "Mzimba": DistrictInfo("Mzimba", "Northern", -11.9000, 33.6000, 65, ("Mzimba Boma", "Jenda")),
    "Mzuzu": DistrictInfo("Mzuzu", "Northern", -11.4589, 34.0152, 25, ("Mzuzu City", "Luwinga")),
    "Nkhata Bay": DistrictInfo("Nkhata Bay", "Northern", -11.6067, 34.2908, 45, ("Nkhata Bay Boma", "Chintheche")),
    "Rumphi": DistrictInfo("Rumphi", "Northern", -11.0186, 33.8575, 45, ("Rumphi Boma", "Livingstonia")),

    # Central Region (9)
    "Dedza": DistrictInfo("Dedza", "Central", -14.3789, 34.3333, 45, ("Dedza Boma", "Linthipe")),
    "Dowa": DistrictInfo("Dowa", "Central", -13.6542, 33.9378, 40, ("Dowa Boma", "Mponela")),
    "Kasungu": DistrictInfo("Kasungu", "Central", -13.0333, 33.4833, 55, ("Kasungu Boma", "Nkhamenya", "Chatoloma")),
    "Lilongwe": DistrictInfo("Lilongwe", "Central", -13.9712, 33.7845, 45, ("Lilongwe City", "Old Town", "City Centre", "Kanengo")),
    "Mchinji": DistrictInfo("Mchinji", "Central", -13.8000, 32.8833, 40, ("Mchinji Boma", "Mwami Border")),
    "Nkhotakota": DistrictInfo("Nkhotakota", "Central", -12.9167, 34.2833, 50, ("Nkhotakota Boma", "Dwangwa")),
    "Ntcheu": DistrictInfo("Ntcheu", "Central", -14.8167, 34.6333, 45, ("Ntcheu Boma", "Lizulu", "Biriwiri")),
    "Ntchisi": DistrictInfo("Ntchisi", "Central", -13.3667, 33.9167, 35, ("Ntchisi Boma", "Malomo")),
    "Salima": DistrictInfo("Salima", "Central", -13.7804, 34.4587, 40, ("Salima Boma", "Senga Bay", "Chipoka")),

    # Southern Region (13)
    "Balaka": DistrictInfo("Balaka", "Southern", -14.9833, 34.9500, 35, ("Balaka Boma", "Phalula")),
    "Blantyre": DistrictInfo("Blantyre", "Southern", -15.7861, 35.0058, 30, ("Blantyre City", "Limbe", "Chichiri")),
    "Chikwawa": DistrictInfo("Chikwawa", "Southern", -16.0333, 34.8000, 50, ("Chikwawa Boma", "Ngabu", "Nchalo")),
    "Chiradzulu": DistrictInfo("Chiradzulu", "Southern", -15.7000, 35.1833, 25, ("Chiradzulu Boma", "Thumbwe")),
    "Machinga": DistrictInfo("Machinga", "Southern", -15.0333, 35.2333, 40, ("Liwonde", "Machinga Boma")),
    "Mangochi": DistrictInfo("Mangochi", "Southern", -14.4781, 35.2644, 55, ("Mangochi Boma", "Monkey Bay", "Namwera")),
    "Mulanje": DistrictInfo("Mulanje", "Southern", -16.0333, 35.5000, 40, ("Mulanje Boma", "Muloza Border")),
    "Mwanza": DistrictInfo("Mwanza", "Southern", -15.6000, 34.5167, 30, ("Mwanza Boma", "Mwanza Border")),
    "Neno": DistrictInfo("Neno", "Southern", -15.4000, 34.6833, 35, ("Neno Boma", "Zalewa")),
    "Nsanje": DistrictInfo("Nsanje", "Southern", -16.9167, 35.2667, 50, ("Nsanje Boma", "Bangula", "Marka")),
    "Phalombe": DistrictInfo("Phalombe", "Southern", -15.8000, 35.6500, 35, ("Phalombe Boma", "Chiringa")),
    "Thyolo": DistrictInfo("Thyolo", "Southern", -16.0667, 35.1333, 35, ("Thyolo Boma", "Luchenza")),
    "Zomba": DistrictInfo("Zomba", "Southern", -15.3833, 35.3333, 35, ("Zomba City", "Thondwe")),
}

# ---------------------------------------------------------------------------
# Brand Detection & Normalization
# ---------------------------------------------------------------------------

BRAND_PATTERNS = [
    ("TotalEnergies", re.compile(r"\btotal(?:\s*energies)?\b", re.IGNORECASE)),
    ("Mount Meru", re.compile(r"\b(?:mount|mt)\.?\s*m(?:e{1,2})ru\b|\bmeru\b", re.IGNORECASE)),
    ("Puma", re.compile(r"\bpuma\b", re.IGNORECASE)),
    ("Petroda", re.compile(r"\bpetroda\b", re.IGNORECASE)),
    ("OilCom", re.compile(r"\boil\s*com\b", re.IGNORECASE)),
    ("Engen", re.compile(r"\bengen\b", re.IGNORECASE)),
    ("BP", re.compile(r"\bbp\b", re.IGNORECASE)),
    ("Shell", re.compile(r"\bshell\b", re.IGNORECASE)),
    ("Caltex", re.compile(r"\bcaltex\b", re.IGNORECASE)),
    ("NOCMA", re.compile(r"\bnocma\b", re.IGNORECASE)),
    ("Energem", re.compile(r"\benergem\b", re.IGNORECASE)),
    ("Petromoc", re.compile(r"\bpetromoc\b", re.IGNORECASE)),
    ("Simsoil", re.compile(r"\bsimsoil\b", re.IGNORECASE)),
    ("Rubis", re.compile(r"\brubis\b", re.IGNORECASE)),
]


def classify_brand(name: str, reported_brand: Optional[str] = None) -> str:
    haystack = f"{name or ''} {reported_brand or ''}"
    for brand, pattern in BRAND_PATTERNS:
        if pattern.search(haystack):
            return brand
    cleaned = (reported_brand or "").strip()
    if cleaned and not re.match(r"^(independent|unknown|fuel\s*station|petrol\s*station)$", cleaned, re.IGNORECASE):
        return cleaned
    return "Independent"


# ---------------------------------------------------------------------------
# Geodesic Math & Filtering
# ---------------------------------------------------------------------------

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in metres."""
    earth_radius = 6371000  # metres
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c


def is_in_malawi(lat: float, lon: float) -> bool:
    """Check whether coordinates fall inside Malawi's rough bounding polygon."""
    return -17.20 <= lat <= -9.20 and 32.50 <= lon <= 36.00


# ---------------------------------------------------------------------------
# Candidate Data Structure
# ---------------------------------------------------------------------------

@dataclass
class StationCandidate:
    source: str
    source_record_id: str
    operator_name: str
    source_name: str
    source_city: Optional[str]
    source_address: Optional[str]
    query_text: str
    provider: str
    provider_place_id: str
    lat: float
    lon: float
    result_name: str
    result_address: str
    result_type: str
    confidence_score: int
    evidence: Dict[str, Any]
    raw_result: Dict[str, Any]
    nearest_station_id: Optional[str] = None
    nearest_station_name: Optional[str] = None
    nearest_station_brand: Optional[str] = None
    nearest_station_distance_m: Optional[float] = None
    is_new_station_location: bool = False
    district: Optional[str] = None


# ---------------------------------------------------------------------------
# HTTP & Cache Helpers
# ---------------------------------------------------------------------------

class RequestCache:
    def __init__(self, cache_file: Path):
        self.cache_file = cache_file
        self.cache: Dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        if self.cache_file.exists():
            try:
                self.cache = json.loads(self.cache_file.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"Warning: Failed to load cache file {self.cache_file}: {e}", file=sys.stderr)
                self.cache = {}

    def get(self, key: str) -> Optional[Any]:
        return self.cache.get(key)

    def set(self, key: str, data: Any) -> None:
        self.cache[key] = data
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        try:
            self.cache_file.write_text(json.dumps(self.cache, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Warning: Failed to write cache: {e}", file=sys.stderr)


def http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    data: Optional[bytes] = None,
    timeout: int = 30,
    retries: int = 3,
) -> Any:
    req_headers = {
        "User-Agent": "AlipoStationCollector/2.0 (info@wekode.dev)",
        "Accept": "application/json",
    }
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    last_error = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw_bytes = resp.read()
                return json.loads(raw_bytes.decode("utf-8"))
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="ignore")
            last_error = RuntimeError(f"HTTP {error.code}: {body}")
            if error.code in (400, 401, 403, 404):
                # Client-side configuration error, do not retry
                raise last_error
            time.sleep(2 ** attempt)
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(2 ** attempt)

    if last_error:
        raise last_error
    return None


# ---------------------------------------------------------------------------
# Provider: Google Places API (New & Legacy)
# ---------------------------------------------------------------------------

def fetch_google_places_district(
    district: DistrictInfo,
    api_key: str,
    cache: RequestCache,
) -> List[Dict[str, Any]]:
    """Fetch fuel stations in a district via Google Places API (New) or fallback to Text Search."""
    results: List[Dict[str, Any]] = []
    queries = [
        f"petrol station in {district.name}, Malawi",
        f"gas station in {district.name}, Malawi",
    ]

    for q in queries:
        cache_key = hashlib.sha256(f"google_places_v1:{q}:{district.name}".encode()).hexdigest()
        cached = cache.get(cache_key)
        if cached is not None:
            results.extend(cached)
            continue

        endpoint = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.formattedAddress,"
                "places.location,places.types,places.nationalPhoneNumber,"
                "places.primaryType,places.addressComponents"
            ),
        }
        payload = {
            "textQuery": q,
            "includedType": "gas_station",
            "locationBias": {
                "circle": {
                    "center": {"latitude": district.latitude, "longitude": district.longitude},
                    "radius": float(district.radius_km * 1000),
                }
            },
        }

        try:
            data = http_request(endpoint, method="POST", headers=headers, data=json.dumps(payload).encode("utf-8"))
            places = data.get("places", []) if isinstance(data, dict) else []
            cache.set(cache_key, places)
            results.extend(places)
        except RuntimeError as e:
            # If Places API (New) is not enabled, try legacy Text Search API
            if "HTTP 403" in str(e) or "HTTP 400" in str(e):
                legacy_endpoint = (
                    "https://maps.googleapis.com/maps/api/place/textsearch/json?"
                    + urllib.parse.urlencode({
                        "query": q,
                        "location": f"{district.latitude},{district.longitude}",
                        "radius": str(district.radius_km * 1000),
                        "type": "gas_station",
                        "key": api_key,
                    })
                )
                try:
                    leg_data = http_request(legacy_endpoint)
                    leg_places = leg_data.get("results", []) if isinstance(leg_data, dict) else []
                    cache.set(cache_key, leg_places)
                    results.extend(leg_places)
                except Exception as leg_err:
                    print(f"  [Google] Error for {district.name}: {leg_err}", file=sys.stderr)
            else:
                print(f"  [Google] Error for {district.name}: {e}", file=sys.stderr)

    return results


# ---------------------------------------------------------------------------
# Provider: HERE Technologies API (Discover & Browse)
# ---------------------------------------------------------------------------

def fetch_here_district(
    district: DistrictInfo,
    api_key: str,
    cache: RequestCache,
) -> List[Dict[str, Any]]:
    """Fetch fuel stations using HERE Discover POI API."""
    cache_key = hashlib.sha256(f"here_discover:{district.name}:{district.latitude}:{district.longitude}".encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # HERE Discover endpoint with fuel search and country MWI
    endpoint = (
        "https://discover.search.hereapi.com/v1/discover?"
        + urllib.parse.urlencode({
            "q": "petrol station",
            "at": f"{district.latitude},{district.longitude}",
            "in": "countryCode:MWI",
            "limit": 50,
            "apiKey": api_key,
        })
    )

    try:
        data = http_request(endpoint)
        items = data.get("items", []) if isinstance(data, dict) else []
        cache.set(cache_key, items)
        return items
    except Exception as e:
        print(f"  [HERE] Discover query failed for {district.name}: {e}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# Provider: TomTom Search API
# ---------------------------------------------------------------------------

def fetch_tomtom_district(
    district: DistrictInfo,
    api_key: str,
    cache: RequestCache,
) -> List[Dict[str, Any]]:
    """Fetch fuel stations using TomTom Category Search API."""
    cache_key = hashlib.sha256(f"tomtom_cat:{district.name}:{district.latitude}:{district.longitude}".encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    encoded_cat = urllib.parse.quote("petrol station", safe="")
    endpoint = (
        f"https://api.tomtom.com/search/2/categorySearch/{encoded_cat}.json?"
        + urllib.parse.urlencode({
            "key": api_key,
            "countrySet": "MW",
            "lat": district.latitude,
            "lon": district.longitude,
            "radius": district.radius_km * 1000,
            "categorySet": 7311,  # TomTom Petrol Station POI category code
            "limit": 50,
        })
    )

    try:
        data = http_request(endpoint)
        results = data.get("results", []) if isinstance(data, dict) else []
        cache.set(cache_key, results)
        return results
    except Exception as e:
        print(f"  [TomTom] Search failed for {district.name}: {e}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# Provider: OpenStreetMap Overpass API
# ---------------------------------------------------------------------------

def fetch_osm_district(
    district: DistrictInfo,
    cache: RequestCache,
) -> List[Dict[str, Any]]:
    """Query OpenStreetMap Overpass for fuel stations around district centroid."""
    cache_key = hashlib.sha256(f"osm_overpass:{district.name}:{district.latitude}:{district.longitude}".encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    radius_m = district.radius_km * 1000
    query = f"""
    [out:json][timeout:30];
    nwr["amenity"="fuel"](around:{radius_m},{district.latitude},{district.longitude});
    out center tags qt;
    """
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.openstreetmap.fr/api/interpreter",
    ]
    for endpoint in endpoints:
        try:
            data = http_request(
                endpoint,
                method="POST",
                headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
                data=urllib.parse.urlencode({"data": query}).encode("utf-8"),
                timeout=35,
            )
            elements = data.get("elements", []) if isinstance(data, dict) else []
            cache.set(cache_key, elements)
            time.sleep(1.0)  # Gentle spacing for OSM
            return elements
        except Exception as e:
            print(f"  [OSM] Attempt failed on {endpoint}: {e}", file=sys.stderr)
            time.sleep(1.5)

    return []


# ---------------------------------------------------------------------------
# Result Normalization Functions
# ---------------------------------------------------------------------------

def normalize_google_record(district: DistrictInfo, raw: Dict[str, Any]) -> Optional[StationCandidate]:
    # Support both Places API (New) format and legacy TextSearch format
    place_id = raw.get("id") or raw.get("place_id")
    if not place_id:
        return None

    disp_name = raw.get("displayName")
    if isinstance(disp_name, dict):
        name = disp_name.get("text") or "Fuel Station"
    else:
        name = raw.get("name") or "Fuel Station"

    loc = raw.get("location") or raw.get("geometry", {}).get("location") or {}
    lat = loc.get("latitude") or loc.get("lat")
    lon = loc.get("longitude") or loc.get("lng")
    if lat is None or lon is None or not is_in_malawi(lat, lon):
        return None

    address = raw.get("formattedAddress") or raw.get("formatted_address") or ""
    brand = classify_brand(name)

    return StationCandidate(
        source=f"google_places_{district.name.lower().replace(' ', '_')}",
        source_record_id=f"gplaces-{place_id}",
        operator_name=brand,
        source_name=name,
        source_city=district.name,
        source_address=address,
        query_text=f"petrol station in {district.name}, Malawi",
        provider="google_places",
        provider_place_id=place_id,
        lat=float(lat),
        lon=float(lon),
        result_name=name,
        result_address=address,
        result_type="gas_station",
        confidence_score=85 if brand != "Independent" else 75,
        evidence={
            "district": district.name,
            "region": district.region,
            "brand_matched": brand != "Independent",
            "phone": raw.get("nationalPhoneNumber") or raw.get("formatted_phone_number"),
        },
        raw_result=raw,
        district=district.name,
    )


def normalize_here_record(district: DistrictInfo, raw: Dict[str, Any]) -> Optional[StationCandidate]:
    place_id = raw.get("id")
    title = raw.get("title") or "Fuel Station"
    pos = raw.get("position") or {}
    lat = pos.get("lat")
    lon = pos.get("lng")
    if lat is None or lon is None or not is_in_malawi(lat, lon):
        return None

    address_dict = raw.get("address") or {}
    address = address_dict.get("label") or address_dict.get("street") or district.name
    city = address_dict.get("city") or district.name
    brand = classify_brand(title)

    return StationCandidate(
        source=f"here_{district.name.lower().replace(' ', '_')}",
        source_record_id=f"here-{place_id}",
        operator_name=brand,
        source_name=title,
        source_city=city,
        source_address=address,
        query_text=f"petrol station {district.name}, Malawi",
        provider="here",
        provider_place_id=place_id,
        lat=float(lat),
        lon=float(lon),
        result_name=title,
        result_address=address,
        result_type="fuel_station",
        confidence_score=80 if brand != "Independent" else 70,
        evidence={
            "district": district.name,
            "categories": [c.get("name") for c in raw.get("categories", [])],
        },
        raw_result=raw,
        district=district.name,
    )


def normalize_tomtom_record(district: DistrictInfo, raw: Dict[str, Any]) -> Optional[StationCandidate]:
    place_id = raw.get("id")
    poi = raw.get("poi") or {}
    name = poi.get("name") or "Fuel Station"
    pos = raw.get("position") or {}
    lat = pos.get("lat")
    lon = pos.get("lon")
    if lat is None or lon is None or not is_in_malawi(lat, lon):
        return None

    address_dict = raw.get("address") or {}
    address = address_dict.get("freeformAddress") or district.name
    city = address_dict.get("municipality") or district.name
    brand = classify_brand(name)

    return StationCandidate(
        source=f"tomtom_{district.name.lower().replace(' ', '_')}",
        source_record_id=f"tomtom-{place_id}",
        operator_name=brand,
        source_name=name,
        source_city=city,
        source_address=address,
        query_text=f"petrol station category near {district.name}",
        provider="tomtom",
        provider_place_id=place_id,
        lat=float(lat),
        lon=float(lon),
        result_name=name,
        result_address=address,
        result_type="POI",
        confidence_score=80 if brand != "Independent" else 70,
        evidence={
            "district": district.name,
            "categories": poi.get("categories", []),
        },
        raw_result=raw,
        district=district.name,
    )


def normalize_osm_record(district: DistrictInfo, raw: Dict[str, Any]) -> Optional[StationCandidate]:
    element_id = raw.get("id")
    element_type = raw.get("type", "node")
    tags = raw.get("tags") or {}

    lat = raw.get("lat") or raw.get("center", {}).get("lat")
    lon = raw.get("lon") or raw.get("center", {}).get("lon")
    if lat is None or lon is None or not is_in_malawi(lat, lon):
        return None

    name = tags.get("name") or tags.get("brand") or tags.get("operator") or f"Fuel Station ({district.name})"
    brand = classify_brand(name, tags.get("brand") or tags.get("operator"))
    city = tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village") or district.name
    street = tags.get("addr:street") or ""

    return StationCandidate(
        source=f"osm_{district.name.lower().replace(' ', '_')}",
        source_record_id=f"osm-{element_type}-{element_id}",
        operator_name=brand,
        source_name=name,
        source_city=city,
        source_address=street or city,
        query_text=f"amenity=fuel around {district.name}",
        provider="osm",
        provider_place_id=f"{element_type}:{element_id}",
        lat=float(lat),
        lon=float(lon),
        result_name=name,
        result_address=street or city,
        result_type="amenity=fuel",
        confidence_score=90 if brand != "Independent" else 80,
        evidence={
            "district": district.name,
            "osm_tags": tags,
        },
        raw_result=raw,
        district=district.name,
    )


# ---------------------------------------------------------------------------
# Cross-Referencing & Database Proximity Matching
# ---------------------------------------------------------------------------

def cross_reference_stations(
    candidates: List[StationCandidate],
    existing_stations: List[Dict[str, Any]],
) -> List[StationCandidate]:
    """Calculate proximity to nearest existing stations in Supabase."""
    for cand in candidates:
        min_dist = float("inf")
        nearest_st = None

        for st in existing_stations:
            st_lat = st.get("latitude")
            st_lon = st.get("longitude")
            if st_lat is None or st_lon is None:
                continue

            dist = haversine_distance_m(cand.lat, cand.lon, float(st_lat), float(st_lon))
            if dist < min_dist:
                min_dist = dist
                nearest_st = st

        if nearest_st and min_dist < float("inf"):
            cand.nearest_station_id = str(nearest_st.get("id"))
            cand.nearest_station_name = nearest_st.get("name")
            cand.nearest_station_brand = nearest_st.get("brand")
            cand.nearest_station_distance_m = round(min_dist, 1)

            # > 75 metres away indicates a new filling station location not currently in database
            cand.is_new_station_location = min_dist > 75.0
        else:
            cand.is_new_station_location = True

    return candidates


# ---------------------------------------------------------------------------
# SQL Migration & Seed Generator
# ---------------------------------------------------------------------------

def sql_escape_lit(val: Optional[str]) -> str:
    if val is None:
        return "null"
    escaped = val.replace("'", "''")
    return f"'{escaped}'"


def generate_sql_seed(candidates: List[StationCandidate]) -> str:
    """Generate PostgreSQL SQL script to populate station_geocoding_candidates."""
    lines = [
        "-- Seed station geocoding candidates discovered across Malawi districts",
        "-- Auto-generated by scripts/collect_district_stations.py",
        "begin;",
        "",
    ]

    for c in candidates:
        escaped_source = c.source.replace("'", "''")
        escaped_source_id = c.source_record_id.replace("'", "''")
        escaped_operator = c.operator_name.replace("'", "''")
        escaped_name = c.source_name.replace("'", "''")
        escaped_city = sql_escape_lit(c.source_city)
        escaped_address = sql_escape_lit(c.source_address)
        escaped_query = c.query_text.replace("'", "''")
        escaped_provider = c.provider.replace("'", "''")
        escaped_place_id = sql_escape_lit(c.provider_place_id)
        escaped_res_name = sql_escape_lit(c.result_name)
        escaped_res_addr = sql_escape_lit(c.result_address)
        escaped_res_type = sql_escape_lit(c.result_type)
        evidence_json = json.dumps(c.evidence, ensure_ascii=False).replace("'", "''")
        raw_json = json.dumps(c.raw_result, ensure_ascii=False).replace("'", "''")

        sql = f"""insert into public.station_geocoding_candidates (
  source, source_record_id, operator_name, source_name, source_city, source_address,
  query_text, provider, provider_place_id, proposed_location, result_name,
  result_address, result_type, confidence_score, evidence, raw_result, review_status
) values (
  '{escaped_source}', '{escaped_source_id}', '{escaped_operator}', '{escaped_name}', {escaped_city}, {escaped_address},
  '{escaped_query}', '{escaped_provider}', {escaped_place_id},
  extensions.st_setsrid(extensions.st_makepoint({c.lon:.7f}, {c.lat:.7f}), 4326)::extensions.geography,
  {escaped_res_name}, {escaped_res_addr}, {escaped_res_type}, {c.confidence_score},
  '{evidence_json}'::jsonb, '{raw_json}'::jsonb, 'pending'
)
on conflict (source, source_record_id, provider, provider_place_id) do update set
  proposed_location = excluded.proposed_location,
  result_name = excluded.result_name,
  result_address = excluded.result_address,
  confidence_score = excluded.confidence_score,
  evidence = excluded.evidence,
  raw_result = excluded.raw_result,
  updated_at = now();"""
        lines.append(sql)

    lines.append("\ncommit;\n")
    return "\n".join(lines)


def generate_stations_sql(candidates: List[StationCandidate]) -> str:
    """Generate PostgreSQL SQL script to seed new stations directly into public.stations."""
    lines = [
        "-- Seed unmapped retail stations directly into public.stations",
        "-- Auto-generated by scripts/collect_district_stations.py",
        "begin;",
        "",
    ]
    # Filter to new station locations (>75m from existing) and deduplicate against each other
    new_candidates = [c for c in candidates if c.is_new_station_location]
    unique_new: List[StationCandidate] = []
    for c in new_candidates:
        if not any(haversine_distance_m(c.lat, c.lon, u.lat, u.lon) < 75.0 for u in unique_new):
            unique_new.append(c)

    for c in unique_new:
        escaped_name = sql_escape_lit(c.source_name)
        escaped_brand = sql_escape_lit(c.operator_name)
        escaped_district = sql_escape_lit(c.district)
        escaped_city = sql_escape_lit(c.source_city or c.district)
        escaped_address = sql_escape_lit(c.source_address)

        sql = f"""insert into public.stations (
  name, brand, location, district, city, address, verified, active, fuel_types, latest_status
)
select
  {escaped_name}, {escaped_brand},
  extensions.st_setsrid(extensions.st_makepoint({c.lon:.7f}, {c.lat:.7f}), 4326)::extensions.geography,
  {escaped_district}, {escaped_city}, {escaped_address}, false, true,
  array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'unknown'::public.fuel_status
where not exists (
  select 1 from public.stations
  where extensions.st_dwithin(location, extensions.st_setsrid(extensions.st_makepoint({c.lon:.7f}, {c.lat:.7f}), 4326)::extensions.geography, 75)
);"""
        lines.append(sql)

    lines.append("\ncommit;\n")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Direct Supabase Ingestion via REST API
# ---------------------------------------------------------------------------

def sync_candidates_to_supabase(
    candidates: List[StationCandidate],
    supabase_url: str,
    supabase_key: str,
) -> int:
    """Sync candidates directly to Supabase via PostgREST endpoint."""
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/station_geocoding_candidates"

    rows = []
    for c in candidates:
        rows.append({
            "source": c.source,
            "source_record_id": c.source_record_id,
            "operator_name": c.operator_name,
            "source_name": c.source_name,
            "source_city": c.source_city,
            "source_address": c.source_address,
            "query_text": c.query_text,
            "provider": c.provider,
            "provider_place_id": c.provider_place_id,
            "proposed_location": f"SRID=4326;POINT({c.lon} {c.lat})",
            "result_name": c.result_name,
            "result_address": c.result_address,
            "result_type": c.result_type,
            "confidence_score": c.confidence_score,
            "evidence": c.evidence,
            "raw_result": c.raw_result,
            "review_status": "pending",
        })

    # Batch in groups of 50
    inserted = 0
    batch_size = 50
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            http_request(endpoint, method="POST", headers=headers, data=json.dumps(batch).encode("utf-8"))
            inserted += len(batch)
        except Exception as e:
            print(f"Error syncing batch {i // batch_size + 1} to Supabase: {e}", file=sys.stderr)

    return inserted


# ---------------------------------------------------------------------------
# Main CLI Application
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Malawi 28-District Fuel Station Batch Collector for Google Places, HERE, TomTom, and OSM"
    )
    parser.add_argument(
        "--district",
        default="all",
        help="Target district name (e.g. 'Kasungu', 'Mangochi', 'Chitipa') or 'all' for all 28 districts",
    )
    parser.add_argument(
        "--region",
        choices=["Northern", "Central", "Southern", "all"],
        default="all",
        help="Filter districts by administrative region",
    )
    parser.add_argument(
        "--provider",
        choices=["google", "here", "tomtom", "osm", "all"],
        default="all",
        help="Geocoding/Places provider to query (default: all available)",
    )
    parser.add_argument(
        "--cache",
        type=Path,
        default=DEFAULT_CACHE_PATH,
        help=f"Path to persistent cache file (default: {DEFAULT_CACHE_PATH})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_JSON,
        help=f"Path to output JSON candidate file (default: {DEFAULT_OUTPUT_JSON})",
    )
    parser.add_argument(
        "--output-sql",
        type=Path,
        default=DEFAULT_OUTPUT_SQL,
        help=f"Path to output SQL migration file (default: {DEFAULT_OUTPUT_SQL})",
    )
    parser.add_argument(
        "--sync-supabase",
        action="store_true",
        help="Directly upload candidates to Supabase using SUPABASE_URL and SUPABASE_SECRET_KEY",
    )
    parser.add_argument(
        "--output-stations-sql",
        type=Path,
        default=DEFAULT_OUTPUT_STATIONS_SQL,
        help=f"Path to output SQL script inserting new unmapped stations directly into public.stations (default: {DEFAULT_OUTPUT_STATIONS_SQL})",
    )
    parser.add_argument(
        "--stations-file",
        type=Path,
        default=DEFAULT_STATIONS_FILE if DEFAULT_STATIONS_FILE.exists() else None,
        help=f"Path to existing stations JSON file for proximity comparison (default: {DEFAULT_STATIONS_FILE})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of districts processed",
    )
    parser.add_argument(
        "--new-only",
        action="store_true",
        help="Only output candidates that are > 75 metres from existing stations",
    )

    args = parser.parse_args()

    # Discover API Keys from Environment
    google_key = os.environ.get("GOOGLE_PLACES_API_KEY") or os.environ.get("GOOGLE_MAPS_API_KEY") or ""
    here_key = os.environ.get("HERE_API_KEY") or os.environ.get("HERE_TOKEN") or ""
    tomtom_key = os.environ.get("TOMTOM_API_KEY") or ""

    active_providers = []
    if args.provider in ("google", "all"):
        if google_key:
            active_providers.append("google")
        elif args.provider == "google":
            parser.error("GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY is required for Google Places provider.")

    if args.provider in ("here", "all"):
        if here_key:
            active_providers.append("here")
        elif args.provider == "here":
            parser.error("HERE_API_KEY is required for HERE provider.")

    if args.provider in ("tomtom", "all"):
        if tomtom_key:
            active_providers.append("tomtom")
        elif args.provider == "tomtom":
            parser.error("TOMTOM_API_KEY is required for TomTom provider.")

    if args.provider in ("osm", "all"):
        active_providers.append("osm")

    print("=================================================================")
    print(" Alipo Malawi 28-District Retail Station Batch Collector")
    print("=================================================================")
    print(f"Active Providers: {', '.join(active_providers) if active_providers else 'None'}")
    if not google_key and args.provider == "all":
        print(" [Note] GOOGLE_PLACES_API_KEY not set - skipping Google Places.")
    if not here_key and args.provider == "all":
        print(" [Note] HERE_API_KEY not set - skipping HERE Technologies.")
    if not tomtom_key and args.provider == "all":
        print(" [Note] TOMTOM_API_KEY not set - skipping TomTom Search.")
    print("=================================================================\n")

    # Select target districts
    target_districts: List[DistrictInfo] = []
    if args.district.lower() != "all":
        matched = [d for name, d in MALAWI_DISTRICTS.items() if name.lower() == args.district.lower()]
        if not matched:
            parser.error(f"Unknown district '{args.district}'. Available: {', '.join(sorted(MALAWI_DISTRICTS.keys()))}")
        target_districts = matched
    else:
        target_districts = list(MALAWI_DISTRICTS.values())

    if args.region != "all":
        target_districts = [d for d in target_districts if d.region.lower() == args.region.lower()]

    if args.limit:
        target_districts = target_districts[: args.limit]

    print(f"Targeting {len(target_districts)} districts across Malawi...")

    cache = RequestCache(args.cache)
    all_candidates: List[StationCandidate] = []
    seen_keys: set[str] = set()

    # Process districts
    for idx, dist in enumerate(target_districts, 1):
        print(f"[{idx}/{len(target_districts)}] Scanning {dist.name} ({dist.region} Region, r={dist.radius_km}km)...")

        # 1. Google Places
        if "google" in active_providers:
            g_raw = fetch_google_places_district(dist, google_key, cache)
            for raw in g_raw:
                c = normalize_google_record(dist, raw)
                if c:
                    key = f"{c.provider}:{c.provider_place_id}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_candidates.append(c)

        # 2. HERE Technologies
        if "here" in active_providers:
            h_raw = fetch_here_district(dist, here_key, cache)
            for raw in h_raw:
                c = normalize_here_record(dist, raw)
                if c:
                    key = f"{c.provider}:{c.provider_place_id}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_candidates.append(c)

        # 3. TomTom
        if "tomtom" in active_providers:
            t_raw = fetch_tomtom_district(dist, tomtom_key, cache)
            for raw in t_raw:
                c = normalize_tomtom_record(dist, raw)
                if c:
                    key = f"{c.provider}:{c.provider_place_id}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_candidates.append(c)

        # 4. OpenStreetMap
        if "osm" in active_providers:
            osm_raw = fetch_osm_district(dist, cache)
            for raw in osm_raw:
                c = normalize_osm_record(dist, raw)
                if c:
                    key = f"{c.provider}:{c.provider_place_id}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_candidates.append(c)

    print(f"\nDiscovered {len(all_candidates)} unique raw candidate records.")

    # Cross-reference with existing stations
    existing_stations = []
    if args.stations_file and args.stations_file.exists():
        try:
            existing_stations = json.loads(args.stations_file.read_text(encoding="utf-8"))
            print(f"Loaded {len(existing_stations)} existing stations from {args.stations_file}")
        except Exception as e:
            print(f"Warning: Failed to load stations file: {e}", file=sys.stderr)

    all_candidates = cross_reference_stations(all_candidates, existing_stations)

    if args.new_only:
        all_candidates = [c for c in all_candidates if c.is_new_station_location]
        print(f"Filtered to {len(all_candidates)} newly discovered station locations (>75m from known stations).")

    # Output JSON
    args.output.parent.mkdir(parents=True, exist_ok=True)
    serialized = [asdict(c) for c in all_candidates]
    args.output.write_text(json.dumps(serialized, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved candidate records to: {args.output}")

    # Output Candidate SQL
    if args.output_sql:
        args.output_sql.parent.mkdir(parents=True, exist_ok=True)
        sql_content = generate_sql_seed(all_candidates)
        args.output_sql.write_text(sql_content, encoding="utf-8")
        print(f"Saved candidate SQL migration to: {args.output_sql}")

    # Output Direct Stations SQL
    if args.output_stations_sql:
        args.output_stations_sql.parent.mkdir(parents=True, exist_ok=True)
        stations_sql = generate_stations_sql(all_candidates)
        args.output_stations_sql.write_text(stations_sql, encoding="utf-8")
        print(f"Saved new stations SQL script to: {args.output_stations_sql}")

    # Optional Supabase direct sync
    if args.sync_supabase:
        sb_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        sb_key = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if sb_url and sb_key:
            print("Syncing candidate records to Supabase...")
            count = sync_candidates_to_supabase(all_candidates, sb_url, sb_key)
            print(f"Successfully synced {count} candidates to Supabase!")
        else:
            print("Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set to use --sync-supabase.", file=sys.stderr)

    # Print summary breakdown by region and brand
    print("\n--- Summary Breakdown by District & Brand ---")
    brand_counts: Dict[str, int] = {}
    district_counts: Dict[str, int] = {}
    for c in all_candidates:
        brand_counts[c.operator_name] = brand_counts.get(c.operator_name, 0) + 1
        d_name = c.district or "Unknown"
        district_counts[d_name] = district_counts.get(d_name, 0) + 1

    print("Top Brands Found:")
    for b, cnt in sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  - {b}: {cnt}")

    print("\nTop Districts Found:")
    for d, cnt in sorted(district_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  - {d}: {cnt}")

    print("=================================================================\n")


if __name__ == "__main__":
    main()
