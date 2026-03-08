"""
Facebook Group Poster — AI-powered outreach for news desert communities.

Uses Claude to generate personalized, authentic posts for Facebook groups
in towns that have lost their local newspaper, then posts them via Playwright.

Usage:
    python scripts/fb_poster.py --dry-run                  # Preview all posts
    python scripts/fb_poster.py --fi --dry-run              # Preview Finnish posts only
    python scripts/fb_poster.py --us --dry-run              # Preview US posts only
    python scripts/fb_poster.py --town chesterton           # Post to one group
    python scripts/fb_poster.py --town chesterton --dry-run # Preview one
    python scripts/fb_poster.py --all                       # Post to ALL groups
    python scripts/fb_poster.py --us                        # Post to all US groups
    python scripts/fb_poster.py --fi                        # Post to all Finnish groups
    python scripts/fb_poster.py --town karkkila --message "Custom text here"

Requires:
    pip install playwright anthropic python-dotenv
    ANTHROPIC_API_KEY in environment or ../.env
"""

import asyncio
import json
import os
import sys
import random
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from playwright.async_api import async_playwright

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

USER_DATA_DIR = Path(__file__).parent / ".fb_session"
LOG_DIR = Path(__file__).parent / "fb_output" / "post_log"

# ===================================================================
# TARGET GROUPS
# ===================================================================

TARGETS_FI = {
    "karkkila": {
        "group_url": "https://www.facebook.com/groups/452718004818697",
        "group_name": "Karkkilan Puskaradio",
        "town": "Karkkila",
        "population": "~9,000",
        "newspaper_death": "Karkkilan Tienoo lakkautettiin 2022",
        "newspaper_context": "Karkkilan Tienoo lakkautettiin vuonna 2022. Tilalle tuli Karkkilalainen, mutta julkaisutahti on hidas.",
        "article_count": 10,
        "sample_articles": [
            "Karkkila pyorailee maailmankartalle — joukkue mukaan kansainvaliseen kampanjaan",
            "Ravintola Noki julkaisi viikon lounasmenun",
            "Tarvitaanko Karkkilassa lisaa livemusiikkia?",
        ],
        "site_url": "https://port.news/explore?town=karkkila",
        "lang": "fi",
    },
    "loviisa": {
        "group_url": "https://www.facebook.com/groups/724474857744688",
        "group_name": "Loviisan Puskaradio",
        "town": "Loviisa",
        "population": "~15,000",
        "newspaper_death": "Loviisan Sanomat leikattiin yhteen numeroon viikossa 2024",
        "newspaper_context": "Loviisan Sanomat leikkasi ilmestymisen kahdesta numerosta yhteen viikossa huhtikuussa 2024.",
        "article_count": 7,
        "sample_articles": [
            "Loviisan kevaan 2026 kulttuuriavustushaku on avattu",
            "Vanhus sai parkkisakon kiekkokoneelta",
            "LoviSavi avaa keramiikkapajan ovet",
        ],
        "site_url": "https://port.news/explore?town=loviisa",
        "lang": "fi",
    },
    "kemi": {
        "group_url": "https://www.facebook.com/groups/239350891413816",
        "group_name": "Puskaradio Meri-Lappi",
        "town": "Kemi",
        "population": "~21,000",
        "newspaper_death": "Lapin Kansalla toimittajia vain 3/21 kunnassa",
        "newspaper_context": "Lapin Kansalla on toimittajia vain kolmessa Lapin kunnassa. Meri-Lapin paikallisuutiset ovat vahentyneet merkittavasti.",
        "article_count": 7,
        "sample_articles": [
            "Jatskiauto palaa Tornion ja Kemin kaduille — kausi 2026 kaynnistyy",
            "Flunssa-aalto jyllaa Meri-Lapissa",
            "Tuulivoimaloiden purkaminen huolettaa",
        ],
        "site_url": "https://port.news/explore?town=kemi",
        "lang": "fi",
    },
    "turku": {
        "group_url": "https://www.facebook.com/groups/1415985608703080",
        "group_name": "Puskaradio Turku",
        "town": "Turku",
        "population": "~200,000",
        "newspaper_death": "Turkulainen lopetti 2020",
        "newspaper_context": "Turkulainen-lehti lopetti ilmestymisen vuonna 2020 eika palannut. Turun Sanomat on ainoa paivittainen, mutta kallis.",
        "article_count": 9,
        "sample_articles": [
            "Kaupunkikoysirata — voisiko se toimia Turussa?",
            "Ratikka-aanestys kuumentaa tunteita Turussa",
            "Aggressiivinen kaytos Turun kauppakeskuksen pihalla",
        ],
        "site_url": "https://port.news/explore?town=turku",
        "lang": "fi",
    },
    "kauhajoki": {
        "group_url": "https://www.facebook.com/groups/244628339562154",
        "group_name": "Kauhajoen Puskaradio",
        "town": "Kauhajoki",
        "population": "~13,000",
        "newspaper_death": "Kauhajoki-lehden ilmestymista leikattu",
        "newspaper_context": "Kauhajoen paikallislehden resurssit ovat kutistuneet. Etela-Pohjanmaan paikallisuutisointi on vahentynyt konserniomistusten myota.",
        "article_count": 4,
        "sample_articles": [
            "Kauhajoen kampukselle uusi lahiruokakahvila syksylla",
            "Kauhajoen kunnanvaltuusto hyvaksyi uuden liikuntahallin suunnitelman",
            "Hyypanjokilaakson kevattulvat jaivat odotettua pienemmiksi",
        ],
        "site_url": "https://port.news/explore?town=kauhajoki",
        "lang": "fi",
    },
    "salla": {
        "group_url": "https://www.facebook.com/groups/sallanpuskaradio",
        "group_name": "Sallan Puskaradio",
        "town": "Salla",
        "population": "~3,400",
        "newspaper_death": "Ei paikallista toimittajaa",
        "newspaper_context": "Sallassa ei ole yhtaan paikallista toimittajaa. Lahin sanomalehti on Lapin Kansa Rovaniemelta.",
        "article_count": 4,
        "sample_articles": [
            "Sallan kansallispuiston kavijamaaara kasvoi kolmanneksen",
            "Sallatunturin hiihtokeskus investoi lumetusjarjestelmaan",
            "Sallan kunnanvaltuusto kasitteli palveluverkon tulevaisuutta",
        ],
        "site_url": "https://port.news/explore?town=salla",
        "lang": "fi",
    },
    "enontekio": {
        "group_url": "https://www.facebook.com/groups/enontekio",
        "group_name": "Enontekio",
        "town": "Enontekio",
        "population": "~1,800",
        "newspaper_death": "Ei paikallislehteä",
        "newspaper_context": "Enontekiossa ei ole paikallislehteä eika paikallista toimittajaa. Kunnan uutiset jaavat kertomatta.",
        "article_count": 4,
        "sample_articles": [
            "Hetan koulun oppilaat oppivat saamen kielta uudella menetelmalla",
            "Kasivarren eramaa-alueelle uusi varaustupa retkeilijöille",
            "Enontekion kunta selvittaa tuulivoimahankkeen vaikutuksia porotalouteen",
        ],
        "site_url": "https://port.news/explore?town=enontekio",
        "lang": "fi",
    },
}

