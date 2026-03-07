#!/usr/bin/env python3
"""
Download GeoNames data and generate SQL migrations for seeding
world continents, countries, regions, and cities into the locations table.

Usage:
    python scripts/seed_world_cities.py              # use cached files or download
    python scripts/seed_world_cities.py --download    # force re-download
    python scripts/seed_world_cities.py --min-pop 50000  # only cities >= 50k population
"""

import argparse
import io
import os
import re
import sys
import zipfile
from pathlib import Path
from urllib.request import urlopen

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "geonames_data"
MIGRATIONS_DIR = SCRIPT_DIR.parent / "backend" / "migrations"

GEONAMES_BASE = "https://download.geonames.org/export/dump"
CITIES_ZIP = "cities15000.zip"
CITIES_FILE = "cities15000.txt"
COUNTRY_INFO = "countryInfo.txt"
ADMIN1_CODES = "admin1CodesASCII.txt"

# Continent code -> (name, slug, lat, lng)
CONTINENTS = {
    "AF": ("Africa", "africa", 8.7832, 34.5085),
    "AS": ("Asia", "asia", 34.0479, 100.6197),
    "EU": ("Europe", "europe", 54.526, 15.2551),
    "NA": ("North America", "north-america", 39.8283, -98.5795),
    "OC": ("Oceania", "oceania", -22.7359, 140.0188),
    "SA": ("South America", "south-america", -8.7832, -55.4915),
    "AN": ("Antarctica", "antarctica", -82.8628, 135.0),
}


def download_file(url, dest):
    """Download a file from url to dest path."""
    print(f"  Downloading {url} ...")
    resp = urlopen(url)
    dest.write_bytes(resp.read())
    print(f"  -> {dest}")


def ensure_data(force_download=False):
    """Download GeoNames files if not present (or forced)."""
    DATA_DIR.mkdir(exist_ok=True)

    cities_path = DATA_DIR / CITIES_FILE
    country_path = DATA_DIR / COUNTRY_INFO
    admin1_path = DATA_DIR / ADMIN1_CODES

    if force_download or not cities_path.exists():
        zip_path = DATA_DIR / CITIES_ZIP
        download_file(f"{GEONAMES_BASE}/{CITIES_ZIP}", zip_path)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extract(CITIES_FILE, DATA_DIR)
        zip_path.unlink()
        print(f"  Extracted {CITIES_FILE}")

    if force_download or not country_path.exists():
        download_file(f"{GEONAMES_BASE}/{COUNTRY_INFO}", country_path)

    if force_download or not admin1_path.exists():
        download_file(f"{GEONAMES_BASE}/{ADMIN1_CODES}", admin1_path)


def parse_countries():
    """Parse countryInfo.txt -> {iso2: {name, continent, population}}."""
    countries = {}
    for line in (DATA_DIR / COUNTRY_INFO).read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 17:
            continue
        iso = parts[0]
        name = parts[4]
        continent = parts[8]
        try:
            population = int(parts[7])
        except (ValueError, IndexError):
            population = 0
        countries[iso] = {
            "name": name,
            "continent": continent,
            "population": population,
        }
    return countries


def parse_admin1():
    """Parse admin1CodesASCII.txt -> {"CC.AD1": name}."""
    admin1 = {}
    for line in (DATA_DIR / ADMIN1_CODES).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 2:
            admin1[parts[0]] = parts[1]  # key = "US.CA", value = "California"
    return admin1


def parse_cities(min_pop=15000):
    """Parse cities15000.txt -> list of city dicts."""
    cities = []
    for line in (DATA_DIR / CITIES_FILE).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 19:
            continue
        try:
            population = int(parts[14])
        except ValueError:
            population = 0
        if population < min_pop:
            continue
        cities.append({
            "name": parts[1],  # name (UTF-8)
            "lat": float(parts[4]),
            "lng": float(parts[5]),
            "country_code": parts[8],
            "admin1_code": parts[10],
            "population": population,
            "timezone": parts[17],
        })
    return cities


