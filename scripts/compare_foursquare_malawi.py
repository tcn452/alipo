#!/usr/bin/env python3
"""Extract Malawi fuel stations from an authenticated FSQ OS Places release."""

import json
import os
import urllib.request

import duckdb


RELEASE = "2026-09-15"
FUEL_STATION_CATEGORY_ID = "4bf58dd8d48988d113951735"
OUTPUT_PATH = "/tmp/alipo-fsq-malawi-fuel.json"


def main() -> None:
    token = os.environ["HF_TOKEN"]
    api_url = (
        "https://huggingface.co/api/datasets/foursquare/fsq-os-places/tree/"
        f"main/release/dt%3D{RELEASE}/places/parquet?expand=false&limit=1000"
    )
    with urllib.request.urlopen(api_url) as response:
        entries = json.load(response)

    urls = [
        "https://huggingface.co/datasets/foursquare/fsq-os-places/resolve/main/"
        + entry["path"]
        for entry in entries
        if entry["path"].endswith(".parquet")
    ]

    connection = duckdb.connect()
    escaped_token = token.replace("'", "''")
    connection.execute(
        "CREATE SECRET hf (TYPE http, BEARER_TOKEN "
        f"'{escaped_token}', SCOPE 'https://huggingface.co')"
    )
    connection.execute(
        f"""
        COPY (
          select
            fsq_place_id,
            name,
            latitude,
            longitude,
            address,
            locality,
            region,
            country,
            date_refreshed,
            fsq_category_labels,
            placemaker_url
          from read_parquet(?)
          where country = 'MW'
            and list_contains(fsq_category_ids, '{FUEL_STATION_CATEGORY_ID}')
            and date_closed is null
        ) TO '{OUTPUT_PATH}' (FORMAT JSON, ARRAY true)
        """,
        [urls],
    )
    station_count = connection.execute(
        "select count(*) from read_json_auto(?)", [OUTPUT_PATH]
    ).fetchone()[0]
    print(json.dumps({"files": len(urls), "stations": station_count, "output": OUTPUT_PATH}))


if __name__ == "__main__":
    main()