TARGETS_US = {
    "chesterton": {
        "group_url": "https://www.facebook.com/groups/1310048543015480",
        "group_name": "Chesterton Community",
        "town": "Chesterton",
        "state": "Indiana",
        "population": "~14,800",
        "newspaper_death": "Chesterton Tribune closed in 2025 after 141 years",
        "newspaper_context": "The 141-year-old Chesterton Tribune ceased publication in 2025, leaving Porter County without a dedicated local paper.",
        "article_count": 6,
        "sample_articles": [
            "Feed the Region serves free community meals in Northwest Indiana",
            "Bloomstead Bakery draws crowds as local farm stand scene thrives",
            "Local cat rescue Chevy2.0 seeks forever homes in Porter County",
        ],
        "site_url": "https://port.news/explore?town=chesterton",
        "lang": "en",
    },
    "chesterton_2": {
        "group_url": "https://www.facebook.com/groups/1019539965217856",
        "group_name": "NWI Community Board",
        "town": "Chesterton / NWI",
        "state": "Indiana",
        "population": "~14,800",
        "newspaper_death": "Chesterton Tribune closed in 2025 after 141 years",
        "newspaper_context": "The 141-year-old Chesterton Tribune ceased publication in 2025. Northwest Indiana lost its most local voice.",
        "article_count": 6,
        "sample_articles": [
            "Rideshare drivers in NWI ask community to consider tipping",
            "Feed the Region serves free community meals",
            "Bloomstead Bakery draws crowds as farm stand scene thrives",
        ],
        "site_url": "https://port.news/explore?town=chesterton",
        "lang": "en",
    },
    "claremont": {
        "group_url": "https://www.facebook.com/groups/1643916112533624",
        "group_name": "Claremont NH Community",
        "town": "Claremont",
        "state": "New Hampshire",
        "population": "~13,000",
        "newspaper_death": "Eagle Times suspended operations in 2025",
        "newspaper_context": "The Eagle Times suspended operations in 2025, creating a rare New England news desert in Sullivan County.",
        "article_count": 5,
        "sample_articles": [
            "Storm damage and sudden thaw hit Claremont homeowners hard",
            "Girl Scout cookie season brings community together at The Apiary",
            "Abenaki Nation seeks grant writer to support tribal programs in NH",
        ],
        "site_url": "https://port.news/explore?town=claremont",
        "lang": "en",
    },
    "laurel": {
        "group_url": "https://www.facebook.com/groups/2264986530399664",
        "group_name": "Laurel / Jones County Community",
        "town": "Laurel",
        "state": "Mississippi",
        "population": "~17,500",
        "newspaper_death": "Laurel Leader-Call closed January 2025 after 100 years",
        "newspaper_context": "The 100-year-old Laurel Leader-Call closed in January 2025, leaving the three-county Pine Belt area without paid circulation.",
        "article_count": 4,
        "sample_articles": [
            "Taylorsville Flea Market opens on Front Street, first auction set",
            "Little Light Children's Consignment draws families to Fair grounds",
            "Taylorsville Flea Market makes the newspaper as community rallies",
        ],
        "site_url": "https://port.news/explore?town=laurel",
        "lang": "en",
    },
    "spencer": {
        "group_url": "https://www.facebook.com/groups/vanburencountycommunitybulletin",
        "group_name": "Van Buren County Community Bulletin",
        "town": "Spencer",
        "state": "Tennessee",
        "population": "~1,600",
        "newspaper_death": "9 newspapers attempted since 1915, none survived",
        "newspaper_context": "Nine local newspapers have been attempted in Van Buren County since 1915 — none survived. The county's 6,200 residents rely on this Facebook group for all local news.",
        "article_count": 6,
        "sample_articles": [
            "Helicopter airlifts patient after emergency on SR 111",
            "Eaglettes rally community for white-out Substate basketball showdown",
            "Van Buren County student Lyla McCoy shines at statewide conference",
        ],
        "site_url": "https://port.news/explore?town=spencer",
        "lang": "en",
    },
    "harlan": {
        "group_url": "https://www.facebook.com/groups/HarlanCountyKY",
        "group_name": "Harlan County KY",
        "town": "Harlan",
        "state": "Kentucky",
        "population": "~26,000 (county)",
        "newspaper_death": "Harlan Daily Enterprise severely reduced",
        "newspaper_context": "The Harlan Daily Enterprise has been gutted by corporate ownership. Staff slashed, coverage reduced to wire stories. Harlan County deserves better.",
        "article_count": 2,
        "sample_articles": [
            "Auto body shop in Pound offers spring paint specials",
            "New house cleaning service launches in Harlan County",
        ],
        "site_url": "https://port.news/explore?town=harlan",
        "lang": "en",
    },
    "mcdowell": {
        "group_url": "https://www.facebook.com/groups/McDowellCountyNC",
        "group_name": "McDowell County NC",
        "town": "Marion",
        "state": "North Carolina",
        "population": "~45,000 (county)",
        "newspaper_death": "McDowell News reduced to skeleton operation",
        "newspaper_context": "The McDowell News has been hollowed out under corporate ownership. Local coverage has given way to wire stories and regional filler.",
        "article_count": 2,
        "sample_articles": [
            "Specialty Tropicals greenhouse opens for spring season in Marion",
            "Indoor plant workshops coming to Marion",
        ],
        "site_url": "https://port.news/explore?town=marion-nc",
        "lang": "en",
    },
    "sussex": {
        "group_url": "https://www.facebook.com/groups/sussexcountyde",
        "group_name": "Sussex County DE",
        "town": "Georgetown",
        "state": "Delaware",
        "population": "~240,000 (county)",
        "newspaper_death": "Local papers consolidated and reduced",
        "newspaper_context": "Sussex County's local papers have been consolidated and reduced. Delaware's largest county by area is underserved by the remaining outlets.",
        "article_count": 3,
        "sample_articles": [
            "Church group knits chunky blankets for homeless in Sussex County",
            "Mobile addiction recovery vehicle seeks staff in Sussex County",
            "Fire safety alert: residents urged to clean dryer vents",
        ],
        "site_url": "https://port.news/explore?town=georgetown-de",
        "lang": "en",
    },
    "clayton": {
        "group_url": "https://www.facebook.com/groups/claytoncountyga",
        "group_name": "Clayton County GA",
        "town": "Jonesboro",
        "state": "Georgia",
        "population": "~300,000 (county)",
        "newspaper_death": "Clayton News went digital-only, severely reduced",
        "newspaper_context": "The Clayton News went digital-only and cut most local coverage. A county of 300,000 people south of Atlanta now has almost no dedicated local reporting.",
        "article_count": 3,
        "sample_articles": [
            "Clayton County sheriff candidate pledges '360 approach' to accountability",
            "Teen entrepreneur builds beauty clientele through social media",
            "DeKalb County 'Achieve the Dream' event rescheduled for March",
        ],
        "site_url": "https://port.news/explore?town=jonesboro-ga",
        "lang": "en",
    },
    "glendive": {
        "group_url": "https://www.facebook.com/groups/GlobeMiamiAZ",
        "group_name": "Glendive MT Community",
        "town": "Glendive",
        "state": "Montana",
        "population": "~5,000",
        "newspaper_death": "Ranger-Review reduced operations",
        "newspaper_context": "The Ranger-Review has been reduced and Dawson County's local coverage is thin. Eastern Montana is one of the largest news deserts in the country.",
        "article_count": 2,
        "sample_articles": [
            "New pediatric telehealth practice opens in Glendive",
            "Walk-in sports physicals offered at $30 as fall season approaches",
        ],
        "site_url": "https://port.news/explore?town=glendive",
        "lang": "en",
    },
    "hamlin": {
        "group_url": "https://www.facebook.com/groups/WestVirginiaSmallTowns",
        "group_name": "West Virginia Small Towns",
        "town": "Hamlin",
        "state": "West Virginia",
        "population": "~1,000",
        "newspaper_death": "Lincoln County papers closed",
        "newspaper_context": "Lincoln County has lost its local papers. Businesses have turned to social media as traditional advertising and news vanished.",
        "article_count": 1,
        "sample_articles": [
            "Lincoln County businesses turn to social media as traditional advertising vanishes",
        ],
        "site_url": "https://port.news/explore?town=hamlin-wv",
        "lang": "en",
    },
    "chesterfield_va": {
        "group_url": "https://www.facebook.com/groups/chesterfieldcountyva",
        "group_name": "Chesterfield County VA",
        "town": "Chesterfield",
        "state": "Virginia",
        "population": "~370,000 (county)",
        "newspaper_death": "Local coverage absorbed into Richmond papers",
        "newspaper_context": "Chesterfield County's dedicated local coverage has been absorbed into Richmond metro outlets. A county of 370,000 has no paper of its own.",
        "article_count": 1,
        "sample_articles": [
            "Local cleaning service expands in Chesterfield County as demand grows",
        ],
        "site_url": "https://port.news/explore?town=chesterfield-va",
        "lang": "en",
    },
    "perry_tn": {
        "group_url": "https://www.facebook.com/groups/perrycountytn",
        "group_name": "Perry County TN",
        "town": "Linden",
        "state": "Tennessee",
        "population": "~8,000 (county)",
        "newspaper_death": "Perry County has minimal local coverage",
        "newspaper_context": "Perry County, Tennessee has almost no local news coverage. The nearest daily paper is over an hour away.",
        "article_count": 3,
        "sample_articles": [
            "Buffalo River cleanup brings volunteers from across Perry County",
            "Perry County Schools celebrate state reading achievement recognition",
            "Mousetail Landing State Park campground reopens after winter upgrades",
        ],
        "site_url": "https://port.news/explore?town=linden-tn",
        "lang": "en",
    },
    "pike_ky": {
        "group_url": "https://www.facebook.com/groups/pikecountyky",
        "group_name": "Pike County KY",
        "town": "Pikeville",
        "state": "Kentucky",
        "population": "~58,000 (county)",
        "newspaper_death": "Appalachian News-Express reduced",
        "newspaper_context": "The Appalachian News-Express has cut staff and coverage. Eastern Kentucky's news infrastructure continues to erode.",
        "article_count": 3,
        "sample_articles": [
            "University of Pikeville opens new health sciences simulation lab",
            "Pikeville Cut-Through anniversary celebration planned for spring",
            "Pikeville Medical Center adds telehealth services for rural patients",
        ],
        "site_url": "https://port.news/explore?town=pikeville-ky",
        "lang": "en",
    },
    "white_tn": {
        "group_url": "https://www.facebook.com/groups/whitecountytn",
        "group_name": "White County TN",
        "town": "Sparta",
        "state": "Tennessee",
        "population": "~28,000 (county)",
        "newspaper_death": "Sparta Expositor reduced",
        "newspaper_context": "White County's local news options have dwindled as the Sparta Expositor has been reduced under corporate consolidation.",
        "article_count": 3,
        "sample_articles": [
            "Rock Island State Park records early spring tourism boost",
            "White County High School Warriors advance in regional basketball tournament",
            "Downtown Sparta mural project seeks community input on designs",
        ],
        "site_url": "https://port.news/explore?town=sparta-tn",
        "lang": "en",
    },
    # --- Additional US groups from scraped data ---
    "dawson_mt": {
        "group_url": "https://www.facebook.com/groups/DawsonCountyMT",
        "group_name": "Dawson County MT",
        "town": "Glendive",
        "state": "Montana",
        "population": "~5,000",
        "newspaper_death": "Ranger-Review reduced operations",
        "newspaper_context": "The Ranger-Review has been reduced and Dawson County's local coverage is thin. Eastern Montana is one of the largest news deserts in the country.",
        "article_count": 2,
        "sample_articles": [
            "New pediatric telehealth practice opens in Glendive",
            "Walk-in sports physicals offered at $30 as fall season approaches",
        ],
        "site_url": "https://port.news/explore?town=glendive",
        "lang": "en",
    },
    "lincoln_wv": {
        "group_url": "https://www.facebook.com/groups/LincolnCountyWV",
        "group_name": "Lincoln County WV",
        "town": "Hamlin",
        "state": "West Virginia",
        "population": "~20,000 (county)",
        "newspaper_death": "Lincoln County papers closed",
        "newspaper_context": "Lincoln County has lost its local papers. Businesses have turned to social media as traditional advertising and news vanished.",
        "article_count": 1,
        "sample_articles": [
            "Lincoln County businesses turn to social media as traditional advertising vanishes",
        ],
        "site_url": "https://port.news/explore?town=hamlin-wv",
        "lang": "en",
    },
    "madison_fl": {
        "group_url": "https://www.facebook.com/groups/MadisonCountyFL",
        "group_name": "Madison County FL",
        "town": "Madison",
        "state": "Florida",
        "population": "~18,000 (county)",
        "newspaper_death": "Madison Enterprise-Recorder reduced",
        "newspaper_context": "The Madison Enterprise-Recorder has been reduced. Madison County's local coverage is disappearing.",
        "article_count": 3,
        "sample_articles": [
            "North Florida Community College launches agricultural technology program",
            "Madison County historical society opens exhibit on Bellamy Road heritage",
            "Suwannee River water levels stable as spring dry season begins",
        ],
        "site_url": "https://port.news/explore?town=madison-fl",
        "lang": "en",
    },
    "bardstown_ky": {
        "group_url": "https://www.facebook.com/groups/bardstownky",
        "group_name": "Bardstown KY",
        "town": "Bardstown",
        "state": "Kentucky",
        "population": "~13,500",
        "newspaper_death": "Kentucky Standard reduced",
        "newspaper_context": "The Kentucky Standard has been reduced under corporate ownership. Bardstown's local coverage continues to shrink.",
        "article_count": 3,
        "sample_articles": [
            "Bardstown tourism board reports record bourbon trail visitors for early 2026",
            "Nelson County Schools announce new vocational training partnership",
            "My Old Kentucky Home state park opens renovated visitor center",
        ],
        "site_url": "https://port.news/explore?town=bardstown-ky",
        "lang": "en",
    },
    "centralia_wa": {
        "group_url": "https://www.facebook.com/groups/CentraliaChehalisWA",
        "group_name": "Centralia-Chehalis WA",
        "town": "Centralia",
        "state": "Washington",
        "population": "~17,500",
        "newspaper_death": "Chronicle reduced",
        "newspaper_context": "The Chronicle has been reduced. Lewis County's local news is thinner than ever.",
        "article_count": 3,
        "sample_articles": [
            "Lewis County flood mitigation project breaks ground along Chehalis River",
            "Centralia College launches cybersecurity certificate program",
            "Centralia Tigers baseball opens spring season with roster of returning starters",
        ],
        "site_url": "https://port.news/explore?town=centralia-wa",
        "lang": "en",
    },
    "elkin_nc": {
        "group_url": "https://www.facebook.com/groups/elkinnc",
        "group_name": "Elkin NC",
        "town": "Elkin",
        "state": "North Carolina",
        "population": "~4,000",
        "newspaper_death": "Elkin Tribune closed 2024",
        "newspaper_context": "The Elkin Tribune closed in 2024. Surry County lost another local voice.",
        "article_count": 3,
        "sample_articles": [
            "Downtown Elkin welcomes three new businesses as revitalization continues",
            "Surry County considers expanding broadband to underserved rural areas",
            "Yadkin Valley wineries prepare for spring open house weekend",
        ],
        "site_url": "https://port.news/explore?town=elkin-nc",
        "lang": "en",
    },
    "ely_nv": {
        "group_url": "https://www.facebook.com/groups/ElyNevada",
        "group_name": "Ely Nevada",
        "town": "Ely",
        "state": "Nevada",
        "population": "~4,000",
        "newspaper_death": "Ely Times reduced",
        "newspaper_context": "The Ely Times has been reduced. White Pine County is one of the most remote news deserts in America.",
        "article_count": 3,
        "sample_articles": [
            "Nevada Northern Railway announces expanded summer steam train schedule",
            "White Pine County School District seeks input on budget priorities",
            "Great Basin National Park reports high snowpack ahead of spring season",
        ],
        "site_url": "https://port.news/explore?town=ely-nv",
        "lang": "en",
    },
    "galax_va": {
        "group_url": "https://www.facebook.com/groups/galaxva",
        "group_name": "Galax VA",
        "town": "Galax",
        "state": "Virginia",
        "population": "~6,500",
        "newspaper_death": "Galax Gazette closed 2023",
        "newspaper_context": "The Galax Gazette closed in 2023. The Twin Counties of Grayson and Carroll lost their paper of record.",
        "article_count": 3,
        "sample_articles": [
            "Old Fiddlers' Convention announces 2026 lineup and expanded youth program",
            "New River Trail State Park sees record early-season trail use",
            "Galax city council discusses incentives for manufacturing site reuse",
        ],
        "site_url": "https://port.news/explore?town=galax-va",
        "lang": "en",
    },
    "millinocket_me": {
        "group_url": "https://www.facebook.com/groups/millinocketmaine",
        "group_name": "Millinocket Maine",
        "town": "Millinocket",
        "state": "Maine",
        "population": "~4,000",
        "newspaper_death": "Katahdin Times closed 2023",
        "newspaper_context": "The Katahdin Times closed in 2023. Millinocket and the Katahdin region lost their only local paper.",
        "article_count": 3,
        "sample_articles": [
            "New outdoor gear shop opens on Millinocket's main street",
            "Stearns High School robotics team qualifies for state competition",
            "Katahdin region trail crews begin spring maintenance ahead of hiking season",
        ],
        "site_url": "https://port.news/explore?town=millinocket-me",
        "lang": "en",
    },
    "orangeburg_sc": {
        "group_url": "https://www.facebook.com/groups/orangeburgsc",
        "group_name": "Orangeburg SC",
        "town": "Orangeburg",
        "state": "South Carolina",
        "population": "~12,600",
        "newspaper_death": "Times and Democrat reduced",
        "newspaper_context": "The Times and Democrat has been reduced. Orangeburg County's local coverage is a fraction of what it was.",
        "article_count": 3,
        "sample_articles": [
            "SC State University breaks ground on new student wellness center",
            "Edisto Memorial Gardens to host spring plant sale and garden festival",
            "Downtown Orangeburg streetscape project enters final phase",
        ],
        "site_url": "https://port.news/explore?town=orangeburg-sc",
        "lang": "en",
    },
    "cairo_il": {
        "group_url": "https://www.facebook.com/groups/whatshappeningincairoil",
        "group_name": "What's Happening in Cairo IL",
        "town": "Cairo",
        "state": "Illinois",
        "population": "~1,800",
        "newspaper_death": "Cairo Citizen closed decades ago",
        "newspaper_context": "Cairo lost its newspaper decades ago. A city of 1,800 at the southern tip of Illinois has had zero local news coverage for years.",
        "article_count": 3,
        "sample_articles": [
            "Cairo city council approves grant application for riverfront stabilization",
            "Alexander County food pantry sees 40% increase in families served",
            "Spring flooding watch issued for Cairo as rivers rise",
        ],
        "site_url": "https://port.news/explore?town=cairo-il",
        "lang": "en",
    },
    "paintsville_ky": {
        "group_url": "https://www.facebook.com/groups/paintsville",
        "group_name": "Paintsville KY",
        "town": "Paintsville",
        "state": "Kentucky",
        "population": "~3,500",
        "newspaper_death": "Paintsville Herald closed 2024",
        "newspaper_context": "The Paintsville Herald closed in 2024. Johnson County lost its only local newspaper.",
        "article_count": 3,
        "sample_articles": [
            "Country Music Highway Museum plans expanded Loretta Lynn exhibit",
            "Paintsville Lake State Park prepares for busy spring fishing season",
            "Johnson County Schools receive grant for after-school STEM program",
        ],
        "site_url": "https://port.news/explore?town=paintsville-ky",
        "lang": "en",
    },
    "up_michigan": {
        "group_url": "https://www.facebook.com/groups/UpperPeninsulaofMichigan",
        "group_name": "Upper Peninsula of Michigan",
        "town": "Upper Peninsula",
        "state": "Michigan",
        "population": "~300,000 (region)",
        "newspaper_death": "Multiple UP papers closed or reduced",
        "newspaper_context": "Multiple Upper Peninsula papers have closed or been gutted. A region the size of Connecticut has almost no local news coverage left.",
        "article_count": 3,
        "sample_articles": [
            "Northern Michigan University enrollment steady as UP economy diversifies",
            "Presque Isle Park trail restoration begins as snow recedes in Marquette",
            "UP Health System adds mental health providers to address regional shortage",
        ],
        "site_url": "https://port.news/explore?town=upper-peninsula-mi",
        "lang": "en",
    },
    "vinton_oh": {
        "group_url": "https://www.facebook.com/groups/vintonCountyOhio",
        "group_name": "Vinton County Ohio",
        "town": "McArthur",
        "state": "Ohio",
        "population": "~13,000 (county)",
        "newspaper_death": "Vinton County Courier closed 2023",
        "newspaper_context": "The Vinton County Courier closed in 2023. Ohio's least populated county has no local paper.",
        "article_count": 3,
        "sample_articles": [
            "Lake Hope State Park opens new accessible trail section",
            "Vinton County Local Schools launch free breakfast program for all students",
            "Volunteers clear trails in Wayne National Forest ahead of spring hiking",
        ],
        "site_url": "https://port.news/explore?town=mcarthur-oh",
        "lang": "en",
    },
    "wauchula_fl": {
        "group_url": "https://www.facebook.com/groups/wauchulaflorida",
        "group_name": "Wauchula Florida",
        "town": "Wauchula",
        "state": "Florida",
        "population": "~5,600",
        "newspaper_death": "Herald-Advocate reduced",
        "newspaper_context": "The Herald-Advocate has been reduced. Hardee County's local news is disappearing.",
        "article_count": 3,
        "sample_articles": [
            "Hardee County Fair returns with livestock shows, carnival rides, and local food",
            "Peace River water levels drop as dry season takes hold in Hardee County",
            "Hardee County Schools seek bilingual staff as student demographics shift",
        ],
        "site_url": "https://port.news/explore?town=wauchula-fl",
        "lang": "en",
    },
    "owsley_ky": {
        "group_url": "https://www.facebook.com/groups/OwsleyCountyKY",
        "group_name": "Owsley County KY",
        "town": "Booneville",
        "state": "Kentucky",
        "population": "~4,400 (county)",
        "newspaper_death": "No local paper",
        "newspaper_context": "Owsley County has no local newspaper. The poorest county in Kentucky has zero local news coverage.",
        "article_count": 3,
        "sample_articles": [
            "Community food hub opens in Booneville to improve access to fresh produce",
            "Owsley County students explore careers through Daniel Boone Forest partnership",
            "South Fork of Kentucky River draws spring kayakers to Owsley County",
        ],
        "site_url": "https://port.news/explore?town=booneville-ky",
        "lang": "en",
    },
    "washington_me": {
        "group_url": "https://www.facebook.com/groups/WashingtonCountyMaine",
        "group_name": "Washington County Maine",
        "town": "Machias",
        "state": "Maine",
        "population": "~31,000 (county)",
        "newspaper_death": "Machias Valley News Observer reduced",
        "newspaper_context": "Washington County is the poorest county in New England and its local news has been gutted. The easternmost point of the US has almost no coverage.",
        "article_count": 3,
        "sample_articles": [
            "University of Maine at Machias expands marine science offerings",
            "Wild blueberry growers in Washington County prepare for uncertain season",
            "Machias River salmon restoration effort enters new phase",
        ],
        "site_url": "https://port.news/explore?town=machias-me",
        "lang": "en",
    },
}

