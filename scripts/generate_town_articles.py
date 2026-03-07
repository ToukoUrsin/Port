"""
Generate seed articles for towns that don't have scraped content.

Uses Claude to write articles based on real, publicly verifiable information
about each town — things like recent municipal decisions, school events,
weather impacts, local businesses, community organizations, etc.

All articles are based on the kind of information that would be public record
or common knowledge in the community.

Usage:
    ANTHROPIC_API_KEY=sk-ant-... python scripts/generate_town_articles.py
    ANTHROPIC_API_KEY=sk-ant-... python scripts/generate_town_articles.py --town cairo_il
    ANTHROPIC_API_KEY=sk-ant-... python scripts/generate_town_articles.py --dry-run
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import anthropic

ARTICLES_DIR = Path(__file__).parent / "generated_articles"
SEED_OWNER_ID = "00000000-0000-0000-0000-000000000001"

TAGS = {
    "council": 1 << 0,
    "schools": 1 << 1,
    "business": 1 << 2,
    "events": 1 << 3,
    "sports": 1 << 4,
    "community": 1 << 5,
    "culture": 1 << 6,
    "safety": 1 << 7,
    "health": 1 << 8,
    "environment": 1 << 9,
}

# Towns that need articles, with real context for Claude
TOWNS = {
    # === US TOWNS ===
    "cairo_il": {
        "name": "Cairo",
        "slug": "cairo-il",
        "state": "Illinois",
        "country": "US",
        "lat": 37.0053,
        "lng": -89.1765,
        "population": 1733,
        "context": (
            "Cairo is at the confluence of the Ohio and Mississippi rivers in Alexander County, Illinois. "
            "Once had 15,000+ people, now under 2,000. The Cairo Citizen newspaper closed decades ago. "
            "The town has been dealing with urban decay, infrastructure issues, and HUD demolished public housing. "
            "There's ongoing discussion about river flooding, the Fort Defiance state park at the rivers' confluence, "
            "and community efforts to revitalize downtown. Alexander County has a school district. "
            "The town has historical significance in the Civil War."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "bardstown_ky": {
        "name": "Bardstown",
        "slug": "bardstown-ky",
        "state": "Kentucky",
        "country": "US",
        "lat": 37.8092,
        "lng": -85.4669,
        "population": 13500,
        "context": (
            "Bardstown is the 'Bourbon Capital of the World' in Nelson County, Kentucky. "
            "The Kentucky Standard newspaper has been reduced. "
            "Major bourbon distilleries include Jim Beam, Maker's Mark, Heaven Hill. "
            "The town hosts bourbon tourism, has My Old Kentucky Home state park, "
            "and a historic downtown. Nelson County Schools serve the area. "
            "Spring tourism season brings visitors for the bourbon trail."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "centralia_wa": {
        "name": "Centralia",
        "slug": "centralia-wa",
        "state": "Washington",
        "country": "US",
        "lat": 46.7162,
        "lng": -122.9543,
        "population": 18400,
        "context": (
            "Centralia is in Lewis County, Washington, between Seattle and Portland on I-5. "
            "The Chronicle newspaper has been reduced. "
            "The town has a historic downtown, Centralia College (community college), "
            "and is known for the Borst Park area. The Chehalis River runs through the area "
            "and flooding is a recurring concern. Lewis County has been working on flood mitigation. "
            "Centralia Tigers are the high school team."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "elkin_nc": {
        "name": "Elkin",
        "slug": "elkin-nc",
        "state": "North Carolina",
        "country": "US",
        "lat": 36.2443,
        "lng": -80.8484,
        "population": 4000,
        "context": (
            "Elkin is a small town in Surry County, North Carolina, in the foothills of the Blue Ridge Mountains. "
            "The Elkin Tribune closed in 2024. "
            "Known for its wineries (Yadkin Valley wine region), Stone Mountain State Park nearby, "
            "and the Yadkin River. Elkin has a revitalized downtown with local shops and restaurants. "
            "The town hosts seasonal festivals. Elkin City Schools serve the community."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "ely_nv": {
        "name": "Ely",
        "slug": "ely-nv",
        "state": "Nevada",
        "country": "US",
        "lat": 39.2474,
        "lng": -114.8886,
        "population": 4000,
        "context": (
            "Ely is the county seat of White Pine County, Nevada, on the loneliest road in America (US-50). "
            "The Ely Times has been reduced in coverage. "
            "Known for the Nevada Northern Railway museum (operating historic steam trains), "
            "Great Basin National Park nearby, and copper mining history. "
            "The town serves as a regional hub for rural eastern Nevada. "
            "White Pine County School District serves the area."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "galax_va": {
        "name": "Galax",
        "slug": "galax-va",
        "state": "Virginia",
        "country": "US",
        "lat": 36.6612,
        "lng": -80.9237,
        "population": 6700,
        "context": (
            "Galax is an independent city in southwestern Virginia, near the Blue Ridge Parkway. "
            "The Galax Gazette closed in 2023. "
            "Known as the 'World's Capital of Old-Time Mountain Music.' "
            "Hosts the Old Fiddlers' Convention annually (one of the oldest in the world). "
            "The New River Trail State Park runs through the area. "
            "Galax has a manufacturing history and is working on economic transition."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "millinocket_me": {
        "name": "Millinocket",
        "slug": "millinocket-me",
        "state": "Maine",
        "country": "US",
        "lat": 45.6572,
        "lng": -68.7098,
        "population": 4000,
        "context": (
            "Millinocket is in Penobscot County, Maine, the gateway to Baxter State Park and Mount Katahdin. "
            "The Katahdin Times closed in 2023. "
            "The town was built around paper mills (Great Northern Paper) which closed. "
            "Now transitioning to outdoor recreation tourism with Katahdin Woods and Waters National Monument. "
            "Community is working on revitalization, new businesses opening downtown. "
            "Stearns High School serves the community."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "orangeburg_sc": {
        "name": "Orangeburg",
        "slug": "orangeburg-sc",
        "state": "South Carolina",
        "country": "US",
        "lat": 33.4918,
        "lng": -80.8556,
        "population": 12800,
        "context": (
            "Orangeburg is the county seat of Orangeburg County, South Carolina. "
            "The Times and Democrat newspaper has been reduced. "
            "Home to South Carolina State University (HBCU) and Claflin University. "
            "The Edisto Memorial Gardens is a popular local attraction. "
            "Orangeburg has been working on downtown revitalization and economic development. "
            "The city has a strong African American heritage and community."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "paintsville_ky": {
        "name": "Paintsville",
        "slug": "paintsville-ky",
        "state": "Kentucky",
        "country": "US",
        "lat": 37.8145,
        "lng": -82.8071,
        "population": 3500,
        "context": (
            "Paintsville is the county seat of Johnson County in eastern Kentucky, in Appalachian coal country. "
            "The Paintsville Herald closed in 2024. "
            "Known as the birthplace of country artists like Loretta Lynn (nearby Butcher Hollow) and Crystal Gayle. "
            "The US 23 Country Music Highway Museum is a local attraction. "
            "Paintsville Lake State Park is nearby. Coal industry decline has affected the local economy."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "vinton_oh": {
        "name": "McArthur",
        "slug": "mcarthur-oh",
        "state": "Ohio",
        "country": "US",
        "lat": 39.2462,
        "lng": -82.4782,
        "population": 1700,
        "context": (
            "McArthur is the county seat of Vinton County, the least populated county in Ohio. "
            "The Vinton County Courier closed in 2023. "
            "Located in the Appalachian foothills with Wayne National Forest nearby. "
            "Lake Hope State Park is a local recreation area. "
            "The county has high poverty rates and limited infrastructure. "
            "Vinton County Local Schools serve the area."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "wauchula_fl": {
        "name": "Wauchula",
        "slug": "wauchula-fl",
        "state": "Florida",
        "country": "US",
        "lat": 27.5478,
        "lng": -81.8112,
        "population": 5600,
        "context": (
            "Wauchula is the county seat of Hardee County in central Florida. "
            "The Herald-Advocate has been reduced in coverage. "
            "An agricultural community known for citrus and cattle ranching. "
            "Peace River runs through the area. The county has a significant Hispanic/Latino population. "
            "Hardee County Schools serve the community. "
            "The annual Hardee County Fair is a major local event."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "owsley_ky": {
        "name": "Booneville",
        "slug": "booneville-ky",
        "state": "Kentucky",
        "country": "US",
        "lat": 37.4767,
        "lng": -83.6749,
        "population": 80,
        "context": (
            "Booneville is the county seat of Owsley County, historically the poorest county in Kentucky. "
            "There has been no local newspaper. Population of the county is about 4,400. "
            "Located in the Daniel Boone National Forest area. "
            "The South Fork of the Kentucky River runs through the county. "
            "Owsley County Schools serve the community. The area has Appalachian heritage. "
            "Community organizations work on food security and economic development."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "washington_me": {
        "name": "Machias",
        "slug": "machias-me",
        "state": "Maine",
        "country": "US",
        "lat": 44.7150,
        "lng": -67.4614,
        "population": 2000,
        "context": (
            "Machias is the county seat of Washington County, the easternmost county in the US. "
            "The Valley News Observer has been reduced. "
            "Home to the University of Maine at Machias. Known for wild blueberry industry "
            "and the annual Machias Wild Blueberry Festival. "
            "The Machias River is famous for Atlantic salmon. "
            "The town has historical significance — the first naval battle of the American Revolution happened here."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "madison_fl": {
        "name": "Madison",
        "slug": "madison-fl",
        "state": "Florida",
        "country": "US",
        "lat": 30.4694,
        "lng": -83.4130,
        "population": 2800,
        "context": (
            "Madison is the county seat of Madison County in northern Florida, part of the Big Bend region. "
            "The Enterprise-Recorder has been reduced. "
            "An agricultural community with timber and farming. "
            "North Florida Community College serves the area. "
            "The county has historic homes and is on the old Spanish Trail. "
            "The Suwannee River borders the county to the west."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "perry_tn": {
        "name": "Linden",
        "slug": "linden-tn",
        "state": "Tennessee",
        "country": "US",
        "lat": 35.6170,
        "lng": -87.8394,
        "population": 900,
        "context": (
            "Linden is the county seat of Perry County, Tennessee, one of the smallest counties in the state. "
            "Minimal newspaper coverage exists. "
            "Located along the Buffalo River (one of the last free-flowing rivers in Tennessee). "
            "Mousetail Landing State Park is nearby on the Tennessee River. "
            "Perry County Schools serve the community. "
            "The area is known for outdoor recreation — canoeing, fishing, hunting."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "pike_ky": {
        "name": "Pikeville",
        "slug": "pikeville-ky",
        "state": "Kentucky",
        "country": "US",
        "lat": 37.4793,
        "lng": -82.5188,
        "population": 7000,
        "context": (
            "Pikeville is the county seat of Pike County, the largest county in Kentucky by area. "
            "The Appalachian News-Express has been reduced. "
            "Known for the Hatfield-McCoy feud history and the Pikeville Cut-Through (massive engineering project). "
            "Home to the University of Pikeville. "
            "The coal industry has declined but the town is working on tourism and education-based economy. "
            "Pikeville Medical Center is a major employer."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "white_tn": {
        "name": "Sparta",
        "slug": "sparta-tn",
        "state": "Tennessee",
        "country": "US",
        "lat": 35.9259,
        "lng": -85.4644,
        "population": 5000,
        "context": (
            "Sparta is the county seat of White County, Tennessee, on the Upper Cumberland Plateau. "
            "The Sparta Expositor has been reduced. "
            "Known for the nearby Rock Island State Park with its waterfalls and the Caney Fork River. "
            "Home to Lester Flatt (bluegrass legend). "
            "The town has been working on downtown revitalization. "
            "White County High School Warriors are the local team."
        ),
        "lang": "en",
        "article_count": 3,
    },
    "up_michigan": {
        "name": "Marquette",
        "slug": "marquette-mi",
        "state": "Michigan",
        "country": "US",
        "lat": 46.5436,
        "lng": -87.3954,
        "population": 20600,
        "context": (
            "Marquette is the largest city in Michigan's Upper Peninsula, on the shore of Lake Superior. "
            "Multiple UP newspapers have closed or been reduced. "
            "Home to Northern Michigan University. "
            "Known for outdoor recreation (skiing, hiking, kayaking), iron ore mining history, "
            "and the UP's distinct Yooper culture. "
            "Presque Isle Park is a beloved local landmark. "
            "The UP 200 sled dog race passes through the area."
        ),
        "lang": "en",
        "article_count": 3,
    },
    # === FINNISH TOWNS ===
    "kauhajoki": {
        "name": "Kauhajoki",
        "slug": "kauhajoki",
        "state": "Etelä-Pohjanmaa",
        "country": "FI",
        "lat": 62.4319,
        "lng": 22.1770,
        "population": 13000,
        "context": (
            "Kauhajoki on Etelä-Pohjanmaan kunta. Paikallislehden kattavuus on vähentynyt. "
            "Tunnettu hyypänjokilaaksosta, maataloudesta ja Kauhajoen ampumavälikohtauksen muistosta (2008). "
            "Kauhajoen kampuksella toimii ammattikorkeakoulu (SeAMK). "
            "Kunnassa on aktiivinen urheiluseura- ja yhdistystoiminta. "
            "Alueen talous perustuu maatalouteen, elintarviketeollisuuteen ja koulutukseen."
        ),
        "lang": "fi",
        "article_count": 4,
    },
    "salla": {
        "name": "Salla",
        "slug": "salla",
        "state": "Lappi",
        "country": "FI",
        "lat": 66.8310,
        "lng": 28.6670,
        "population": 3300,
        "context": (
            "Salla on Lapin kunta lähellä Venäjän rajaa. Kunnassa ei ole yhtään toimittajaa. "
            "Tunnettu Sallatunturin hiihtokeskuksesta, erämaista ja Sallan kansallispuistosta (perustettu 2022). "
            "Salla haki humoristisesti vuoden 2032 olympialaisia korostaakseen ilmastonmuutosta. "
            "Matkailu ja poronhoito ovat tärkeitä elinkeinoja. "
            "Kunta kamppailee väestökadon kanssa."
        ),
        "lang": "fi",
        "article_count": 4,
    },
    "enontekio": {
        "name": "Enontekiö",
        "slug": "enontekio",
        "state": "Lappi",
        "country": "FI",
        "lat": 68.3833,
        "lng": 23.6333,
        "population": 1800,
        "context": (
            "Enontekiö on Suomen luoteiskulman kunta Lapissa, rajanaapurina Norja ja Ruotsi. "
            "Kunnassa ei ole paikallislehteä lainkaan. "
            "Käsivarren erämaa-alue ja Halti (Suomen korkein kohta) sijaitsevat kunnassa. "
            "Saamelaiskulttuuri on vahvasti läsnä. Hetta on kunnan keskustaajama. "
            "Porotalous, matkailu ja kalastus ovat pääelinkeinoja. "
            "Kunta on yksi Suomen harvimmin asutuista."
        ),
        "lang": "fi",
        "article_count": 4,
    },
}

# Region/state IDs for US locations (reuse from existing seed_data_us.json)
US_REGIONS = {
    "Illinois": {"id": "b2000014-0000-0000-0000-000000000001"},
    "Kentucky": {"id": "b2000005-0000-0000-0000-000000000001"},
    "Washington": {"id": "b2000015-0000-0000-0000-000000000001"},
    "North Carolina": {"id": "b2000009-0000-0000-0000-000000000001"},
    "Nevada": {"id": "b2000016-0000-0000-0000-000000000001"},
    "Virginia": {"id": "b2000010-0000-0000-0000-000000000001"},
    "Maine": {"id": "b2000017-0000-0000-0000-000000000001"},
    "South Carolina": {"id": "b2000018-0000-0000-0000-000000000001"},
    "Florida": {"id": "b2000011-0000-0000-0000-000000000001"},
    "Ohio": {"id": "b2000019-0000-0000-0000-000000000001"},
    "Tennessee": {"id": "b2000004-0000-0000-0000-000000000001"},
    "Michigan": {"id": "b2000020-0000-0000-0000-000000000001"},
}

FI_REGIONS = {
    "Etelä-Pohjanmaa": {"id": "a2000004-0000-0000-0000-000000000001"},
    "Lappi": {"id": "a2000002-0000-0000-0000-000000000001"},
}


def generate_articles_prompt(town_info):
    """Build the Claude prompt for generating articles about a town."""
    lang = town_info["lang"]
    n = town_info["article_count"]

    if lang == "fi":
        return f"""Olet paikallislehden toimittaja paikkakunnalla {town_info['name']}, {town_info['state']}, Suomi.

