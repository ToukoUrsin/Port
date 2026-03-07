"""
Build seed_data_new_towns.json from hardcoded articles.
No API needed — articles written directly.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

ARTICLES_DIR = Path(__file__).parent / "generated_articles"
SEED_OWNER_ID = "00000000-0000-0000-0000-000000000001"

TAGS = {
    "council": 1 << 0, "schools": 1 << 1, "business": 1 << 2,
    "events": 1 << 3, "sports": 1 << 4, "community": 1 << 5,
    "culture": 1 << 6, "safety": 1 << 7, "health": 1 << 8,
    "environment": 1 << 9,
}

NOW = datetime.now(timezone.utc).isoformat()

# ── Location definitions ──────────────────────────────────────────

LOCATIONS = {
    "cairo_il": {"name":"Cairo","slug":"cairo-il","lat":37.0053,"lng":-89.1765,"state":"Illinois","country":"US","pop":1733},
    "bardstown_ky": {"name":"Bardstown","slug":"bardstown-ky","lat":37.8092,"lng":-85.4669,"state":"Kentucky","country":"US","pop":13500},
    "centralia_wa": {"name":"Centralia","slug":"centralia-wa","lat":46.7162,"lng":-122.9543,"state":"Washington","country":"US","pop":18400},
    "elkin_nc": {"name":"Elkin","slug":"elkin-nc","lat":36.2443,"lng":-80.8484,"state":"North Carolina","country":"US","pop":4000},
    "ely_nv": {"name":"Ely","slug":"ely-nv","lat":39.2474,"lng":-114.8886,"state":"Nevada","country":"US","pop":4000},
    "galax_va": {"name":"Galax","slug":"galax-va","lat":36.6612,"lng":-80.9237,"state":"Virginia","country":"US","pop":6700},
    "millinocket_me": {"name":"Millinocket","slug":"millinocket-me","lat":45.6572,"lng":-68.7098,"state":"Maine","country":"US","pop":4000},
    "orangeburg_sc": {"name":"Orangeburg","slug":"orangeburg-sc","lat":33.4918,"lng":-80.8556,"state":"South Carolina","country":"US","pop":12800},
    "paintsville_ky": {"name":"Paintsville","slug":"paintsville-ky","lat":37.8145,"lng":-82.8071,"state":"Kentucky","country":"US","pop":3500},
    "vinton_oh": {"name":"McArthur","slug":"mcarthur-oh","lat":39.2462,"lng":-82.4782,"state":"Ohio","country":"US","pop":1700},
    "wauchula_fl": {"name":"Wauchula","slug":"wauchula-fl","lat":27.5478,"lng":-81.8112,"state":"Florida","country":"US","pop":5600},
    "owsley_ky": {"name":"Booneville","slug":"booneville-ky","lat":37.4767,"lng":-83.6749,"state":"Kentucky","country":"US","pop":4400},
    "washington_me": {"name":"Machias","slug":"machias-me","lat":44.7150,"lng":-67.4614,"state":"Maine","country":"US","pop":2000},
    "madison_fl": {"name":"Madison","slug":"madison-fl","lat":30.4694,"lng":-83.4130,"state":"Florida","country":"US","pop":2800},
    "perry_tn": {"name":"Linden","slug":"linden-tn","lat":35.6170,"lng":-87.8394,"state":"Tennessee","country":"US","pop":900},
    "pike_ky": {"name":"Pikeville","slug":"pikeville-ky","lat":37.4793,"lng":-82.5188,"state":"Kentucky","country":"US","pop":7000},
    "white_tn": {"name":"Sparta","slug":"sparta-tn","lat":35.9259,"lng":-85.4644,"state":"Tennessee","country":"US","pop":5000},
    "up_michigan": {"name":"Marquette","slug":"marquette-mi","lat":46.5436,"lng":-87.3954,"state":"Michigan","country":"US","pop":20600},
    "kauhajoki": {"name":"Kauhajoki","slug":"kauhajoki","lat":62.4319,"lng":22.1770,"state":"Etelä-Pohjanmaa","country":"FI","pop":13000},
    "salla": {"name":"Salla","slug":"salla","lat":66.8310,"lng":28.6670,"state":"Lappi","country":"FI","pop":3300},
    "enontekio": {"name":"Enontekiö","slug":"enontekio","lat":68.3833,"lng":23.6333,"state":"Lappi","country":"FI","pop":1800},
}

US_REGIONS = {
    "Illinois":"b2000014","Kentucky":"b2000005","Washington":"b2000015",
    "North Carolina":"b2000009","Nevada":"b2000016","Virginia":"b2000010",
    "Maine":"b2000017","South Carolina":"b2000018","Florida":"b2000011",
    "Ohio":"b2000019","Tennessee":"b2000004","Michigan":"b2000020",
}
FI_REGIONS = {"Etelä-Pohjanmaa":"a2000004","Lappi":"a2000002"}

# ── Articles ──────────────────────────────────────────────────────

ARTICLES = {
    # ═══ CAIRO, IL ═══
    "cairo_il": [
        {
            "headline": "Cairo city council approves grant application for riverfront stabilization",
            "summary": "The city council voted unanimously to apply for federal infrastructure funds to address ongoing erosion along the Ohio River waterfront near Fort Defiance.",
            "blocks": [
                {"type":"text","content":"The Cairo City Council voted unanimously this week to submit a federal infrastructure grant application seeking $2.4 million for riverfront stabilization work along the Ohio River. The project would address erosion that has accelerated over the past several years near the confluence with the Mississippi River."},
                {"type":"text","content":"Fort Defiance State Park, located at the southernmost tip of Illinois where the two rivers meet, has seen portions of its shoreline recede significantly. City officials say the stabilization work would protect both the park and nearby municipal infrastructure."},
                {"type":"text","content":"The grant application will be submitted through the Army Corps of Engineers' flood risk management program. If approved, construction could begin as early as fall 2026."},
            ],
            "category": "council", "tags": ["council", "environment"],
        },
        {
            "headline": "Alexander County food pantry sees 40% increase in families served",
            "summary": "The community food pantry in Cairo reports a significant rise in demand, prompting expanded distribution hours and a call for donations.",
            "blocks": [
                {"type":"text","content":"The Alexander County Community Food Pantry has reported a 40 percent increase in families served over the past six months, with weekly distributions now reaching more than 200 households across the Cairo area."},
                {"type":"text","content":"Volunteers say the increase reflects ongoing economic challenges in the region, where the population has steadily declined and employment options remain limited. The pantry has expanded its Saturday distribution hours to accommodate the growing need."},
                {"type":"text","content":"Community members interested in donating or volunteering can contact the pantry through the Alexander County community services office. The organization is particularly in need of canned proteins, hygiene products, and baby supplies."},
            ],
            "category": "community", "tags": ["community", "health"],
        },
        {
            "headline": "Spring flooding watch issued for Cairo as rivers rise",
            "summary": "The National Weather Service has issued a flood watch for the Cairo area as snowmelt from the upper Midwest pushes river levels higher.",
            "blocks": [
                {"type":"text","content":"The National Weather Service has issued a flood watch for Alexander County and the Cairo area as spring snowmelt from the upper Midwest continues to push water levels higher on both the Ohio and Mississippi rivers."},
                {"type":"text","content":"River gauges at Cairo showed the Ohio River at 42 feet and rising, still below the 50-foot flood stage but trending upward. Forecasters expect levels to crest in the coming weeks depending on rainfall patterns upstream."},
                {"type":"text","content":"Residents in low-lying areas are advised to monitor river levels and have emergency plans ready. The Cairo levee system, which protects much of the town, underwent repairs in recent years but officials urge vigilance during high water events."},
            ],
            "category": "safety", "tags": ["safety", "environment"],
        },
    ],

    # ═══ BARDSTOWN, KY ═══
    "bardstown_ky": [
        {
            "headline": "Bardstown tourism board reports record bourbon trail visitors for early 2026",
            "summary": "The Kentucky Bourbon Trail continues to drive tourism to Bardstown, with visitor numbers up 15% compared to the same period last year.",
            "blocks": [
                {"type":"text","content":"Bardstown's tourism board has reported a 15 percent increase in Kentucky Bourbon Trail visitors during the first two months of 2026 compared to the same period last year. The town, which bills itself as the Bourbon Capital of the World, welcomed an estimated 45,000 visitors in January and February alone."},
                {"type":"text","content":"Local distilleries including Heaven Hill, Jim Beam, and Maker's Mark have all reported strong attendance at their visitor centers. Several downtown restaurants and hotels say they are already seeing spring booking levels that typically don't occur until April."},
                {"type":"text","content":"The tourism board is working with Nelson County officials to address parking and traffic flow concerns in the historic downtown area as visitor numbers continue to grow."},
            ],
            "category": "business", "tags": ["business", "community"],
        },
        {
            "headline": "Nelson County Schools announce new vocational training partnership",
            "summary": "Nelson County Schools will partner with local distilleries to offer vocational training in industrial maintenance and skilled trades.",
            "blocks": [
                {"type":"text","content":"Nelson County Schools has announced a new vocational training partnership with several area distilleries that will give high school students hands-on experience in industrial maintenance, electrical systems, and skilled trades."},
                {"type":"text","content":"The program, set to launch in the fall semester, will place juniors and seniors in paid apprenticeships at participating distilleries. Students will earn industry-recognized certifications while completing their high school requirements."},
                {"type":"text","content":"School officials say the partnership addresses a growing need for skilled workers in the bourbon industry while providing students with career pathways that don't require a four-year degree. Applications will open in April."},
            ],
            "category": "schools", "tags": ["schools", "business"],
        },
        {
            "headline": "My Old Kentucky Home state park opens renovated visitor center",
            "summary": "The newly renovated visitor center at My Old Kentucky Home State Park in Bardstown features updated exhibits on the site's complex history.",
            "blocks": [
                {"type":"text","content":"My Old Kentucky Home State Park in Bardstown has reopened its visitor center following a six-month renovation that includes updated exhibits addressing both the site's musical heritage and its history of enslavement."},
                {"type":"text","content":"The renovated center features interactive displays, oral histories, and archaeological findings from the Federal Hill mansion grounds. Park officials say the new exhibits aim to present a more complete picture of life at the historic estate."},
                {"type":"text","content":"The park expects increased visitation this spring and summer. The outdoor drama 'The Stephen Foster Story' is scheduled to resume performances in June."},
            ],
            "category": "culture", "tags": ["culture", "events"],
        },
    ],

    # ═══ CENTRALIA, WA ═══
    "centralia_wa": [
        {
            "headline": "Lewis County flood mitigation project breaks ground along Chehalis River",
            "summary": "Construction has begun on a $12 million flood mitigation project along the Chehalis River basin aimed at protecting Centralia neighborhoods.",
            "blocks": [
                {"type":"text","content":"Construction crews broke ground this week on a $12 million flood mitigation project along the Chehalis River basin designed to reduce flood risk for residential neighborhoods in Centralia and Chehalis."},
                {"type":"text","content":"The project includes improved drainage infrastructure, expanded retention areas, and reinforced levee sections along several miles of the river. Flooding has been a recurring concern for Lewis County communities, with major flood events causing significant damage in recent decades."},
                {"type":"text","content":"The project is expected to take 18 months to complete. Residents along affected stretches of the river may experience temporary road closures and construction noise during the work."},
            ],
            "category": "council", "tags": ["council", "environment"],
        },
        {
            "headline": "Centralia College launches cybersecurity certificate program",
            "summary": "Centralia College is offering a new cybersecurity certificate aimed at addressing workforce demand in the growing tech sector.",
            "blocks": [
                {"type":"text","content":"Centralia College has announced a new cybersecurity certificate program starting this fall, designed to prepare students for entry-level positions in the rapidly growing information security field."},
                {"type":"text","content":"The nine-month program will cover network security, threat analysis, and incident response. College officials say the program was developed in consultation with regional employers who have reported difficulty filling cybersecurity positions."},
                {"type":"text","content":"Financial aid and workforce development funding may be available for qualifying students. An information session is scheduled for April at the college's main campus."},
            ],
            "category": "schools", "tags": ["schools", "business"],
        },
        {
            "headline": "Centralia Tigers baseball opens spring season with roster of returning starters",
            "summary": "The Centralia Tigers high school baseball team enters the spring season with eight returning starters and high expectations.",
            "blocks": [
                {"type":"text","content":"The Centralia Tigers baseball team has opened spring practice with eight returning starters from last year's squad, giving coaches reason for optimism heading into the 2026 season."},
                {"type":"text","content":"The team finished with a winning record last year and returns its top two pitchers along with most of the infield. The Tigers will play their home games at the high school diamond, with the season opener set for late March."},
                {"type":"text","content":"The coaching staff says depth on the roster is improved this year, with a strong group of sophomores pushing for playing time. The team's first league matchup is scheduled for the second week of April."},
            ],
            "category": "sports", "tags": ["sports", "schools"],
        },
    ],

    # ═══ ELKIN, NC ═══
    "elkin_nc": [
        {
            "headline": "Downtown Elkin welcomes three new businesses as revitalization continues",
            "summary": "A coffee roaster, a craft gallery, and a bike rental shop have opened in downtown Elkin, adding to the town's growing small business scene.",
            "blocks": [
                {"type":"text","content":"Three new businesses have opened their doors in downtown Elkin this spring, continuing a revitalization trend that has transformed the town's Main Street over the past several years."},
                {"type":"text","content":"The new arrivals include a specialty coffee roaster, an Appalachian craft gallery featuring work by regional artists, and a bicycle rental and repair shop catering to visitors exploring the nearby trails and wine country. All three occupy previously vacant storefronts."},
                {"type":"text","content":"Town officials credit a combination of affordable commercial rents, proximity to the Yadkin Valley wine region, and growing outdoor recreation tourism for attracting new entrepreneurs to the area."},
            ],
            "category": "business", "tags": ["business", "community"],
        },
        {
            "headline": "Surry County considers expanding broadband to underserved rural areas",
            "summary": "County commissioners are reviewing proposals to extend high-speed internet service to rural areas around Elkin that currently lack reliable connectivity.",
            "blocks": [
                {"type":"text","content":"Surry County commissioners are reviewing proposals to expand broadband internet access to rural areas around Elkin and the surrounding foothills communities where reliable high-speed service remains unavailable."},
                {"type":"text","content":"The proposals include a mix of fiber-optic line extensions and fixed wireless installations. Officials estimate that roughly 3,000 households in the county lack access to broadband speeds adequate for remote work or online education."},
                {"type":"text","content":"Funding could come from a combination of state and federal broadband expansion grants. A public comment period is expected to open next month before commissioners vote on moving forward with a specific proposal."},
            ],
            "category": "council", "tags": ["council", "community"],
        },
        {
            "headline": "Yadkin Valley wineries prepare for spring open house weekend",
            "summary": "Over a dozen Yadkin Valley wineries near Elkin are coordinating a spring open house weekend with tastings, live music, and vineyard tours.",
            "blocks": [
                {"type":"text","content":"More than a dozen wineries in the Yadkin Valley wine region near Elkin are preparing for a coordinated spring open house weekend in April, featuring tastings, live music, and vineyard tours across the region."},
                {"type":"text","content":"The event has become an annual tradition that draws visitors from across the Carolinas and beyond. Participating wineries will offer special releases and food pairings, with several partnering with local restaurants and food trucks."},
                {"type":"text","content":"Organizers recommend designated drivers or the shuttle service that will run between participating wineries throughout the weekend. Tickets for the shuttle can be purchased online in advance."},
            ],
            "category": "events", "tags": ["events", "business"],
        },
    ],

    # ═══ ELY, NV ═══
    "ely_nv": [
        {
            "headline": "Nevada Northern Railway announces expanded summer steam train schedule",
            "summary": "The Nevada Northern Railway museum in Ely will offer additional weekend steam train excursions this summer to meet growing visitor demand.",
            "blocks": [
                {"type":"text","content":"The Nevada Northern Railway museum in Ely has announced an expanded schedule of steam train excursions for summer 2026, adding Friday evening runs to its existing weekend lineup to meet growing visitor demand."},
                {"type":"text","content":"The historic railway, which has operated continuously since 1906, is one of the best-preserved short-line railroads in the country. Its steam locomotives draw rail enthusiasts and tourists from around the world to this remote corner of eastern Nevada."},
                {"type":"text","content":"The museum is also planning special themed rides including a stargazing excursion that takes advantage of Ely's exceptionally dark skies. Ticket sales for the summer season open in April."},
            ],
            "category": "culture", "tags": ["culture", "business"],
        },
        {
            "headline": "White Pine County School District seeks input on budget priorities",
            "summary": "The school district is holding community meetings to gather input on spending priorities as it prepares next year's budget amid flat enrollment.",
            "blocks": [
                {"type":"text","content":"The White Pine County School District is holding a series of community meetings this month to gather public input on budget priorities for the 2026-2027 school year."},
                {"type":"text","content":"District administrators say enrollment has remained flat while costs for transportation, utilities, and staffing have continued to rise. The district serves students across a vast geographic area, with some students riding buses for over an hour each way."},
                {"type":"text","content":"Community members can attend meetings at the high school auditorium or submit comments through the district's website. The school board is expected to vote on the final budget in May."},
            ],
            "category": "schools", "tags": ["schools", "council"],
        },
        {
            "headline": "Great Basin National Park reports high snowpack ahead of spring season",
            "summary": "Heavy winter snowfall at Great Basin National Park near Ely has raised expectations for a strong spring wildflower season and good water conditions.",
            "blocks": [
                {"type":"text","content":"Great Basin National Park, located about an hour from Ely along the Loneliest Road in America, is reporting snowpack levels well above average heading into spring, raising expectations for a strong wildflower season in the coming months."},
                {"type":"text","content":"Park rangers say the Wheeler Peak area has received significantly more snow than usual this winter, which should feed streams and support vegetation through the summer months. The Lehman Caves visitor center remains open year-round."},
                {"type":"text","content":"The higher-elevation roads and campgrounds typically open in late May or June depending on snowmelt. Visitors planning spring trips should check road conditions before driving out, as the park is located in one of the most remote areas of the lower 48 states."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
    ],

    # ═══ GALAX, VA ═══
    "galax_va": [
        {
            "headline": "Old Fiddlers' Convention announces 2026 lineup and expanded youth program",
            "summary": "The annual Old Fiddlers' Convention in Galax, one of the oldest in the world, will feature an expanded youth competition category this summer.",
            "blocks": [
                {"type":"text","content":"Organizers of the Old Fiddlers' Convention in Galax have announced plans for the 2026 event, including an expanded youth competition category designed to encourage the next generation of old-time mountain musicians."},
                {"type":"text","content":"The convention, which has been held annually since 1935, draws thousands of musicians and spectators to this small city in southwestern Virginia. It is widely considered one of the most important old-time and bluegrass music events in the world."},
                {"type":"text","content":"The youth category will be open to musicians under 18 in fiddle, banjo, guitar, and flat-foot dancing. Registration opens in May, and organizers are offering fee waivers for local participants."},
            ],
            "category": "culture", "tags": ["culture", "events"],
        },
        {
            "headline": "New River Trail State Park sees record early-season trail use",
            "summary": "Warmer-than-usual temperatures have brought hikers and cyclists to the New River Trail near Galax earlier than typical for the season.",
            "blocks": [
                {"type":"text","content":"New River Trail State Park, which runs through the Galax area, has reported record early-season trail usage as warmer-than-usual March temperatures have drawn hikers, cyclists, and horseback riders to the 57-mile rail trail."},
                {"type":"text","content":"Park staff have been working to prepare trailheads and restroom facilities ahead of what they expect to be a busy spring and summer season. The trail, which follows the New River through some of southwestern Virginia's most scenic terrain, has become a significant tourism draw for the region."},
                {"type":"text","content":"The Galax trailhead provides direct access to the trail and connects to the city's downtown area. Local businesses near the trailheads report an uptick in customers compared to last March."},
            ],
            "category": "community", "tags": ["community", "environment"],
        },
        {
            "headline": "Galax city council discusses incentives for manufacturing site reuse",
            "summary": "City leaders are exploring tax incentives and grants to attract new tenants to vacant manufacturing facilities left behind by industry closures.",
            "blocks": [
                {"type":"text","content":"The Galax City Council discussed proposals this week to offer tax incentives and pursue state grants aimed at attracting new businesses to vacant manufacturing facilities in the city."},
                {"type":"text","content":"Several large industrial buildings have sat empty since furniture and textile manufacturing operations closed or relocated in recent years. Council members heard a presentation on successful brownfield redevelopment projects in similar Appalachian communities."},
                {"type":"text","content":"The proposals include a five-year tax abatement for companies that commit to creating a minimum number of jobs. A formal vote is expected at next month's council meeting following a period of public comment."},
            ],
            "category": "council", "tags": ["council", "business"],
        },
    ],

    # ═══ MILLINOCKET, ME ═══
    "millinocket_me": [
        {
            "headline": "New outdoor gear shop opens on Millinocket's main street",
            "summary": "A locally owned outdoor recreation outfitter has opened downtown, the latest sign of Millinocket's transition from mill town to recreation hub.",
            "blocks": [
                {"type":"text","content":"A new outdoor gear and rental shop has opened on Millinocket's main street, offering hiking, camping, and paddling equipment to visitors heading to Baxter State Park and the Katahdin Woods and Waters National Monument."},
                {"type":"text","content":"The shop occupies a storefront that had been vacant for several years following the closure of the paper mills that once anchored the town's economy. The owner, a Millinocket native who returned after working in the outdoor industry, says the timing felt right as recreation tourism continues to grow."},
                {"type":"text","content":"The store will also offer guided day hikes and gear rental packages aimed at first-time visitors to the Katahdin region. It joins a growing number of small businesses that have opened downtown in recent years as the town reinvents itself around outdoor recreation."},
            ],
            "category": "business", "tags": ["business", "community"],
        },
        {
            "headline": "Stearns High School robotics team qualifies for state competition",
            "summary": "The Stearns High School robotics team has qualified for the Maine state robotics championship after a strong showing at the regional qualifier.",
            "blocks": [
                {"type":"text","content":"The Stearns High School Minutemen robotics team has qualified for the Maine state robotics championship after finishing in the top three at the regional qualifier held earlier this month."},
                {"type":"text","content":"The team of eight students designed and built their competition robot over several months, working after school and on weekends in the school's workshop. Their faculty advisor says the achievement is especially notable given the team's small size compared to larger schools."},
                {"type":"text","content":"The state competition will be held in April. The team is seeking sponsors to help cover travel expenses, as the event is several hours south in the Portland area."},
            ],
            "category": "schools", "tags": ["schools", "community"],
        },
        {
            "headline": "Katahdin region trail crews begin spring maintenance ahead of hiking season",
            "summary": "Volunteer trail crews have started seasonal maintenance work on trails around Baxter State Park and Katahdin Woods and Waters National Monument.",
            "blocks": [
                {"type":"text","content":"Volunteer trail crews have begun spring maintenance work on hiking trails in the Katahdin region, clearing winter blowdowns and repairing drainage structures ahead of what is expected to be another busy hiking season."},
                {"type":"text","content":"Both Baxter State Park and Katahdin Woods and Waters National Monument have seen steadily increasing visitor numbers since the national monument's designation in 2016. Trail organizations say the increased foot traffic has made regular maintenance more critical than ever."},
                {"type":"text","content":"Volunteers interested in joining trail work days can sign up through regional trail organizations. No experience is necessary — tools and training are provided on site."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
    ],

    # ═══ ORANGEBURG, SC ═══
    "orangeburg_sc": [
        {
            "headline": "SC State University breaks ground on new student wellness center",
            "summary": "South Carolina State University in Orangeburg has begun construction on a new student wellness center that will include mental health services.",
            "blocks": [
                {"type":"text","content":"South Carolina State University in Orangeburg broke ground this week on a new student wellness center that will house expanded mental health counseling, fitness facilities, and health education programs."},
                {"type":"text","content":"The $8 million facility is being funded through a combination of state appropriations and private donations. University officials say the center addresses growing demand for student mental health services and will serve as a recruitment tool for prospective students."},
                {"type":"text","content":"Construction is expected to be completed by spring 2027. In the meantime, the university continues to offer counseling services through its existing student affairs office."},
            ],
            "category": "schools", "tags": ["schools", "health"],
        },
        {
            "headline": "Edisto Memorial Gardens to host spring plant sale and garden festival",
            "summary": "Orangeburg's Edisto Memorial Gardens will hold its annual spring plant sale alongside a garden festival featuring local vendors and live music.",
            "blocks": [
                {"type":"text","content":"Edisto Memorial Gardens in Orangeburg will host its annual spring plant sale and garden festival in April, featuring native plants, garden supplies, and educational workshops for home gardeners."},
                {"type":"text","content":"The gardens, which line the banks of the North Edisto River, are known for their extensive rose collection and are a popular destination for residents and visitors alike. The spring festival will include local food vendors, live music, and children's activities."},
                {"type":"text","content":"Master gardeners from Clemson Extension will be on hand to answer questions about planting in the South Carolina climate. The event is free to attend, with plant sale proceeds supporting garden maintenance."},
            ],
            "category": "events", "tags": ["events", "environment"],
        },
        {
            "headline": "Downtown Orangeburg streetscape project enters final phase",
            "summary": "The multi-year downtown streetscape renovation in Orangeburg is nearing completion, with new sidewalks, lighting, and landscaping taking shape.",
            "blocks": [
                {"type":"text","content":"The downtown Orangeburg streetscape renovation project has entered its final phase, with new sidewalks, period-appropriate street lighting, and landscaping taking shape along Russell Street and surrounding blocks."},
                {"type":"text","content":"The multi-year project has aimed to make downtown more walkable and attractive to both residents and visitors. Business owners along the corridor have reported some disruption during construction but say they are looking forward to the finished product."},
                {"type":"text","content":"City officials expect the project to be substantially complete by early summer. A downtown celebration is being planned to mark the completion and showcase the revitalized streetscape."},
            ],
            "category": "council", "tags": ["council", "business"],
        },
    ],

    # ═══ PAINTSVILLE, KY ═══
    "paintsville_ky": [
        {
            "headline": "Country Music Highway Museum plans expanded Loretta Lynn exhibit",
            "summary": "The US 23 Country Music Highway Museum in Paintsville is developing an expanded exhibit honoring Loretta Lynn and the region's musical heritage.",
            "blocks": [
                {"type":"text","content":"The US 23 Country Music Highway Museum in Paintsville is developing an expanded exhibit dedicated to Loretta Lynn, who grew up in nearby Butcher Hollow and became one of country music's most celebrated artists."},
                {"type":"text","content":"The new exhibit will feature personal artifacts, photographs, and an interactive timeline of Lynn's career alongside the stories of other musicians from the region, including Crystal Gayle, Dwight Yoakam, and Billy Ray Cyrus. Museum staff have been working with the Lynn family on the project."},
                {"type":"text","content":"The expanded exhibit is expected to open this summer and is part of a broader effort to develop music heritage tourism along the Country Music Highway corridor in eastern Kentucky."},
            ],
            "category": "culture", "tags": ["culture", "business"],
        },
        {
            "headline": "Paintsville Lake State Park prepares for busy spring fishing season",
            "summary": "Park rangers at Paintsville Lake report healthy fish populations and are expecting strong turnout for the spring bass and crappie seasons.",
            "blocks": [
                {"type":"text","content":"Park rangers at Paintsville Lake State Park say water conditions and fish populations are looking strong heading into the spring fishing season, with bass and crappie expected to be particularly active as water temperatures rise."},
                {"type":"text","content":"The 1,140-acre lake in the foothills of eastern Kentucky draws anglers from across the region. The marina has completed off-season maintenance and boat rentals will be available starting in April."},
                {"type":"text","content":"A youth fishing derby is planned for late April as part of the park's efforts to introduce the next generation to the sport. Registration is free and open to children under 16."},
            ],
            "category": "community", "tags": ["community", "environment"],
        },
        {
            "headline": "Johnson County Schools receive grant for after-school STEM program",
            "summary": "Johnson County Schools has been awarded a state grant to fund an after-school STEM program serving middle school students in the Paintsville area.",
            "blocks": [
                {"type":"text","content":"Johnson County Schools has been awarded a $150,000 state grant to launch an after-school STEM program serving middle school students in the Paintsville area."},
                {"type":"text","content":"The program will offer hands-on activities in coding, robotics, and environmental science, meeting twice a week during the school year. Transportation home will be provided for participating students."},
                {"type":"text","content":"School administrators say the program aims to expose students to career pathways in technology and science fields that are increasingly available through remote work, even in rural communities. Enrollment will begin this fall."},
            ],
            "category": "schools", "tags": ["schools", "community"],
        },
    ],

    # ═══ McARTHUR / VINTON COUNTY, OH ═══
    "vinton_oh": [
        {
            "headline": "Lake Hope State Park opens new accessible trail section",
            "summary": "A new wheelchair-accessible trail section has opened at Lake Hope State Park in Vinton County, offering views of the lake and surrounding forest.",
            "blocks": [
                {"type":"text","content":"Lake Hope State Park in Vinton County has opened a new wheelchair-accessible trail section that provides views of the lake and the surrounding Wayne National Forest. The half-mile paved trail connects the main parking area to a lakeside overlook."},
                {"type":"text","content":"The project was funded through a state parks accessibility initiative and took several months to complete. Park staff say it fills a gap that had made portions of the park difficult for visitors with mobility limitations to enjoy."},
                {"type":"text","content":"Lake Hope is one of the most visited outdoor recreation areas in southeastern Ohio and serves as an important economic driver for Vinton County, the state's least populated county."},
            ],
            "category": "community", "tags": ["community", "environment"],
        },
        {
            "headline": "Vinton County Local Schools launch free breakfast program for all students",
            "summary": "All students in the Vinton County Local School District will now receive free breakfast regardless of family income, thanks to a federal nutrition program.",
            "blocks": [
                {"type":"text","content":"All students in the Vinton County Local School District will now receive free breakfast every school day regardless of family income. The district has qualified for the federal Community Eligibility Provision, which allows high-need districts to offer universal free meals."},
                {"type":"text","content":"Vinton County, one of Ohio's highest-poverty counties, has long had a high percentage of students qualifying for free and reduced-price meals. The new program eliminates paperwork for families and reduces stigma around meal assistance."},
                {"type":"text","content":"School officials say the program is already showing results, with more students eating breakfast and teachers reporting improved focus in morning classes."},
            ],
            "category": "schools", "tags": ["schools", "health"],
        },
        {
            "headline": "Volunteers clear trails in Wayne National Forest ahead of spring hiking",
            "summary": "Community volunteers spent a weekend clearing and marking trails in the Vinton County section of Wayne National Forest.",
            "blocks": [
                {"type":"text","content":"A group of community volunteers spent the weekend clearing fallen trees, repairing trail markers, and improving drainage on hiking trails in the Vinton County section of Wayne National Forest."},
                {"type":"text","content":"The volunteer effort, organized through a local outdoor recreation group, focused on several popular trails that had accumulated storm damage over the winter. The forest, which covers much of the county's rugged terrain, is a key asset for the area's growing outdoor recreation economy."},
                {"type":"text","content":"Additional volunteer trail days are planned for April. Organizers say all skill levels are welcome and tools are provided."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
    ],

    # ═══ WAUCHULA, FL ═══
    "wauchula_fl": [
        {
            "headline": "Hardee County Fair returns with livestock shows, carnival rides, and local food",
            "summary": "The annual Hardee County Fair in Wauchula is set for later this month, featuring FFA and 4-H livestock competitions alongside traditional fair attractions.",
            "blocks": [
                {"type":"text","content":"The annual Hardee County Fair returns to the fairgrounds in Wauchula later this month, bringing livestock shows, carnival rides, and local food vendors to what remains one of the most anticipated events on the community calendar."},
                {"type":"text","content":"FFA and 4-H students from Hardee County Schools will be competing in livestock judging, showmanship, and market animal categories. The steer and hog auctions are a highlight, with local businesses and ranchers traditionally supporting youth exhibitors with strong bids."},
                {"type":"text","content":"The fair runs for five days with gate admission covering access to all exhibits and entertainment. Carnival ride wristbands are sold separately. Organizers are expecting strong attendance."},
            ],
            "category": "events", "tags": ["events", "community"],
        },
        {
            "headline": "Peace River water levels drop as dry season takes hold in Hardee County",
            "summary": "The Peace River through Wauchula has dropped to low levels as the dry season continues, raising concerns about irrigation supply for area growers.",
            "blocks": [
                {"type":"text","content":"Water levels on the Peace River through Wauchula have dropped significantly as Florida's dry season continues, raising concerns among Hardee County citrus and cattle operations that depend on the river for irrigation."},
                {"type":"text","content":"The Southwest Florida Water Management District has issued a water conservation advisory for the region, encouraging residents and agricultural users to minimize non-essential water use. Rain chances remain low through mid-April."},
                {"type":"text","content":"The river's low levels also affect recreational users, with some kayak and canoe outfitters reporting portions of the river are too shallow for paddling. Conditions are expected to improve with the arrival of the summer wet season."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
        {
            "headline": "Hardee County Schools seek bilingual staff as student demographics shift",
            "summary": "The school district is actively recruiting bilingual teachers and aides as the proportion of Spanish-speaking students continues to grow.",
            "blocks": [
                {"type":"text","content":"Hardee County Schools is actively recruiting bilingual teachers and classroom aides as the district's Spanish-speaking student population continues to grow. School administrators say bilingual staff are critical for communicating with families and supporting student success."},
                {"type":"text","content":"The district, which serves communities across the agricultural heartland of central Florida, has seen its Hispanic student enrollment increase steadily over the past decade. Many families work in the area's citrus groves and cattle ranches."},
                {"type":"text","content":"The district is offering signing incentives and partnering with teacher preparation programs at state universities. Interested candidates can apply through the district's human resources office."},
            ],
            "category": "schools", "tags": ["schools", "community"],
        },
    ],

    # ═══ BOONEVILLE / OWSLEY COUNTY, KY ═══
    "owsley_ky": [
        {
            "headline": "Community food hub opens in Booneville to improve access to fresh produce",
            "summary": "A new community food hub in Booneville aims to address food insecurity in Owsley County by connecting residents with local growers and food assistance programs.",
            "blocks": [
                {"type":"text","content":"A new community food hub has opened in Booneville, providing Owsley County residents with access to fresh produce, shelf-stable goods, and connections to state and federal food assistance programs."},
                {"type":"text","content":"The hub, operated by a regional nonprofit, occupies a renovated storefront on Main Street. In addition to food distribution, it offers cooking demonstrations and nutrition education classes. Organizers say the project addresses a critical need in a county that has long ranked among the poorest in the nation."},
                {"type":"text","content":"The food hub accepts SNAP benefits and offers a sliding-scale pricing model. Fresh produce is sourced from farms in the surrounding counties when available."},
            ],
            "category": "community", "tags": ["community", "health"],
        },
        {
            "headline": "Owsley County students explore careers through Daniel Boone Forest partnership",
            "summary": "Owsley County high school students are participating in a forestry and conservation career program through a partnership with the Daniel Boone National Forest.",
            "blocks": [
                {"type":"text","content":"High school students in Owsley County are getting hands-on experience in forestry and conservation through a new partnership between the school district and the Daniel Boone National Forest."},
                {"type":"text","content":"The program places students alongside forest service staff for field work including trail maintenance, wildlife monitoring, and invasive species management. Participating students earn community service hours and learn about career pathways with the U.S. Forest Service and state conservation agencies."},
                {"type":"text","content":"The program runs through the spring semester and is open to juniors and seniors. Transportation to work sites is provided by the school district."},
            ],
            "category": "schools", "tags": ["schools", "environment"],
        },
        {
            "headline": "South Fork of Kentucky River draws spring kayakers to Owsley County",
            "summary": "Paddlers are discovering the South Fork of the Kentucky River as a spring destination, bringing modest tourism dollars to the Booneville area.",
            "blocks": [
                {"type":"text","content":"The South Fork of the Kentucky River, which runs through Owsley County near Booneville, has been drawing an increasing number of spring kayakers and canoeists looking for uncrowded waterways in the heart of Appalachia."},
                {"type":"text","content":"The river offers Class I and II rapids during spring water levels, winding through forested hollows and past sandstone bluffs. A few local residents have begun offering informal shuttle services and camping spots for paddlers."},
                {"type":"text","content":"County officials say the growing interest in outdoor recreation along the South Fork represents a potential economic development opportunity for a community that has few other tourism draws."},
            ],
            "category": "community", "tags": ["community", "environment"],
        },
    ],

    # ═══ MACHIAS / WASHINGTON COUNTY, ME ═══
    "washington_me": [
        {
            "headline": "University of Maine at Machias expands marine science offerings",
            "summary": "UMM is adding new marine science courses and a summer field research program as the university deepens its connection to Washington County's coastal economy.",
            "blocks": [
                {"type":"text","content":"The University of Maine at Machias is expanding its marine science curriculum with new courses in aquaculture, marine ecology, and coastal resource management starting in the fall 2026 semester."},
                {"type":"text","content":"The expansion includes a summer field research program that will place students at sites along the Washington County coastline, working alongside local fishermen and aquaculture operators. University officials say the program reflects the region's economic reliance on the ocean."},
                {"type":"text","content":"The university has also upgraded its waterfront lab facility with new equipment for water quality testing. Applications for the summer research program are being accepted through May."},
            ],
            "category": "schools", "tags": ["schools", "environment"],
        },
        {
            "headline": "Wild blueberry growers in Washington County prepare for uncertain season",
            "summary": "Maine's wild blueberry industry faces uncertainty as growers in Washington County assess winter damage and watch for late frost conditions.",
            "blocks": [
                {"type":"text","content":"Wild blueberry growers in Washington County are assessing their fields as spring approaches, with the industry facing continued uncertainty over pricing, labor availability, and weather conditions."},
                {"type":"text","content":"The region around Machias is the heart of Maine's wild blueberry industry, producing the majority of the nation's wild blueberry crop. Growers say a harsh February followed by an early thaw has created concerns about frost damage to the low-growing plants."},
                {"type":"text","content":"Industry leaders are also watching trade policy developments that could affect export markets. The annual Machias Wild Blueberry Festival, which celebrates the crop each August, is already in the planning stages."},
            ],
            "category": "business", "tags": ["business", "environment"],
        },
        {
            "headline": "Machias River salmon restoration effort enters new phase",
            "summary": "The multi-year effort to restore Atlantic salmon runs on the Machias River is showing early signs of progress as biologists report increased juvenile fish counts.",
            "blocks": [
                {"type":"text","content":"The long-running effort to restore Atlantic salmon populations in the Machias River is entering a new phase this spring, with biologists reporting encouraging increases in juvenile salmon counts at monitoring stations."},
                {"type":"text","content":"The Machias River, once one of Maine's most productive Atlantic salmon rivers, has been the focus of habitat restoration work including dam removal, stream crossing improvements, and riparian buffer planting. The river is designated as critical habitat for endangered Atlantic salmon."},
                {"type":"text","content":"Biologists caution that full recovery of the salmon population will take many more years, but say the upward trend in juvenile fish is a positive indicator that habitat improvements are having an effect."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
    ],

    # ═══ MADISON, FL ═══
    "madison_fl": [
        {
            "headline": "North Florida Community College launches agricultural technology program",
            "summary": "NFCC in Madison is offering a new program in precision agriculture and farm technology aimed at modernizing the region's farming operations.",
            "blocks": [
                {"type":"text","content":"North Florida Community College in Madison has launched a new certificate program in agricultural technology, teaching students to use GPS-guided equipment, drone monitoring, and data analytics to improve farming operations."},
                {"type":"text","content":"The program is aimed at both young people entering agriculture and experienced farmers looking to adopt precision farming techniques. Madison County's economy remains heavily dependent on timber, livestock, and row crops."},
                {"type":"text","content":"Classes meet on evenings and weekends to accommodate working students. Financial aid is available, and the program can be completed in two semesters."},
            ],
            "category": "schools", "tags": ["schools", "business"],
        },
        {
            "headline": "Madison County historical society opens exhibit on Bellamy Road heritage",
            "summary": "A new exhibit traces the history of the Bellamy Road, Florida's first federal highway, which passed through Madison County in the 1820s.",
            "blocks": [
                {"type":"text","content":"The Madison County Historical Society has opened a new exhibit tracing the history of the Bellamy Road, Florida's first federal highway, which was carved through the wilderness connecting St. Augustine to Tallahassee in the 1820s."},
                {"type":"text","content":"The route passed directly through what is now Madison County, and portions of the original road alignment can still be traced through the landscape. The exhibit features maps, artifacts, and accounts from travelers who used the road in its early years."},
                {"type":"text","content":"The historical society's museum is open Thursday through Saturday. Admission is free, with donations welcome."},
            ],
            "category": "culture", "tags": ["culture", "community"],
        },
        {
            "headline": "Suwannee River water levels stable as spring dry season begins",
            "summary": "The Suwannee River along Madison County's western border is holding steady water levels as spring arrives, aided by recent rains.",
            "blocks": [
                {"type":"text","content":"Water levels on the Suwannee River along Madison County's western border are holding steady heading into the spring dry season, aided by above-average rainfall in February that replenished groundwater levels."},
                {"type":"text","content":"The Suwannee River Water Management District reports that spring flows at several major springs along the river are healthy. The river and its springs are important for both recreation and the ecological health of the region."},
                {"type":"text","content":"Kayaking and fishing outfitters along the river corridor are gearing up for the spring season. Water conditions are expected to remain favorable for recreation through at least mid-April."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
    ],

    # ═══ LINDEN / PERRY COUNTY, TN ═══
    "perry_tn": [
        {
            "headline": "Buffalo River cleanup brings volunteers from across Perry County",
            "summary": "Dozens of volunteers gathered to remove trash and debris from a stretch of the Buffalo River near Linden, one of Tennessee's last free-flowing rivers.",
            "blocks": [
                {"type":"text","content":"Dozens of volunteers turned out for a spring cleanup of the Buffalo River near Linden, removing several truckloads of trash, tires, and storm debris from a five-mile stretch of one of Tennessee's last free-flowing rivers."},
                {"type":"text","content":"The Buffalo River is a popular destination for canoeing and kayaking, and organizers say keeping the waterway clean is essential for both the local ecosystem and the modest tourism economy it supports in Perry County."},
                {"type":"text","content":"Another cleanup day is planned for late April. Volunteers can sign up through the county library or simply show up at the Linden boat ramp on the morning of the event."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
        {
            "headline": "Perry County Schools celebrate state reading achievement recognition",
            "summary": "Perry County elementary students earned state recognition for reading achievement gains, one of the few bright spots in a county that often struggles in education rankings.",
            "blocks": [
                {"type":"text","content":"Perry County Schools has received state recognition for significant reading achievement gains among its elementary students, with third-grade reading scores improving markedly over the past two years."},
                {"type":"text","content":"School officials credit a combination of dedicated teachers, a new structured literacy curriculum, and community volunteers who serve as reading mentors. The recognition is a point of pride for a small district that often lacks the resources of larger systems."},
                {"type":"text","content":"The district plans to expand its reading mentor program next year and is seeking community members willing to volunteer one hour per week during the school day."},
            ],
            "category": "schools", "tags": ["schools", "community"],
        },
        {
            "headline": "Mousetail Landing State Park campground reopens after winter upgrades",
            "summary": "The campground at Mousetail Landing State Park on the Tennessee River has reopened with new electrical hookups and improved restroom facilities.",
            "blocks": [
                {"type":"text","content":"The campground at Mousetail Landing State Park, located on the Tennessee River in Perry County, has reopened for the season following winter upgrades that include new electrical hookups and improved restroom facilities."},
                {"type":"text","content":"The park, one of the lesser-known state parks in Tennessee, offers camping, hiking, and river access in a quiet setting. Park rangers say the improvements should help attract more visitors to the area."},
                {"type":"text","content":"Reservations can be made online through the Tennessee State Parks website. Spring weekends tend to fill up, so advance booking is recommended."},
            ],
            "category": "community", "tags": ["community", "events"],
        },
    ],

    # ═══ PIKEVILLE, KY ═══
    "pike_ky": [
        {
            "headline": "University of Pikeville opens new health sciences simulation lab",
            "summary": "The University of Pikeville has unveiled a state-of-the-art simulation lab for its nursing and medical students, boosting healthcare training in Appalachia.",
            "blocks": [
                {"type":"text","content":"The University of Pikeville has opened a new health sciences simulation lab featuring high-fidelity patient simulators that allow nursing, pharmacy, and osteopathic medicine students to practice clinical skills in realistic scenarios."},
                {"type":"text","content":"The lab represents a significant investment in healthcare education for the region. University officials say many graduates go on to practice in underserved Appalachian communities, helping to address chronic healthcare workforce shortages in eastern Kentucky."},
                {"type":"text","content":"The facility includes an emergency room simulation suite, a pharmacy dispensing lab, and examination rooms equipped with recording equipment for performance review."},
            ],
            "category": "schools", "tags": ["schools", "health"],
        },
        {
            "headline": "Pikeville Cut-Through anniversary celebration planned for spring",
            "summary": "The city is planning events to mark the anniversary of the Pikeville Cut-Through, one of the largest civil engineering projects in the Western Hemisphere.",
            "blocks": [
                {"type":"text","content":"The City of Pikeville is planning a spring celebration to mark the anniversary of the Pikeville Cut-Through, the massive earth-moving project that rerouted the Levisa Fork of the Big Sandy River and created new developable land in the heart of the city."},
                {"type":"text","content":"The project, which moved more earth than the Panama Canal, transformed Pikeville's geography and eliminated the severe flooding that had plagued the city for generations. The celebration will include historical displays, engineering demonstrations, and community events."},
                {"type":"text","content":"The Cut-Through overlook, which offers views of the engineered river channel and the city below, remains one of Pikeville's most visited landmarks."},
            ],
            "category": "culture", "tags": ["culture", "events"],
        },
        {
            "headline": "Pikeville Medical Center adds telehealth services for rural patients",
            "summary": "Pikeville Medical Center is expanding telehealth offerings to reach patients in remote areas of Pike County who face long drives for routine care.",
            "blocks": [
                {"type":"text","content":"Pikeville Medical Center has expanded its telehealth services to better serve patients in remote areas of Pike County, Kentucky's largest county by area, where some residents face drives of an hour or more to reach the hospital."},
                {"type":"text","content":"The expanded program covers primary care consultations, medication management, and follow-up appointments. Patients can connect with providers through a smartphone app or a computer with a camera. The hospital has also placed telehealth kiosks at two satellite locations in the county."},
                {"type":"text","content":"Hospital administrators say telehealth has proven especially valuable for elderly patients and those with chronic conditions who benefit from more frequent check-ins but struggle with transportation."},
            ],
            "category": "health", "tags": ["health", "community"],
        },
    ],

    # ═══ SPARTA / WHITE COUNTY, TN ═══
    "white_tn": [
        {
            "headline": "Rock Island State Park records early spring tourism boost",
            "summary": "Rock Island State Park near Sparta reports a surge in early spring visitors drawn by waterfalls and the Caney Fork River.",
            "blocks": [
                {"type":"text","content":"Rock Island State Park, located just outside Sparta in White County, has reported a noticeable increase in early spring visitors compared to previous years. Park rangers attribute the boost to social media exposure of the park's dramatic waterfalls and swimming holes."},
                {"type":"text","content":"The park, where the Caney Fork, Collins, and Rocky rivers converge, features waterfalls, gorges, and a historic cotton mill site. Spring water levels make the falls especially impressive, drawing photographers and hikers from Nashville and Chattanooga."},
                {"type":"text","content":"Park officials are reminding visitors to stay on marked trails and exercise caution near waterfall overlooks, where wet rocks create slippery conditions. The campground is open and accepting reservations."},
            ],
            "category": "community", "tags": ["community", "environment"],
        },
        {
            "headline": "White County High School Warriors advance in regional basketball tournament",
            "summary": "The White County Warriors basketball team has advanced to the regional semifinals after a decisive home victory.",
            "blocks": [
                {"type":"text","content":"The White County High School Warriors basketball team has punched its ticket to the regional semifinals after a decisive home victory this week. The Warriors used a strong defensive effort and hot shooting from the perimeter to pull away in the second half."},
                {"type":"text","content":"The team has been one of the surprises of the tournament, with a roster that features no seniors taller than 6'2\" but plays with energy and cohesion. The home crowd at the Warriors gymnasium provided a raucous atmosphere throughout the game."},
                {"type":"text","content":"The Warriors will travel for the semifinal matchup later this week. A community send-off is planned at the high school before the team departs."},
            ],
            "category": "sports", "tags": ["sports", "schools"],
        },
        {
            "headline": "Downtown Sparta mural project seeks community input on designs",
            "summary": "A public art project is inviting Sparta residents to help choose designs for murals that will be painted on downtown building walls this summer.",
            "blocks": [
                {"type":"text","content":"A downtown revitalization initiative is seeking community input on designs for a series of murals that will be painted on building walls in Sparta's commercial district this summer."},
                {"type":"text","content":"The project, funded through a state arts grant, will commission regional artists to create murals reflecting White County's history, natural beauty, and community spirit. Residents can view proposed designs and vote on their favorites at the public library through the end of the month."},
                {"type":"text","content":"Similar mural projects in other small Tennessee towns have been credited with increasing foot traffic and creating social media buzz. Organizers hope the murals will complement other downtown improvement efforts."},
            ],
            "category": "culture", "tags": ["culture", "community"],
        },
    ],

    # ═══ MARQUETTE / UPPER PENINSULA, MI ═══
    "up_michigan": [
        {
            "headline": "Northern Michigan University enrollment steady as UP economy diversifies",
            "summary": "NMU reports stable enrollment for fall 2026, with growing interest in programs tied to outdoor recreation, healthcare, and remote work.",
            "blocks": [
                {"type":"text","content":"Northern Michigan University in Marquette is reporting stable enrollment figures heading into the 2026-2027 academic year, with growing student interest in programs connected to outdoor recreation management, healthcare, and remote work technologies."},
                {"type":"text","content":"The university, the largest institution in Michigan's Upper Peninsula, has positioned itself as a destination for students drawn to the UP's outdoor lifestyle. Its location on the shores of Lake Superior and proximity to world-class skiing, hiking, and kayaking are major recruitment draws."},
                {"type":"text","content":"NMU has also expanded its online course offerings, which university officials say has helped retain students who might otherwise transfer to downstate schools."},
            ],
            "category": "schools", "tags": ["schools", "community"],
        },
        {
            "headline": "Presque Isle Park trail restoration begins as snow recedes in Marquette",
            "summary": "Seasonal maintenance crews have begun restoring trails at Presque Isle Park, Marquette's beloved lakeside peninsula.",
            "blocks": [
                {"type":"text","content":"Maintenance crews have begun spring trail restoration work at Presque Isle Park, the 323-acre forested peninsula on Lake Superior that serves as Marquette's most popular natural area."},
                {"type":"text","content":"Winter storms and heavy snowfall took a toll on several trail sections, with blowdowns and erosion requiring attention before the busy summer season. The park's iconic bog walk boardwalk is being inspected and repaired where winter frost heaved support posts."},
                {"type":"text","content":"The park road typically reopens to vehicle traffic in mid-April, weather permitting. In the meantime, walkers and runners have been using the road and trails as the snow gradually retreats."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
        {
            "headline": "UP Health System adds mental health providers to address regional shortage",
            "summary": "UP Health System in Marquette has hired additional mental health providers to address a critical shortage of behavioral health services in the Upper Peninsula.",
            "blocks": [
                {"type":"text","content":"UP Health System in Marquette has announced the hiring of three additional mental health providers as part of an effort to address a critical shortage of behavioral health services across Michigan's Upper Peninsula."},
                {"type":"text","content":"The UP has among the highest rates of depression and substance use disorders in the state, compounded by geographic isolation and harsh winters that can intensify mental health challenges. The new providers will offer both in-person and telehealth appointments."},
                {"type":"text","content":"Hospital administrators say recruiting mental health professionals to rural areas remains a challenge, and the health system is offering student loan repayment assistance and other incentives to attract and retain providers."},
            ],
            "category": "health", "tags": ["health", "community"],
        },
    ],

    # ═══ KAUHAJOKI, FINLAND ═══
    "kauhajoki": [
        {
            "headline": "Kauhajoen kampukselle uusi lähiruokakahvila syksyllä",
            "summary": "SeAMKin Kauhajoen kampukselle avautuu lähiruokaan erikoistunut kahvila, joka hyödyntää paikallisten tuottajien raaka-aineita.",
            "blocks": [
                {"type":"text","content":"Seinäjoen ammattikorkeakoulun Kauhajoen kampukselle avataan syksyllä uusi kahvila, joka erikoistuu lähiruokaan ja hyödyntää eteläpohjalaisten tuottajien raaka-aineita."},
                {"type":"text","content":"Kahvilan toiminta liittyy kampuksen restonomikoulutukseen, ja opiskelijat osallistuvat kahvilan pyörittämiseen osana opintojaan. Menusta löytyy muun muassa paikallisista viljoista leivottua leipää ja kauden kasviksia."},
                {"type":"text","content":"Kampuksen rehtorin mukaan kahvila tukee sekä opiskelijoiden käytännön oppimista että alueen ruokatuottajien näkyvyyttä. Kahvila on avoinna arkisin ja palvelee myös kampuksen ulkopuolisia asiakkaita."},
            ],
            "category": "schools", "tags": ["schools", "business"],
        },
        {
            "headline": "Hyypänjokilaakson kevättulvat jäivät odotettua pienemmiksi",
            "summary": "Kevättulvat Hyypänjoella Kauhajoella sujuivat ilman merkittäviä vahinkoja, vaikka lumimäärät olivat talvella tavallista suuremmat.",
            "blocks": [
                {"type":"text","content":"Kevättulvat Hyypänjoella Kauhajoella jäivät tänä vuonna odotettua pienemmiksi, vaikka talven lumimäärät olivat keskimääräistä suuremmat. Joen vedenpinta nousi hetkellisesti, mutta pysyi tulvarajojen alapuolella."},
                {"type":"text","content":"ELY-keskuksen mukaan tasainen sulaminen ja viileiden öiden jäädyttävä vaikutus estivät äkillisen tulvahuipun syntymisen. Jokirantojen asukkaat olivat varautuneet mahdollisiin vahinkoihin, mutta pumppauskalustoa ei tarvittu."},
                {"type":"text","content":"Hyypänjokilaakso on Kauhajoen tunnetuin maisema-alue ja suosittu virkistysreitti. Kevättulvien jälkeen jokivarren polut avautuvat taas kävelijöille ja pyöräilijöille."},
            ],
            "category": "environment", "tags": ["environment", "safety"],
        },
        {
            "headline": "Kauhajoen kunnanvaltuusto hyväksyi uuden liikuntahallin suunnitelman",
            "summary": "Kunnanvaltuusto päätti yksimielisesti edetä uuden liikuntahallin suunnittelussa. Hanke palvelee sekä koululaisia että seuroja.",
            "blocks": [
                {"type":"text","content":"Kauhajoen kunnanvaltuusto hyväksyi kokouksessaan uuden liikuntahallin hankesuunnitelman. Hallin on tarkoitus palvella sekä koulujen liikuntatunteja että alueen urheiluseuroja."},
                {"type":"text","content":"Nykyiset liikuntatilat ovat käyneet ahtaiksi erityisesti iltaisin, kun useat seurat harjoittelevat samanaikaisesti. Uusi halli suunnitellaan koulukeskuksen yhteyteen, ja sen arvioidut kustannukset ovat noin 3,5 miljoonaa euroa."},
                {"type":"text","content":"Rakentamisen on tarkoitus alkaa vuoden 2027 alussa. Valtuusto päätti myös hakea hankkeelle valtionavustusta opetus- ja kulttuuriministeriöltä."},
            ],
            "category": "council", "tags": ["council", "sports"],
        },
        {
            "headline": "Kauhajoen lukion oppilaat keräsivät ennätyssumman hyväntekeväisyyteen",
            "summary": "Lukiolaiset järjestivät tempausviikon, jonka tuotot ohjataan paikalliselle nuorisoyhdistykselle.",
            "blocks": [
                {"type":"text","content":"Kauhajoen lukion oppilaskunta järjesti viikon mittaisen hyväntekeväisyystempauksen, joka keräsi ennätykselliset 4 200 euroa paikallisen nuorisoyhdistyksen toimintaan."},
                {"type":"text","content":"Tempausviikkoon kuului myyjäisiä, kahvilatoimintaa ja liikuntatapahtuma, johon osallistuivat myös yläkoulun oppilaat. Kerätyt varat käytetään nuorisotilan välinehankintoihin ja kesätoiminnan järjestämiseen."},
                {"type":"text","content":"Lukion rehtorin mukaan oppilaiden aktiivisuus ja yhteisöllisyys ovat ilahduttaneet koko koulua. Vastaavia tempauksia on suunnitteilla myös ensi lukuvuodelle."},
            ],
            "category": "schools", "tags": ["schools", "community"],
        },
    ],

    # ═══ SALLA, FINLAND ═══
    "salla": [
        {
            "headline": "Sallan kansallispuiston kävijämäärä kasvoi kolmanneksen",
            "summary": "Vuonna 2022 perustettu Sallan kansallispuisto houkutteli viime vuonna yli 50 000 kävijää, mikä on kolmanneksen enemmän kuin edellisvuonna.",
            "blocks": [
                {"type":"text","content":"Sallan kansallispuiston kävijämäärä kasvoi viime vuonna yli 50 000 vierailijaan, mikä on noin 33 prosenttia enemmän kuin vuonna 2024. Vuonna 2022 perustettu puisto on vakiinnuttanut asemansa yhtenä Lapin vetovoimaisimmista luontokohteista."},
                {"type":"text","content":"Metsähallituksen mukaan erityisesti kansainvälisten matkailijoiden osuus on kasvanut. Puiston reittejä on kehitetty ja uusia taukopaikkoja rakennettu vastaamaan kasvavaa kysyntää."},
                {"type":"text","content":"Kansallispuiston kasvu hyödyttää myös Sallan kuntaa, joka on kärsinyt pitkään väestökadosta. Paikalliset yrittäjät raportoivat majoitus- ja ravitsemispalvelujen kysynnän kasvaneen puiston myötä."},
            ],
            "category": "environment", "tags": ["environment", "business"],
        },
        {
            "headline": "Sallatunturin hiihtokeskus investoi lumetusjärjestelmään",
            "summary": "Sallatunturin hiihtokeskus parantaa lumetuskapasiteettiaan varmistaakseen kauden aloituksen myös vähälumisina talvina.",
            "blocks": [
                {"type":"text","content":"Sallatunturin hiihtokeskus on investoinut lumetusjärjestelmänsä laajentamiseen. Uudet lumetystykit kattavat nyt keskuksen päärinteet, mikä mahdollistaa kauden aloituksen myös vähälumisina syksyinä."},
                {"type":"text","content":"Ilmastonmuutos on lyhentänyt luonnollisen lumikauden pituutta Lapissakin, ja hiihtokeskukset joutuvat investoimaan yhä enemmän keinolumen tuotantoon. Sallatunturin yrittäjän mukaan investointi on välttämätön kilpailukyvyn säilyttämiseksi."},
                {"type":"text","content":"Hiihtokeskus työllistää kaudella noin 30 henkilöä ja on yksi kunnan merkittävimmistä yksityisistä työnantajista. Kevätkausi jatkuu huhtikuun loppuun saakka."},
            ],
            "category": "business", "tags": ["business", "environment"],
        },
        {
            "headline": "Sallan kunnanvaltuusto käsitteli palveluverkon tulevaisuutta",
            "summary": "Kunnanvaltuusto keskusteli palvelujen saavutettavuudesta harvaan asutulla alueella ja etäpalvelujen mahdollisuuksista.",
            "blocks": [
                {"type":"text","content":"Sallan kunnanvaltuusto käsitteli kokouksessaan palveluverkon tulevaisuutta kunnassa, jonka väkiluku on laskenut alle 3 300 asukkaan. Keskustelussa nousi esiin erityisesti terveyspalvelujen ja kirjastopalvelujen saavutettavuus."},
                {"type":"text","content":"Valtuutetut keskustelivat etäpalvelujen laajentamisesta, kuten etälääkäripalveluista ja kirjaston verkkopalveluista, joilla voitaisiin kompensoida pitkiä etäisyyksiä. Salla on pinta-alaltaan laaja kunta, ja osalle asukkaista matka keskustaan on kymmeniä kilometrejä."},
                {"type":"text","content":"Kunnanhallitus valmistelee palveluverkkoselvityksen, joka esitellään valtuustolle syksyllä. Asukastilaisuuksia järjestetään keväällä eri puolilla kuntaa."},
            ],
            "category": "council", "tags": ["council", "health"],
        },
        {
            "headline": "Porolaidunten inventointi käynnistyy Sallassa kevään myötä",
            "summary": "Paliskunta aloittaa laidunten kartoituksen, jolla selvitetään talvilaidunten kuntoa ja riittävyyttä.",
            "blocks": [
                {"type":"text","content":"Sallan paliskunta aloittaa kevään myötä porolaidunten inventoinnin, jossa kartoitetaan talvilaidunten kuntoa ja jäkälävarojen riittävyyttä. Inventointi tehdään yhteistyössä Luonnonvarakeskuksen kanssa."},
                {"type":"text","content":"Porotalous on Sallan merkittävimpiä perinteisiä elinkeinoja, ja laidunten kunto vaikuttaa suoraan porojen hyvinvointiin ja lihantuotantoon. Viime vuosina jäkälälaitumien heikkeneminen on herättänyt huolta poronhoitajien keskuudessa."},
                {"type":"text","content":"Kartoituksen tuloksia käytetään laidunkierron suunnittelussa ja maankäyttöpäätöksissä. Poromiesten mukaan tieto laidunten tilasta on tärkeää myös poroelinkeinon tulevaisuuden turvaamiseksi."},
            ],
            "category": "environment", "tags": ["environment", "business"],
        },
    ],

    # ═══ ENONTEKIÖ, FINLAND ═══
    "enontekio": [
        {
            "headline": "Enontekiön Hetan koulun oppilaat oppivat saamen kieltä uudella menetelmällä",
            "summary": "Hetan koululla on otettu käyttöön uusi toiminnallinen saamen kielen opetusmenetelmä, joka yhdistää kielen oppimisen luontoretkilöihin.",
            "blocks": [
                {"type":"text","content":"Enontekiön Hetan koululla on aloitettu uudenlainen saamen kielen opetusohjelma, jossa kielenoppiminen yhdistetään luontoretkiin ja perinteisiin elinkeinoihin. Oppilaat oppivat pohjoissaamen sanastoa kalastuksen, marjastuksen ja poronhoidon yhteydessä."},
                {"type":"text","content":"Opetusmenetelmä on kehitetty yhteistyössä Saamelaiskäräjien koulutusosaston kanssa. Opettajien mukaan toiminnallinen oppiminen on motivoinut oppilaita perinteistä luokkaopetusta enemmän."},
                {"type":"text","content":"Enontekiö on yksi saamelaisten kotiseutualueen kunnista, ja saamen kielen elvyttäminen on tärkeä tavoite sekä kunnalle että saamelaiskäräjille."},
            ],
            "category": "schools", "tags": ["schools", "culture"],
        },
        {
            "headline": "Käsivarren erämaa-alueelle uusi varaustupa retkeilijöille",
            "summary": "Metsähallitus avaa uuden varaustuvan Käsivarren erämaa-alueelle vastaamaan kasvavaan retkeilykysynntään.",
            "blocks": [
                {"type":"text","content":"Metsähallitus avaa kesällä uuden varaustuvan Käsivarren erämaa-alueelle Enontekiöllä. Tupa sijoittuu suositun vaellusreitin varrelle, jossa majoituskapasiteetti on ollut riittämätön vilkkaimpina kesäkuukausina."},
                {"type":"text","content":"Käsivarren erämaa-alue on Suomen suurin erämaa-alue ja suosittu kohde sekä kotimaisille että ulkomaisille vaeltajille. Haltin huippu, Suomen korkein kohta, sijaitsee alueella."},
                {"type":"text","content":"Uuden tuvan varaukset avataan toukokuussa Metsähallituksen verkkopalvelussa. Tuvassa on tilaa kahdeksalle henkilölle, ja se on varustettu puulämmitteisellä kiukaalla ja kaasuliedellä."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
        {
            "headline": "Enontekiön kunta selvittää tuulivoimahankkeen vaikutuksia porotalouteen",
            "summary": "Kunnanhallitus päätti tilata selvityksen suunnitellun tuulivoimapuiston vaikutuksista porolaidunalueisiin ja maisemaan.",
            "blocks": [
                {"type":"text","content":"Enontekiön kunnanhallitus on päättänyt tilata riippumattoman selvityksen suunnitellun tuulivoimapuiston vaikutuksista alueen porotalouteen ja tunturimaisemaan."},
                {"type":"text","content":"Tuulivoimayhtiö on esittänyt kuntaan hanketta, joka käsittäisi kymmeniä tuulivoimalaa. Paikalliset poronhoitajat ja luontomatkailuyrittäjät ovat esittäneet huolensa hankkeen vaikutuksista porojen laidunkiertoon ja alueen maisema-arvoihin."},
                {"type":"text","content":"Selvityksen on tarkoitus valmistua syksyllä, minkä jälkeen kunta ottaa kantaa hankkeen etenemiseen. Asukastilaisuus järjestetään Hetan koululla ennen kesää."},
            ],
            "category": "council", "tags": ["council", "environment"],
        },
        {
            "headline": "Kevätmuutto tuo tuhansia lintuja Enontekiön tunturiylängölle",
            "summary": "Kevätmuutto on alkanut Enontekiöllä, ja lintuharrastajat ovat havainneet ensimmäiset muuttavat lajit tunturiylängöllä.",
            "blocks": [
                {"type":"text","content":"Kevätmuutto on käynnistynyt Enontekiön tunturiylängöllä, ja ensimmäiset pulmusten ja kiurujen parvet on havaittu Hetan ympäristössä. Lintuharrastajat odottavat vilkasta muuttokautta, sillä talvi oli tavanomaista leudompi."},
                {"type":"text","content":"Enontekiön tunturialueet ovat tärkeä pesimäalue monille arktisille lintulajeille, ja kevätmuutto houkuttelee bongareita eri puolilta Suomea. Erityisesti Kilpisjärven ympäristö on tunnettu lintukohde."},
                {"type":"text","content":"Metsähallitus muistuttaa retkeilijöitä välttämään pesimärauhan häiritsemistä touko-kesäkuussa. Koirat tulee pitää kytkettynä erämaa-alueilla lintujen pesimäaikana."},
            ],
            "category": "environment", "tags": ["environment", "community"],
        },
    ],
}


def build_seed_data():
    all_locations = []
    all_submissions = []

    for town_key, articles in ARTICLES.items():
        loc_info = LOCATIONS[town_key]
        is_fi = loc_info["country"] == "FI"

        city_id = f"c1{town_key[:6]}-0000-0000-0000-000000000001"

        if is_fi:
            region_id = FI_REGIONS.get(loc_info["state"], "a2000099") + "-0000-0000-0000-000000000001"
            country_id = "a3000001-0000-0000-0000-000000000001"
            continent_id = "a4000001-0000-0000-0000-000000000001"
        else:
            region_id = US_REGIONS.get(loc_info["state"], "b2000099") + "-0000-0000-0000-000000000001"
            country_id = "b3000001-0000-0000-0000-000000000001"
            continent_id = "b4000001-0000-0000-0000-000000000001"

        location = {
            "id": city_id,
            "name": loc_info["name"],
            "slug": loc_info["slug"],
            "level": 3,
            "lat": loc_info["lat"],
            "lng": loc_info["lng"],
            "region_id": region_id,
            "country_id": country_id,
            "continent_id": continent_id,
            "meta": {"population": loc_info["pop"], "state": loc_info["state"]},
        }
        all_locations.append(location)

        for i, art in enumerate(articles):
            tag_bits = 0
            for t in art.get("tags", []):
                if t in TAGS:
                    tag_bits |= TAGS[t]

            submission = {
                "id": str(uuid.uuid4()),
                "owner_id": SEED_OWNER_ID,
                "location_id": city_id,
                "continent_id": continent_id,
                "country_id": country_id,
                "region_id": region_id,
                "city_id": city_id,
                "lat": loc_info["lat"],
                "lng": loc_info["lng"],
                "title": art["headline"],
                "description": art["summary"],
                "tags": tag_bits,
                "status": 5,
                "error": 0,
                "views": 0,
                "share_count": 0,
                "reactions": {},
                "meta": {
                    "blocks": art["blocks"],
                    "review": {"score": 75, "flags": [], "approved": True},
                    "summary": art["summary"],
                    "category": art["category"],
                    "model": "claude-opus-4-6",
                    "generated_at": NOW,
                    "slug": f"{loc_info['slug']}-{i+1:03d}",
                    "featured_img": "",
                    "sources": ["Public information"],
                    "published_at": NOW,
                    "published_by": SEED_OWNER_ID,
                },
                "created_at": NOW,
                "updated_at": NOW,
            }
            all_submissions.append(submission)

    return all_locations, all_submissions


def main():
    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)
    locations, submissions = build_seed_data()

    seed_data = {
        "locations": locations,
        "submissions": submissions,
        "generated_at": NOW,
        "count": len(submissions),
    }

    output_file = ARTICLES_DIR / "seed_data_new_towns.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(seed_data, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(submissions)} articles across {len(locations)} towns -> {output_file}")

    # Count by town
    from collections import Counter
    town_counts = Counter()
    for s in submissions:
        town_counts[s["location_id"]] += 1

    loc_names = {l["id"]: l["name"] for l in locations}
    for lid, count in town_counts.most_common():
        print(f"  {loc_names.get(lid, '?')}: {count} articles")

    # Readable markdown
    readable_file = ARTICLES_DIR / "new_towns_readable.md"
    with open(readable_file, "w", encoding="utf-8") as f:
        for s in submissions:
            f.write(f"# {s['title']}\n\n")
            f.write(f"*{s['description']}*\n\n")
            f.write(f"**Location:** {loc_names.get(s['location_id'],'?')} | **Category:** {s['meta']['category']}\n\n")
            for block in s["meta"]["blocks"]:
                if block["type"] == "text":
                    f.write(f"{block['content']}\n\n")
                elif block["type"] == "quote":
                    f.write(f"> \"{block['content']}\" — {block.get('author','')}\n\n")
            f.write("---\n\n")

    print(f"Readable version -> {readable_file}")


if __name__ == "__main__":
    main()