ALL_TARGETS = {**TARGETS_FI, **TARGETS_US}


# ===================================================================
# POST GENERATION
# ===================================================================

def _get_prompt_fi(target: dict) -> str:
    """Prompt for Finnish Facebook groups — conversion optimized."""
    articles_section = ""
    if target["article_count"] > 0 and target.get("sample_articles"):
        examples = "\n".join(f'  - "{a}"' for a in target["sample_articles"])
        articles_section = f"""

SIVUSTOLLA ON JO {target['article_count']} ARTIKKELIA {target['town'].upper()}STA, esim:
{examples}
Mainitse 1-2 naista nimelta julkaisussa — ne todistavat etta sisaltoa on oikeasti."""
    else:
        articles_section = f"""

SIVUSTO ON UUSI ja hakee ensimmaisia paikallisia uutisvinkkeja {target['town']}sta.
Ala vaita etta siella on artikkeleita jos ei ole. Sano sen sijaan etta sivusto on juuri avattu ja tarvitsee paikallisten apua."""

    return f"""Kirjoita lyhyt Facebook-julkaisu suomeksi paikalliseen ryhmaan "{target['group_name']}" ({target['town']}, {target['population']} asukasta).

TAUSTA: {target['newspaper_context']}

MITA PORT ON: Port on ilmainen paikallinen uutissivusto. Kuka tahansa voi lahettaa uutisvinkkeja (aaniviesti, kuva, teksti) ja tekoaly muokkaa niista artikkeleita.
{articles_section}

LINKKI: {target['site_url']}

SAANNOT (tarkat):
- Aloita suoraan asiasta. EI "Hei kaikki", "Moi", "Terve", tai mitaan geneerista aloitusta.
- Mainitse konkreettisesti: "{target['newspaper_death']}" — se on se tunne johon haluat tarttua.
- Jos artikkeleita on, mainitse 1-2 otsikkoa nimelta. Se todistaa etta sisaltoa on.
- Kutsu kokeilemaan JA lahettamaan oma uutisvinkki (tee CTA selväksi)
- 4-6 lausetta max. Ei hashtageja. Max 1-2 emoji jos sopii luonnollisesti.
- Linkki OMALLE rivilleen lopussa
- Tyyliltaan kuin oikea ihminen kirjoittaisi puskaradioon — ei mainos, ei virallinen, ei innostunut startup-tyyppi
- Saa olla hieman provosoiva tai kantaaottava — se toimii puskaradioissa

ESIMERKKI HYVASTA TYYLISTÄ (ala kopioi, ota vain tyyli):
"Karkkilan Tienoo lakkautettiin 3 vuotta sitten eika kukaan ole korvannut sita. Tassa on joku rakentanut ilmaisen uutissivun jossa on jo pari artikkelia Karkkilasta — esim se juttu pyorailykampanjasta. Nakee ainakin mita taalla tapahtuu. [linkki]"

Kirjoita VAIN julkaisun teksti."""