def slugify(name, max_len=80):
    """Convert a name to a URL-safe slug."""
    s = name.lower()
    # Replace common special chars
    s = s.replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss")
    s = s.replace("å", "a").replace("ø", "o").replace("æ", "ae")
    s = s.replace("ñ", "n").replace("ç", "c").replace("ð", "d").replace("þ", "th")
    s = s.replace("'", "").replace("'", "").replace("`", "")
    # Replace non-alphanumeric with hyphen
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    # Collapse multiple hyphens
    s = re.sub(r"-+", "-", s)
    return s[:max_len]


def sql_escape(s):
    """Escape single quotes for SQL string literals."""
    return s.replace("'", "''")


def build_hierarchy(countries_data, admin1_data, cities_data):
    """Build the full location hierarchy and return structured data."""

    # Single global slug set — the locations table has a unique index on slug
    global_slugs = set()

    def claim_slug(base, *suffixes):
        """Try base slug, then append suffixes one by one until unique."""
        slug = base
        if slug not in global_slugs:
            global_slugs.add(slug)
            return slug
        for sfx in suffixes:
            slug = f"{base}-{sfx}"
            if slug not in global_slugs:
                global_slugs.add(slug)
                return slug
        # Counter fallback
        n = 2
        while f"{slug}-{n}" in global_slugs:
            n += 1
        slug = f"{slug}-{n}"
        global_slugs.add(slug)
        return slug

    # Track which continents, countries, regions are actually used
    used_continents = set()
    used_countries = set()
    used_regions = set()  # set of "CC.AD1" keys

    for city in cities_data:
        cc = city["country_code"]
        if cc not in countries_data:
            continue
        cont_code = countries_data[cc]["continent"]
        used_continents.add(cont_code)
        used_countries.add(cc)
        ad1_key = f"{cc}.{city['admin1_code']}"
        if city["admin1_code"] and ad1_key in admin1_data:
            used_regions.add(ad1_key)

    # Build continent list
    continents = []
    for code in sorted(used_continents):
        if code not in CONTINENTS:
            continue
        name, slug, lat, lng = CONTINENTS[code]
        global_slugs.add(slug)
        continents.append({
            "code": code,
            "name": name,
            "slug": slug,
            "lat": lat,
            "lng": lng,
        })

    # Build country list
    country_slugs = {}
    country_list = []
    for cc in sorted(used_countries):
        info = countries_data[cc]
        base_slug = slugify(info["name"])
        slug = claim_slug(base_slug, cc.lower())
        country_slugs[cc] = slug
        cont_code = info["continent"]
        cont_slug = CONTINENTS.get(cont_code, ("", "unknown", 0, 0))[1]
        country_list.append({
            "code": cc,
            "name": info["name"],
            "slug": slug,
            "continent_code": cont_code,
            "continent_slug": cont_slug,
            "population": info["population"],
            "path": f"{cont_slug}/{slug}",
        })

    # Build region list
    region_slugs = {}  # "CC.AD1" -> slug
    region_list = []
    for ad1_key in sorted(used_regions):
        cc, ad1 = ad1_key.split(".", 1)
        name = admin1_data[ad1_key]
        base_slug = slugify(name)
        slug = claim_slug(base_slug, cc.lower(), f"{ad1.lower()}-{cc.lower()}")
        region_slugs[ad1_key] = slug
        c_slug = country_slugs.get(cc, cc.lower())
        cont_code = countries_data[cc]["continent"]
        cont_slug = CONTINENTS.get(cont_code, ("", "unknown", 0, 0))[1]
        region_list.append({
            "key": ad1_key,
            "name": name,
            "slug": slug,
            "country_code": cc,
            "country_slug": c_slug,
            "continent_slug": cont_slug,
            "path": f"{cont_slug}/{c_slug}/{slug}",
        })

    # Pre-count city base slugs to know which need disambiguation
    city_slug_counts = {}
    for city in cities_data:
        if city["country_code"] not in countries_data:
            continue
        base = slugify(city["name"])
        city_slug_counts[base] = city_slug_counts.get(base, 0) + 1

    city_list = []

    for city in cities_data:
        cc = city["country_code"]
        if cc not in countries_data:
            continue

        base_slug = slugify(city["name"])
        ad1_key = f"{cc}.{city['admin1_code']}"
        has_region = city["admin1_code"] and ad1_key in admin1_data

        # Build suffixes for disambiguation
        suffixes = []
        if has_region:
            suffixes.append(slugify(admin1_data[ad1_key], 20))
        suffixes.append(cc.lower())
        if has_region:
            suffixes.append(f"{slugify(admin1_data[ad1_key], 20)}-{cc.lower()}")

        # If base slug is unique among cities AND globally, use it directly
        if city_slug_counts.get(base_slug, 0) <= 1 and base_slug not in global_slugs:
            slug = base_slug
            global_slugs.add(slug)
        else:
            slug = claim_slug(base_slug, *suffixes)

        # Truncate slug to fit varchar(100)
        if len(slug) > 100:
            global_slugs.discard(slug)
            slug = slug[:100]
            global_slugs.add(slug)

        # Build path
        c_slug = country_slugs.get(cc, cc.lower())
        cont_code = countries_data[cc]["continent"]
        cont_slug = CONTINENTS.get(cont_code, ("", "unknown", 0, 0))[1]

        if has_region:
            r_slug = region_slugs[ad1_key]
            parent_slug = r_slug
            path = f"{cont_slug}/{c_slug}/{r_slug}/{slug}"
        else:
            parent_slug = c_slug
            path = f"{cont_slug}/{c_slug}/{slug}"

        city_list.append({
            "name": city["name"],
            "slug": slug,
            "lat": city["lat"],
            "lng": city["lng"],
            "country_code": cc,
            "parent_slug": parent_slug,
            "parent_is_region": has_region,
            "path": path,
            "population": city["population"],
            "timezone": city["timezone"],
        })

    return continents, country_list, region_list, city_list