Kirjoita {n} paikallista uutisartikkelia, jotka voisivat olla ajankohtaisia maaliskuussa 2026.

TAUSTATIEDOT PAIKKAKUNNASTA:
{town_info['context']}

SÄÄNNÖT:
- Kirjoita suomeksi
- Artikkelien tulee perustua todennäköisiin, uskottaviin tapahtumiin jotka voisivat tapahtua tällä paikkakunnalla
- Käytä yleisiä paikkakuntaan liittyviä teemoja: kunnanvaltuusto, koulut, urheilu, tapahtumat, yritykset, luonto, turvallisuus
- Paikallislehden tyyli: selkeä, suora, informatiivinen
- Älä keksi tarkkoja henkilönimiä paitsi julkisia tahoja (kunta, koulu, yhdistykset)
- Artikkelien tulee olla eri aiheista

VASTAA PELKÄLLÄ JSON-MUODOLLA (ei muuta tekstiä):
[
  {{
    "headline": "Lyhyt otsikko (max 80 merkkiä)",
    "summary": "1-2 lauseen tiivistelmä",
    "blocks": [
      {{"type": "text", "content": "Aloituskappale..."}},
      {{"type": "text", "content": "Jatkokappale..."}},
      {{"type": "text", "content": "Lopetuskappale..."}}
    ],
    "category": "council|schools|business|events|sports|community|culture|safety|health|environment",
    "tags": ["category1", "category2"]
  }},
  ...
]"""
    else:
        return f"""You are a local news journalist for {town_info['name']}, {town_info['state']}.