def _get_prompt_en(target: dict) -> str:
    """Prompt for US English Facebook groups — conversion optimized."""
    articles_section = ""
    if target["article_count"] > 0 and target.get("sample_articles"):
        examples = "\n".join(f'  - "{a}"' for a in target["sample_articles"])
        articles_section = f"""

THERE ARE ALREADY {target['article_count']} ARTICLES about {target['town']} on there, including:
{examples}
Mention 1-2 of these by name in your post — they prove it's real and not empty."""
    else:
        articles_section = f"""

THE SITE IS NEW and looking for its first local news tips from {target['town']}.
Do NOT claim there are articles if there aren't. Instead say the site just launched and needs locals to send in what's happening."""

    return f"""Write a short Facebook post for the community group "{target['group_name']}" in {target['town']}, {target['state']} ({target['population']}).

CONTEXT: {target['newspaper_context']}

WHAT PORT IS: Port is a free local news site. Anyone can submit news tips (voice message, photo, or text) and it turns them into articles.
{articles_section}

LINK: {target['site_url']}

RULES (follow exactly):
- Do NOT start with "Hey everyone", "Hi all", "Hello neighbors" or any generic greeting.
- Start with the pain point: their paper is gone. Reference "{target['newspaper_death']}" specifically.
- If there are articles, mention 1-2 headlines by name. That's the hook — real stories about THEIR town.
- Include a clear CTA: check it out AND submit a tip about something happening locally.
- 4-6 sentences max. No hashtags. 1-2 emoji max, only if natural.
- Link on its own line at the end.
- Sound like a real person in a community Facebook group — not a marketer, not a tech person, not overly enthusiastic.
- A little bit of frustration about losing the paper is GOOD. Channel that.
- Don't explain what AI is or how it works. Nobody cares. Just say "it turns tips into articles."

EXAMPLE OF GOOD TONE (don't copy, just match the vibe):
"The Tribune closed after 141 years and now nobody covers what happens in Chesterton. Found this free news site that already has a few stories — there's one about Feed the Region's community meals and another about Bloomstead Bakery. You can also send in tips about things happening around town. [link]"

Write ONLY the post text, nothing else."""