def generate_continents_countries_sql(continents, countries):
    """Generate migration 006: continents and countries."""
    lines = []
    lines.append("-- Seed continents and countries from GeoNames data")
    lines.append("-- Auto-generated by scripts/seed_world_cities.py")
    lines.append("")

    # Continents
    lines.append("-- Continents (level 0)")
    lines.append("INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng)")
    lines.append("VALUES")
    cont_values = []
    for c in continents:
        cont_values.append(
            f"  (gen_random_uuid(), '{sql_escape(c['name'])}', '{c['slug']}', 0, NULL, "
            f"'{c['slug']}', '{sql_escape(c['name'])} continent', true, {c['lat']}, {c['lng']})"
        )
    lines.append(",\n".join(cont_values))
    lines.append("ON CONFLICT (slug) DO NOTHING;")
    lines.append("")

    # Countries in batches
    lines.append("-- Countries (level 1)")
    batch_size = 500
    for i in range(0, len(countries), batch_size):
        batch = countries[i:i + batch_size]
        lines.append("INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng, meta)")
        lines.append("VALUES")
        vals = []
        for c in batch:
            meta = f'{{"population": {c["population"]}}}'
            vals.append(
                f"  (gen_random_uuid(), '{sql_escape(c['name'])}', '{c['slug']}', 1, "
                f"(SELECT id FROM locations WHERE slug = '{c['continent_slug']}'), "
                f"'{c['path']}', '{sql_escape(c['name'])}', true, NULL, NULL, "
                f"'{sql_escape(meta)}')"
            )
        lines.append(",\n".join(vals))
        lines.append("ON CONFLICT (slug) DO NOTHING;")
        lines.append("")

    return "\n".join(lines)


def generate_regions_sql(regions):
    """Generate migration 007: regions."""
    lines = []
    lines.append("-- Seed admin1 regions from GeoNames data")
    lines.append("-- Auto-generated by scripts/seed_world_cities.py")
    lines.append("")

    batch_size = 500
    for i in range(0, len(regions), batch_size):
        batch = regions[i:i + batch_size]
        lines.append("-- Regions batch (level 2)")
        lines.append("INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active)")
        lines.append("VALUES")
        vals = []
        for r in batch:
            vals.append(
                f"  (gen_random_uuid(), '{sql_escape(r['name'])}', '{r['slug']}', 2, "
                f"(SELECT id FROM locations WHERE slug = '{r['country_slug']}'), "
                f"'{r['path']}', '{sql_escape(r['name'])}', true)"
            )
        lines.append(",\n".join(vals))
        lines.append("ON CONFLICT (slug) DO NOTHING;")
        lines.append("")

    return "\n".join(lines)