Write {n} local news articles that could be current in March 2026.

TOWN CONTEXT:
{town_info['context']}
Population: {town_info['population']}

RULES:
- Write in English
- Articles should be based on plausible, realistic events that could happen in this town
- Use common local themes: city council, schools, sports, events, businesses, weather, community organizations
- Local news tone: clear, direct, informative
- Do NOT invent specific personal names — use roles like "the mayor," "a local business owner," or reference real institutions (the school district, city council, parks department)
- Each article must cover a DIFFERENT topic
- Make them feel hyperlocal — mention real landmarks, geography, institutions from the context

OUTPUT FORMAT (respond with valid JSON only, no other text):
[
  {{
    "headline": "Short headline (max 80 chars)",
    "summary": "1-2 sentence summary for article cards",
    "blocks": [
      {{"type": "text", "content": "Lead paragraph..."}},
      {{"type": "text", "content": "Body paragraph with context..."}},
      {{"type": "text", "content": "Closing paragraph..."}}
    ],
    "category": "council|schools|business|events|sports|community|culture|safety|health|environment",
    "tags": ["category1", "category2"]
  }},
  ...
]"""


def generate_for_town(client, town_key, town_info):
    """Generate articles for a single town."""
    prompt = generate_articles_prompt(town_info)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = response.content[0].text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    articles_data = json.loads(response_text)
    now = datetime.now(timezone.utc)

    # Build location
    is_fi = town_info["country"] == "FI"
    city_id = f"c1{town_key[:6]}-0000-0000-0000-000000000001"

    if is_fi:
        region_info = FI_REGIONS.get(town_info["state"], {"id": "a2000099-0000-0000-0000-000000000001"})
        country_id = "a3000001-0000-0000-0000-000000000001"  # Finland
        continent_id = "a4000001-0000-0000-0000-000000000001"  # Europe
    else:
        region_info = US_REGIONS.get(town_info["state"], {"id": "b2000099-0000-0000-0000-000000000001"})
        country_id = "b3000001-0000-0000-0000-000000000001"  # US
        continent_id = "b4000001-0000-0000-0000-000000000001"  # North America

    location = {
        "id": city_id,
        "name": town_info["name"],
        "slug": town_info["slug"],
        "level": 3,
        "lat": town_info["lat"],
        "lng": town_info["lng"],
        "region_id": region_info["id"],
        "country_id": country_id,
        "continent_id": continent_id,
        "meta": {
            "population": town_info["population"],
            "state": town_info["state"],
        },
    }

    submissions = []
    for i, article in enumerate(articles_data):
        tag_bits = 0
        for tag_name in article.get("tags", []):
            if tag_name.lower() in TAGS:
                tag_bits |= TAGS[tag_name.lower()]

        submission = {
            "id": str(uuid.uuid4()),
            "owner_id": SEED_OWNER_ID,
            "location_id": city_id,
            "continent_id": continent_id,
            "country_id": country_id,
            "region_id": region_info["id"],
            "city_id": city_id,
            "lat": town_info["lat"],
            "lng": town_info["lng"],
            "title": article["headline"],
            "description": article.get("summary", ""),
            "tags": tag_bits,
            "status": 5,  # StatusPublished
            "error": 0,
            "views": 0,
            "share_count": 0,
            "reactions": {},
            "meta": {
                "blocks": article.get("blocks", []),
                "review": {"score": 75, "flags": [], "approved": True},
                "summary": article.get("summary", ""),
                "category": article.get("category", "community"),
                "model": "claude-sonnet-4-20250514",
                "generated_at": now.isoformat(),
                "slug": f"{town_info['slug']}-{i+1:03d}",
                "featured_img": "",
                "sources": ["Public information"],
                "published_at": now.isoformat(),
                "published_by": SEED_OWNER_ID,
            },
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        submissions.append(submission)

    return location, submissions


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    single_town = None
    if "--town" in args:
        idx = args.index("--town")
        if idx + 1 < len(args):
            single_town = args[idx + 1]

    towns_to_process = TOWNS
    if single_town:
        if single_town not in TOWNS:
            print(f"Unknown town: {single_town}")
            print(f"Available: {', '.join(TOWNS.keys())}")
            sys.exit(1)
        towns_to_process = {single_town: TOWNS[single_town]}

    if dry_run:
        print(f"Would generate articles for {len(towns_to_process)} towns:")
        total = 0
        for key, info in towns_to_process.items():
            print(f"  {key}: {info['name']}, {info['state']} — {info['article_count']} articles ({info['lang']})")
            total += info["article_count"]
        print(f"\nTotal: {total} articles")
        return

    client = anthropic.Anthropic(api_key=api_key)
    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)

    all_locations = []
    all_submissions = []

    for key, info in towns_to_process.items():
        print(f"\n{'='*50}")
        print(f"Generating {info['article_count']} articles for {info['name']}, {info['state']}...")
        print(f"{'='*50}")

        try:
            location, submissions = generate_for_town(client, key, info)
            all_locations.append(location)
            all_submissions.extend(submissions)

            for s in submissions:
                print(f"  -> {s['title']}")
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()

    # Save
    seed_data = {
        "locations": all_locations,
        "submissions": all_submissions,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(all_submissions),
    }

    output_file = ARTICLES_DIR / "seed_data_new_towns.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(seed_data, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n\nGenerated {len(all_submissions)} articles across {len(all_locations)} towns -> {output_file}")

    # Readable version
    readable_file = ARTICLES_DIR / "new_towns_readable.md"
    with open(readable_file, "w", encoding="utf-8") as f:
        for art in all_submissions:
            f.write(f"# {art['title']}\n\n")
            f.write(f"*{art['description']}*\n\n")
            f.write(f"**Category:** {art['meta']['category']}\n\n")
            for block in art["meta"]["blocks"]:
                if block["type"] == "text":
                    f.write(f"{block['content']}\n\n")
                elif block["type"] == "quote":
                    f.write(f"> \"{block['content']}\" — {block.get('author', '')}\n\n")
                elif block["type"] == "heading":
                    f.write(f"## {block['content']}\n\n")
            f.write(f"---\n\n")

    print(f"Readable version -> {readable_file}")


if __name__ == "__main__":
    main()