def _load_pregenerated_posts():
    """Load pre-generated posts from JSON file."""
    posts_file = Path(__file__).parent / "pregenerated_posts.json"
    if posts_file.exists():
        data = json.load(open(posts_file, encoding="utf-8"))
        return data.get("facebook", {})
    return {}

_PREGENERATED = _load_pregenerated_posts()


async def generate_post(town_key: str, target: dict) -> str:
    """Return pre-generated post for the group, fall back to template if missing."""
    if town_key in _PREGENERATED:
        return _PREGENERATED[town_key]

    print(f"  No pre-generated post for {town_key}, using fallback.")
    return _fallback_post(target)


def _fallback_post(target: dict) -> str:
    """Template fallback if Claude API is unavailable."""
    samples = target.get("sample_articles", [])
    if target["lang"] == "fi":
        if target["article_count"] > 0 and samples:
            article_mention = f" — esim \"{samples[0]}\""
        else:
            article_mention = ""
        return (
            f"{target['newspaper_death']}. "
            f"Loytyi tama ilmainen uutissivusto jossa on jo {target['article_count']} artikkelia "
            f"{target['town']}sta{article_mention}. "
            f"Kuka tahansa voi lahettaa vinkkeja ja ne muokataan artikkeleiksi.\n\n"
            f"{target['site_url']}"
        )
    else:
        if target["article_count"] > 0 and samples:
            article_mention = f" — including one about {samples[0].lower()}"
        else:
            article_mention = " and it's looking for locals to send in what's happening"
        return (
            f"{target['newspaper_death']} and nobody's covering {target['town']} anymore. "
            f"Found this free local news site that already has {target['article_count']} stories "
            f"about the area{article_mention}. "
            f"You can send in tips about things happening around town and they turn them into articles.\n\n"
            f"{target['site_url']}"
        )