def generate_cities_sql(cities):
    """Generate migration 008: cities."""
    lines = []
    lines.append("-- Seed world cities (population >= 15000) from GeoNames data")
    lines.append("-- Auto-generated by scripts/seed_world_cities.py")
    lines.append("")

    batch_size = 500
    for i in range(0, len(cities), batch_size):
        batch = cities[i:i + batch_size]
        lines.append(f"-- Cities batch {i // batch_size + 1}")
        lines.append("INSERT INTO locations (id, name, slug, level, parent_id, path, is_active, lat, lng, meta)")
        lines.append("VALUES")
        vals = []
        for c in batch:
            meta = f'{{"population": {c["population"]}, "timezone": "{sql_escape(c["timezone"])}"}}'
            vals.append(
                f"  (gen_random_uuid(), '{sql_escape(c['name'])}', '{c['slug']}', 3, "
                f"(SELECT id FROM locations WHERE slug = '{c['parent_slug']}'), "
                f"'{sql_escape(c['path'])}', true, {c['lat']}, {c['lng']}, "
                f"'{sql_escape(meta)}')"
            )
        lines.append(",\n".join(vals))
        lines.append("ON CONFLICT (slug) DO NOTHING;")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate world city seed migrations from GeoNames data")
    parser.add_argument("--download", action="store_true", help="Force re-download of GeoNames files")
    parser.add_argument("--min-pop", type=int, default=15000, help="Minimum city population (default: 15000)")
    args = parser.parse_args()

    print("=== GeoNames World Cities Seed Generator ===")
    print()

    # Step 1: Ensure data files exist
    print("Step 1: Ensuring GeoNames data files...")
    ensure_data(force_download=args.download)
    print()

    # Step 2: Parse data
    print("Step 2: Parsing GeoNames data...")
    countries_data = parse_countries()
    print(f"  Countries: {len(countries_data)}")
    admin1_data = parse_admin1()
    print(f"  Admin1 regions: {len(admin1_data)}")
    cities_data = parse_cities(min_pop=args.min_pop)
    print(f"  Cities (pop >= {args.min_pop}): {len(cities_data)}")
    print()

    # Step 3: Build hierarchy
    print("Step 3: Building location hierarchy...")
    continents, country_list, region_list, city_list = build_hierarchy(
        countries_data, admin1_data, cities_data
    )
    print(f"  Continents: {len(continents)}")
    print(f"  Countries: {len(country_list)}")
    print(f"  Regions: {len(region_list)}")
    print(f"  Cities: {len(city_list)}")
    print()

    # Verify no slug collisions
    all_slugs = (
        [c["slug"] for c in continents]
        + [c["slug"] for c in country_list]
        + [r["slug"] for r in region_list]
        + [c["slug"] for c in city_list]
    )
    slug_counts = {}
    for s in all_slugs:
        slug_counts[s] = slug_counts.get(s, 0) + 1
    collisions = {s: n for s, n in slug_counts.items() if n > 1}
    if collisions:
        print(f"  WARNING: {len(collisions)} slug collisions detected!")
        for s, n in sorted(collisions.items())[:20]:
            print(f"    '{s}' appears {n} times")
        print()

    # Step 4: Generate SQL
    print("Step 4: Generating SQL migration files...")

    sql_006 = generate_continents_countries_sql(continents, country_list)
    path_006 = MIGRATIONS_DIR / "006_seed_continents_countries.sql"
    path_006.write_text(sql_006, encoding="utf-8")
    print(f"  Written: {path_006} ({len(sql_006)} bytes)")

    sql_007 = generate_regions_sql(region_list)
    path_007 = MIGRATIONS_DIR / "007_seed_regions.sql"
    path_007.write_text(sql_007, encoding="utf-8")
    print(f"  Written: {path_007} ({len(sql_007)} bytes)")

    sql_008 = generate_cities_sql(city_list)
    path_008 = MIGRATIONS_DIR / "008_seed_world_cities.sql"
    path_008.write_text(sql_008, encoding="utf-8")
    print(f"  Written: {path_008} ({len(sql_008)} bytes)")

    print()
    print("Done! Migration files ready in backend/migrations/")
    print(f"  Total locations: {len(continents) + len(country_list) + len(region_list) + len(city_list)}")


if __name__ == "__main__":
    main()
