#!/usr/bin/env python3
"""Create reviewable geocoding candidates from the official Puma/Petroda lists.

Public Nominatim use is intentionally single-threaded, cached, and capped at one
request per second. Set TOMTOM_API_KEY to use TomTom instead.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = ROOT / "tmp" / "station-import" / "geocode-cache.json"
PUMA_PDF = ROOT / "tmp" / "pdfs" / "puma-africa-stations.pdf"
PETRODA_ROWS = [
    ("blantyre-tsiranana", "Tsiranana", "Blantyre", "Along Zomba Road next to Unilever"),
    ("blantyre-munif", "Munif", "Blantyre", "In Limbe next to Limbe Police Station"),
    ("blantyre-mandala", "Mandala", "Blantyre", "Mount Pleasant next to College of Medicine"),
    ("blantyre-clock-tower", "Clock Tower", "Blantyre", "Clocktower Roundabout"),
    ("blantyre-mbayani", "Mbayani", "Blantyre", "Along M1 Road at Mbayani"),
    ("blantyre-kameza", "Kameza", "Blantyre", "Chileka Road at Kameza Roundabout"),
    ("lilongwe-biwi", "Biwi", "Lilongwe", "Biwi Triangle"),
    ("lilongwe-bunda", "Bunda", "Lilongwe", "Bunda Turn off"),
    ("lilongwe-area-25", "Area 25", "Lilongwe", "Near Petroda Depot"),
    ("lilongwe-area-4", "Area 4", "Lilongwe", "Near Lilongwe Central Hospital"),
    ("lilongwe-area-43", "Area 43", "Lilongwe", "Opposite Area 30 Police"),
    ("lilongwe-area-47", "Area 47", "Lilongwe", "Along Mchinji Road"),
    ("lilongwe-area-46", "Area 46", "Lilongwe", "Lilongwe by-pass Road"),
    ("lilongwe-chitukuko", "Chitukuko", "Lilongwe", "Area 43"),
    ("lilongwe-salima-turn-off", "Salima Turn Off", "Lilongwe", "Salima Turn Off"),
    ("outside-blantyre-zomba", "Zomba", "Zomba", ""),
    ("outside-blantyre-liwonde", "Liwonde", "Liwonde", ""),
    ("outside-blantyre-mangochi", "Mangochi", "Mangochi", ""),
    ("outside-blantyre-luchenza", "Luchenza", "Luchenza", ""),
    ("outside-blantyre-balaka", "Balaka", "Balaka", ""),
    ("outside-blantyre-ntcheu", "Ntcheu", "Ntcheu", ""),
    ("outside-blantyre-mwanza", "Mwanza", "Mwanza", ""),
    ("outside-lilongwe-kasungu", "Kasungu", "Kasungu", ""),
    ("outside-lilongwe-salima-boma", "Salima Boma", "Salima", ""),
    ("outside-lilongwe-mchinji", "Mchinji", "Mchinji", ""),
    ("outside-lilongwe-mzuzu", "Mzuzu", "Mzuzu", ""),
    ("outside-lilongwe-mzimba", "Mzimba", "Mzimba", ""),
    ("outside-lilongwe-karonga", "Karonga", "Karonga", ""),
]


def words(value: str) -> set[str]:
    ignored = {"energy", "filling", "fuel", "service", "station", "malawi", "the"}
    return {w for w in re.findall(r"[a-z0-9]+", value.lower()) if len(w) > 1 and w not in ignored}


def puma_rows() -> list[dict]:
    import pdfplumber

    rows = []
    with pdfplumber.open(PUMA_PDF) as pdf:
        position = 0
        for page_number, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables():
                for cells in table:
                    if not cells or not cells[0] or "Puma Energy" not in cells[0]:
                        continue
                    padded = (cells + [""] * 7)[:7]
                    if (padded[5] or "").strip().upper() != "MW":
                        continue
                    position += 1
                    rows.append({
                        "source": "puma_energy_mw",
                        "source_record_id": f"pdf-2025-{page_number}-{position}",
                        "operator_name": "Puma",
                        "source_name": padded[0].strip(),
                        "road": (padded[1] or "").strip(),
                        "source_address": ", ".join(filter(None, [(padded[1] or "").strip(), (padded[3] or "").strip()])),
                        "source_city": (padded[4] or "").strip(),
                    })
    return rows


def petroda_rows() -> list[dict]:
    return [{
        "source": "petroda_mw",
        "source_record_id": source_id,
        "operator_name": "Petroda",
        "source_name": name,
        "road": address,
        "source_address": address,
        "source_city": city,
    } for source_id, name, city, address in PETRODA_ROWS]


def queries(row: dict) -> list[str]:
    operator = row["operator_name"]
    name = row["source_name"]
    city = row["source_city"]
    address = row["source_address"]
    return list(dict.fromkeys(filter(None, [
        ", ".join(filter(None, [operator, name, address, city, "Malawi"])),
        ", ".join(filter(None, [operator, name, city, "Malawi"])),
        ", ".join(filter(None, [operator, address, city, "Malawi"])),
    ])))


def request_json(url: str, user_agent: str) -> object:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except (TimeoutError, urllib.error.URLError) as error:
            last_error = error
            time.sleep(2 ** attempt)
    raise last_error


def nominatim(query: str, user_agent: str) -> list[dict]:
    params = urllib.parse.urlencode({
        "q": query, "format": "jsonv2", "addressdetails": 1,
        "namedetails": 1, "countrycodes": "mw", "limit": 5,
    })
    return request_json(f"https://nominatim.openstreetmap.org/search?{params}", user_agent)


def tomtom(query: str, key: str, user_agent: str) -> list[dict]:
    encoded = urllib.parse.quote(query, safe="")
    params = urllib.parse.urlencode({"key": key, "countrySet": "MW", "idxSet": "POI,PAD,Addr,Str", "limit": 5})
    payload = request_json(f"https://api.tomtom.com/search/2/search/{encoded}.json?{params}", user_agent)
    return payload.get("results", [])


def normalize_result(provider: str, result: dict) -> dict:
    if provider == "nominatim":
        address = result.get("address") or {}
        return {
            "provider_place_id": f"{result.get('osm_type', '')}:{result.get('osm_id', '')}",
            "lat": float(result["lat"]), "lon": float(result["lon"]),
            "result_name": (result.get("namedetails") or {}).get("name") or result.get("name") or result.get("display_name", "").split(",")[0],
            "result_address": result.get("display_name", ""),
            "result_type": result.get("type") or result.get("category"),
            "country_code": address.get("country_code", "").upper(), "raw": result,
        }
    address = result.get("address") or {}
    poi = result.get("poi") or {}
    position = result["position"]
    return {
        "provider_place_id": result.get("id"), "lat": position["lat"], "lon": position["lon"],
        "result_name": poi.get("name") or address.get("freeformAddress", "").split(",")[0],
        "result_address": address.get("freeformAddress", ""), "result_type": result.get("type"),
        "country_code": address.get("countryCode", "").upper(), "raw": result,
    }


def score(row: dict, result: dict) -> tuple[int, dict]:
    haystack = f"{result['result_name']} {result['result_address']}".lower()
    operator_match = row["operator_name"].lower() in haystack
    source_words = words(row["source_name"])
    result_words = words(result["result_name"])
    overlap = len(source_words & result_words) / max(1, len(source_words))
    city_match = bool(row["source_city"] and row["source_city"].lower() in haystack)
    road_words = words(row.get("road", ""))
    road_overlap = len(road_words & words(result["result_address"])) / max(1, len(road_words)) if road_words else 0
    country_match = result["country_code"] == "MW"
    value = round(30 * operator_match + 25 * overlap + 20 * city_match + 15 * road_overlap + 10 * country_match)
    evidence = {"operator_match": operator_match, "name_overlap": round(overlap, 3), "city_match": city_match,
                "road_overlap": round(road_overlap, 3), "country_match": country_match}
    return min(100, value), evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=("nominatim", "tomtom"), default="nominatim")
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    api_key = os.environ.get("TOMTOM_API_KEY", "")
    if args.provider == "tomtom" and not api_key:
        parser.error("TOMTOM_API_KEY is required for the TomTom provider")

    args.cache.parent.mkdir(parents=True, exist_ok=True)
    cache = json.loads(args.cache.read_text()) if args.cache.exists() else {}
    records = puma_rows() + petroda_rows()
    if args.limit:
        records = records[:args.limit]
    candidates = []
    user_agent = "AlipoStationResearch/1.0 (info@wekode.dev)"
    for row in records:
        best = None
        for query in queries(row):
            cache_key = hashlib.sha256(f"{args.provider}:{query}".encode()).hexdigest()
            if cache_key not in cache:
                try:
                    cache[cache_key] = nominatim(query, user_agent) if args.provider == "nominatim" else tomtom(query, api_key, user_agent)
                    args.cache.write_text(json.dumps(cache, ensure_ascii=False))
                except (TimeoutError, urllib.error.URLError) as error:
                    print(f"warning: {args.provider} query failed after retries: {error}", flush=True)
                    continue
                finally:
                    if args.provider == "nominatim":
                        time.sleep(1.1)
            for raw in cache[cache_key]:
                result = normalize_result(args.provider, raw)
                candidate_score, evidence = score(row, result)
                candidate = {**row, **result, "provider": args.provider, "query_text": query,
                             "confidence_score": candidate_score, "evidence": evidence}
                if best is None or candidate_score > best["confidence_score"]:
                    best = candidate
            if best and best["confidence_score"] >= 80:
                break
        if best:
            candidates.append(best)
        if args.output:
            args.output.write_text(json.dumps(candidates, ensure_ascii=False, indent=2))

    output = json.dumps(candidates, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(output)
    else:
        print(output)


if __name__ == "__main__":
    main()