# ===================================================================
# BROWSER AUTOMATION
# ===================================================================

async def wait_for_login(page):
    """Wait for user to log into Facebook if not already logged in."""
    await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
    await asyncio.sleep(3)

    logged_in = await page.query_selector(
        '[aria-label="Create a post"], [aria-label="Luo julkaisu"], '
        '[aria-label="Messenger"], [aria-label="Ilmoitukset"], '
        '[aria-label="Notifications"]'
    )

    if logged_in:
        print("Already logged into Facebook.")
        return

    print("\n" + "=" * 60)
    print("NOT LOGGED IN — log in via the browser window.")
    print("The script continues automatically after login (5 min timeout).")
    print("=" * 60 + "\n")

    for attempt in range(300):
        await asyncio.sleep(1)
        try:
            logged_in = await page.query_selector(
                '[aria-label="Create a post"], [aria-label="Luo julkaisu"], '
                '[aria-label="Messenger"], [aria-label="Ilmoitukset"], '
                '[aria-label="Notifications"]'
            )
            if logged_in:
                break
        except:
            pass
        if attempt % 30 == 29:
            print(f"  Waiting for login... ({attempt + 1}s)")

    await asyncio.sleep(3)
    print("Login detected! Session saved.\n")


async def post_to_group(page, target: dict, message: str, dry_run: bool = False) -> bool:
    """Navigate to a Facebook group and create a post."""
    town = target["town"]
    group_url = target["group_url"]

    print(f"\n{'='*60}")
    print(f"Target: {target['group_name']} ({town})")
    print(f"URL:    {group_url}")
    print(f"Lang:   {target['lang'].upper()}")
    print(f"{'='*60}")
    print(f"\n{message}\n")

    if dry_run:
        print("[DRY RUN] Skipping actual post.")
        return True

    # Navigate to group
    await page.goto(group_url, wait_until="domcontentloaded")
    await asyncio.sleep(3 + random.uniform(0, 2))

    # Dismiss cookie banners
    try:
        cookie_btn = await page.query_selector(
            'button[data-cookiebanner="accept_button"], '
            '[aria-label="Allow all cookies"], '
            '[aria-label="Salli kaikki evästeet"]'
        )
        if cookie_btn:
            await cookie_btn.click()
            await asyncio.sleep(1)
    except:
        pass

    # Click the "Write something" / "Kirjoita jotain" box to open composer
    composer_opened = False
    selectors = [
        'div[role="button"] span:text-is("Kirjoita jotain...")',
        'div[role="button"] span:text-is("Write something...")',
        '[aria-label="Luo julkaisu"]',
        '[aria-label="Create a post"]',
        'div[role="button"]:has-text("Kirjoita jotain")',
        'div[role="button"]:has-text("Write something")',
    ]

    for sel in selectors:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                await el.click()
                composer_opened = True
                break
        except:
            continue

    if not composer_opened:
        try:
            await page.click('[role="main"] [role="button"]:has-text("jotain")', timeout=5000)
            composer_opened = True
        except:
            pass
        if not composer_opened:
            try:
                await page.click('[role="main"] [role="button"]:has-text("something")', timeout=5000)
                composer_opened = True
            except:
                pass

    if not composer_opened:
        print(f"[ERROR] Could not open post composer for {town}")
        return False

    await asyncio.sleep(2 + random.uniform(0, 1.5))

    # Find the text editor
    editor = await page.query_selector(
        '[role="dialog"] [contenteditable="true"], '
        '[aria-label*="Luo julkaisu"] [contenteditable="true"], '
        '[aria-label*="Create a post"] [contenteditable="true"], '
        'div[contenteditable="true"][data-lexical-editor="true"]'
    )

    if not editor:
        editor = await page.query_selector('[contenteditable="true"]')

    if not editor:
        print(f"[ERROR] Could not find text editor for {town}")
        return False

    await editor.click()
    await asyncio.sleep(0.5)

    # Type with human-like delays
    for line in message.split('\n'):
        if line:
            words = line.split(' ')
            for i, word in enumerate(words):
                await editor.type(word, delay=random.randint(30, 80))
                if i < len(words) - 1:
                    await editor.type(' ', delay=random.randint(20, 60))
            await asyncio.sleep(random.uniform(0.2, 0.5))
        await page.keyboard.press('Enter')
        await asyncio.sleep(random.uniform(0.1, 0.3))

    await asyncio.sleep(2 + random.uniform(0, 1))

    # Click Post / Julkaise
    posted = False
    post_selectors = [
        '[aria-label="Julkaise"]',
        '[aria-label="Post"]',
        'div[role="dialog"] div[role="button"]:has-text("Julkaise")',
        'div[role="dialog"] div[role="button"]:has-text("Post")',
    ]

    for sel in post_selectors:
        try:
            btn = await page.query_selector(sel)
            if btn and await btn.is_visible():
                await btn.click()
                posted = True
                break
        except:
            continue

    if not posted:
        print(f"[ERROR] Could not click Post button for {town}")
        print("Message typed — you can post manually in the browser.")
        return False

    await asyncio.sleep(3)
    print(f"[OK] Posted to {target['group_name']}")
    return True


# ===================================================================
# LOGGING
# ===================================================================

def log_post(town_key: str, target: dict, message: str, success: bool, dry_run: bool):
    """Log each post attempt for tracking."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / "posts.jsonl"

    entry = {
        "timestamp": datetime.now().isoformat(),
        "town": town_key,
        "group_name": target["group_name"],
        "group_url": target["group_url"],
        "lang": target["lang"],
        "message": message,
        "success": success,
        "dry_run": dry_run,
    }

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ===================================================================
# MAIN
# ===================================================================

async def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    post_all = "--all" in args
    post_fi = "--fi" in args
    post_us = "--us" in args
    custom_message = None
    towns = []

    i = 0
    while i < len(args):
        if args[i] == "--town" and i + 1 < len(args):
            towns.append(args[i + 1])
            i += 2
        elif args[i] == "--message" and i + 1 < len(args):
            custom_message = args[i + 1]
            i += 2
        else:
            i += 1

    # Build target list
    if post_all:
        towns = list(ALL_TARGETS.keys())
    elif post_fi and not towns:
        towns = list(TARGETS_FI.keys())
    elif post_us and not towns:
        towns = list(TARGETS_US.keys())

    if not towns:
        print("Facebook Group Poster — Port News Desert Outreach")
        print()
        print("Usage:")
        print("  python fb_poster.py --dry-run          # Preview all posts")
        print("  python fb_poster.py --fi --dry-run      # Preview Finnish only")
        print("  python fb_poster.py --us --dry-run      # Preview US only")
        print("  python fb_poster.py --town chesterton   # Post to one group")
        print("  python fb_poster.py --all               # Post to all groups")
        print()
        print(f"Finnish towns ({len(TARGETS_FI)}):")
        for k, v in TARGETS_FI.items():
            print(f"  {k:20s} {v['group_name']:30s} ({v['town']})")
        print(f"\nUS towns ({len(TARGETS_US)}):")
        for k, v in TARGETS_US.items():
            print(f"  {k:20s} {v['group_name']:30s} ({v['town']}, {v['state']})")
        print(f"\nTotal: {len(ALL_TARGETS)} groups")
        return

    # Validate
    for t in towns:
        if t not in ALL_TARGETS:
            print(f"Unknown town: {t}")
            print(f"Available: {', '.join(ALL_TARGETS.keys())}")
            return

    # Generate all posts (before opening browser to save time)
    print(f"Generating posts for {len(towns)} groups...\n")
    posts = {}
    for town_key in towns:
        target = ALL_TARGETS[town_key]
        if custom_message:
            posts[town_key] = custom_message
        else:
            print(f"  [{target['lang'].upper()}] {target['town']}...", end=" ", flush=True)
            posts[town_key] = await generate_post(town_key, target)
            print("done")

    # Dry run: just print
    if dry_run:
        print("\n" + "=" * 60)
        print(f"DRY RUN — {len(posts)} posts generated:")
        print("=" * 60)
        for town_key, message in posts.items():
            target = ALL_TARGETS[town_key]
            lang_tag = f"[{target['lang'].upper()}]"
            print(f"\n--- {lang_tag} {target['group_name']} ({target['town']}) ---")
            print(message)
            print()
            log_post(town_key, target, message, success=True, dry_run=True)
        print(f"\n{len(posts)} posts previewed. Run without --dry-run to post.")
        return

    # Live posting
    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            locale="fi-FI",
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()
        await wait_for_login(page)

        succeeded = 0
        failed = 0

        for idx, town_key in enumerate(towns):
            target = ALL_TARGETS[town_key]
            message = posts[town_key]

            success = await post_to_group(page, target, message)
            log_post(town_key, target, message, success=success, dry_run=False)

            if success:
                succeeded += 1
            else:
                failed += 1

            # Human-like delay between groups (2-5 minutes)
            if idx < len(towns) - 1:
                delay = random.randint(120, 300)
                print(f"\nWaiting {delay}s before next group... ({idx + 1}/{len(towns)} done)")
                await asyncio.sleep(delay)

        await browser.close()

    print(f"\nDone! {succeeded} posted, {failed} failed out of {len(towns)} groups.")


if __name__ == "__main__":
    asyncio.run(main())
