-- Seed data for development — Kirkkonummi demo

-- Locations hierarchy: Europe > Finland > Uusimaa > Kirkkonummi + neighborhoods
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Europe', 'europe', 0, NULL, 'europe', 'European continent', true, 54.526, 15.2551),
  ('a0000000-0000-0000-0000-000000000002', 'Finland', 'finland', 1, 'a0000000-0000-0000-0000-000000000001', 'europe/finland', 'Republic of Finland', true, 61.9241, 25.7482),
  ('a0000000-0000-0000-0000-000000000003', 'Uusimaa', 'uusimaa', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/uusimaa', 'Uusimaa region', true, 60.25, 24.93),
  ('a0000000-0000-0000-0000-000000000004', 'Kirkkonummi', 'kirkkonummi', 3, 'a0000000-0000-0000-0000-000000000003', 'europe/finland/uusimaa/kirkkonummi', 'Municipality of Kirkkonummi / Kyrkslätt', true, 60.1233, 24.4397),
  ('a0000000-0000-0000-0000-000000000005', 'Masala', 'masala', 4, 'a0000000-0000-0000-0000-000000000004', 'europe/finland/uusimaa/kirkkonummi/masala', 'Masala district, Kirkkonummi', true, 60.1508, 24.5141),
  ('a0000000-0000-0000-0000-000000000006', 'Veikkola', 'veikkola', 4, 'a0000000-0000-0000-0000-000000000004', 'europe/finland/uusimaa/kirkkonummi/veikkola', 'Veikkola village, Kirkkonummi', true, 60.2500, 24.4500)
ON CONFLICT (slug) DO NOTHING;

-- Test accounts (password: "editor123")
-- bcrypt hash for "editor123" with default cost
INSERT INTO profiles (id, profile_name, email, password_hash, role, permissions, location_id, public)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Maria Virtanen', 'maria@localnews.dev',
   decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
   1, 7, 'a0000000-0000-0000-0000-000000000004', true),
  ('b0000000-0000-0000-0000-000000000002', 'Antti Korhonen', 'antti@localnews.dev',
   decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
   0, 1, 'a0000000-0000-0000-0000-000000000005', true),
  ('b0000000-0000-0000-0000-000000000003', 'Lena Sjöberg', 'lena@localnews.dev',
   decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
   0, 1, 'a0000000-0000-0000-0000-000000000004', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Article 1: Council / news — budget debate
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'Council Approves €12M School Renovation Plan After Heated Debate',
  'Kirkkonummi council meeting March 3rd, school renovation vote.',
  5,
  '2026-03-03 19:30:00+02',
  '2026-03-03 20:15:00+02',
  '{
    "article_markdown": "# Council Approves €12M School Renovation Plan After Heated Debate\n\nThe Kirkkonummi municipal council voted 31–20 on Monday evening to approve a €12 million renovation plan for three primary schools in the municipality.\n\nThe plan covers Kirkkoharjun koulu, Veikkolan koulu, and Gesterbyn koulu. Work is expected to begin in autumn 2026 and take approximately two years to complete.\n\n\"These buildings have served our children for decades, but indoor air quality issues can no longer be patched over,\" said council chair Matti Järvinen during the session.\n\nThe opposition pushed for a phased approach, arguing that committing to all three schools simultaneously puts pressure on the municipal budget. Council member Päivi Laaksonen called the timeline \"ambitious but achievable\" if construction contracts are awarded competitively.\n\nThe renovation will temporarily displace approximately 900 students. The municipality plans to use modular classrooms on school grounds during the construction period.\n\nResidents can view the full renovation plans at the Kirkkonummi town hall or on the municipality''s website.",
    "article_metadata": {"chosen_structure": "news_report", "category": "council", "confidence": 0.92, "missing_context": []},
    "summary": "Kirkkonummi council votes 31-20 to approve €12M renovation of three primary schools.",
    "category": "council",
    "review": {
      "verification": [{"claim": "voted 31-20", "evidence": "confirmed in transcript", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.9, "perspectives": 0.8, "representation": 0.85, "ethical_framing": 0.9, "cultural_context": 0.8, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Strong factual reporting with multiple perspectives from the council session.", "suggestions": ["Consider reaching out to parent associations for reaction quotes."]}
    },
    "place_name": "Kirkkonummi",
    "published_at": "2026-03-03T20:15:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 2: Business / feature — new bakery
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000005',
  'From Helsinki Kitchen to Masala Storefront: Leipomo Ahola Opens This Weekend',
  'New bakery opening in Masala, interviewed the owner.',
  5,
  '2026-03-05 14:00:00+02',
  '2026-03-05 15:30:00+02',
  '{
    "article_markdown": "# From Helsinki Kitchen to Masala Storefront: Leipomo Ahola Opens This Weekend\n\nA new artisan bakery is opening its doors on Masalantie this Saturday, bringing sourdough bread and Finnish pastries to the growing Masala district.\n\nLeipomo Ahola is the project of Sanna Ahola, 34, who has spent the past three years selling her bread at Helsinki farmers'' markets. She says the move to Masala was driven by both lower rents and a personal connection to the area.\n\n\"I grew up in Kirkkonummi. When this space became available, it felt like coming home,\" Ahola said. \"Masala is growing fast, and people here want good bread without driving to Leppävaara.\"\n\nThe bakery will offer sourdough loaves, karjalanpiirakka, korvapuusti, and seasonal pastries. Ahola plans to source grain from farms in the Uusimaa region when possible.\n\nThe opening weekend will feature free coffee with any purchase. Leipomo Ahola is located at Masalantie 12 and will be open Tuesday through Saturday, 7:00–16:00.",
    "article_metadata": {"chosen_structure": "feature", "category": "business", "confidence": 0.95, "missing_context": []},
    "summary": "Artisan bakery Leipomo Ahola opens in Masala this Saturday, run by Kirkkonummi native Sanna Ahola.",
    "category": "business",
    "review": {
      "verification": [{"claim": "opening this Saturday", "evidence": "confirmed by owner", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.95, "perspectives": 0.7, "representation": 0.8, "ethical_framing": 0.9, "cultural_context": 0.85, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Lovely feature that captures both the personal story and the practical details readers need.", "suggestions": ["A quote from a neighboring business owner could add community context."]}
    },
    "place_name": "Masala",
    "published_at": "2026-03-05T15:30:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 3: Community — volunteer trail cleanup
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'Fifty Volunteers Clear Storm Damage from Meiko Nature Reserve Trails',
  'Volunteer cleanup at Meiko after February storms.',
  5,
  '2026-03-01 16:00:00+02',
  '2026-03-01 17:00:00+02',
  '{
    "article_markdown": "# Fifty Volunteers Clear Storm Damage from Meiko Nature Reserve Trails\n\nApproximately fifty volunteers gathered at Meiko nature reserve on Saturday to clear fallen trees and debris left by the February storms.\n\nThe cleanup was organized by Kirkkonummen Luonto ry, the local nature association, which put out a call for help after municipal crews prioritized road clearing over recreational trails.\n\n\"Some of the trails were completely blocked. One birch had fallen across the boardwalk near the lake,\" said organizer Tuula Mäkinen. \"We had people from age 12 to 75 out here with chainsaws and wheelbarrows.\"\n\nThe group cleared approximately four kilometers of trails over six hours. The municipality provided waste containers for the collected debris.\n\nMeiko nature reserve is one of Kirkkonummi''s most popular outdoor areas, drawing hikers and birdwatchers year-round. The trails are now fully passable, according to Mäkinen.\n\nThe nature association plans a second cleanup day on March 15 to address trails in the Porkkala area. Volunteers can sign up through the association''s website.",
    "article_metadata": {"chosen_structure": "news_report", "category": "community", "confidence": 0.88, "missing_context": []},
    "summary": "Fifty volunteers cleared storm-damaged trails at Meiko nature reserve in a six-hour community effort.",
    "category": "community",
    "review": {
      "verification": [{"claim": "approximately fifty volunteers", "evidence": "confirmed by organizer", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.85, "perspectives": 0.75, "representation": 0.8, "ethical_framing": 0.9, "cultural_context": 0.85, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Well-reported community story with good details on scope and impact.", "suggestions": ["Including the municipality''s response or timeline for their own trail work would add useful context."]}
    },
    "place_name": "Kirkkonummi",
    "published_at": "2026-03-01T17:00:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 4: Events — spring market
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  'Kirkkonummi Spring Market Returns to Town Square March 15',
  'Annual spring market announcement.',
  5,
  '2026-03-06 10:00:00+02',
  '2026-03-06 10:30:00+02',
  '{
    "article_markdown": "# Kirkkonummi Spring Market Returns to Town Square March 15\n\nThe annual Kirkkonummi spring market will take place on Saturday, March 15, from 9:00 to 15:00 at the town hall square.\n\nThis year''s market will feature over 40 vendors selling handmade crafts, local food products, and second-hand goods. New this year is a dedicated section for local farms selling directly to consumers.\n\n\"We had 35 vendors last year and the feedback was that people wanted more food producers,\" said market organizer Riikka Holm. \"This year we''ve added a farm corner with five producers from Kirkkonummi and neighboring Siuntio.\"\n\nThe market will also include live music from Kirkkonummen musiikkiopisto students performing at 11:00 and 13:00.\n\nParking is available at the town hall parking area and the adjacent school lot. The market runs rain or shine.",
    "article_metadata": {"chosen_structure": "brief", "category": "events", "confidence": 0.93, "missing_context": []},
    "summary": "Annual spring market on March 15 at Kirkkonummi town square with 40+ vendors and live music.",
    "category": "events",
    "review": {
      "verification": [{"claim": "March 15, 9:00-15:00", "evidence": "confirmed by organizer", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.9, "perspectives": 0.7, "representation": 0.8, "ethical_framing": 0.95, "cultural_context": 0.85, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Clear and informative event announcement with all the practical details readers need.", "suggestions": []}
    },
    "place_name": "Kirkkonummi",
    "published_at": "2026-03-06T10:30:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 5: Sports — local football
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000005',
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004',
  'KoPa Secures Promotion to Kakkonen After Playoff Win',
  'Kirkkonummen Palloseura promotion match.',
  5,
  '2026-03-02 18:00:00+02',
  '2026-03-02 19:00:00+02',
  '{
    "article_markdown": "# KoPa Secures Promotion to Kakkonen After Playoff Win\n\nKirkkonummen Palloseura (KoPa) earned promotion to the Kakkonen league on Sunday after a 2–1 victory over JäPS in the promotion playoff at Kirkkonummen liikuntapuisto.\n\nGoals from Mikko Rantala in the 23rd minute and Juuso Lehto in the 67th minute sealed the result, with JäPS pulling one back in added time through a penalty.\n\n\"This is what we''ve been building toward for three seasons,\" said head coach Timo Salonen. \"The players showed real character, especially in the second half when JäPS pushed hard for an equalizer.\"\n\nApproximately 450 supporters attended the match, a record for the club. KoPa will begin their Kakkonen campaign in May.\n\nThe club is holding an open training session next Saturday for anyone interested in joining the youth academy.",
    "article_metadata": {"chosen_structure": "news_report", "category": "sports", "confidence": 0.9, "missing_context": []},
    "summary": "KoPa wins 2-1 playoff to earn promotion to Kakkonen league, club''s highest-ever division.",
    "category": "sports",
    "review": {
      "verification": [{"claim": "2-1 victory", "evidence": "confirmed in match report", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.9, "perspectives": 0.75, "representation": 0.8, "ethical_framing": 0.9, "cultural_context": 0.8, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Good match report with key details: scorers, attendance, and coach reaction.", "suggestions": ["A quote from one of the goalscorers would add player perspective."]}
    },
    "place_name": "Kirkkonummi",
    "published_at": "2026-03-02T19:00:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 6: Schools — bilingual education
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000006',
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'Swedish-Language Classes See Record Enrollment in Kirkkonummi Schools',
  'Growing interest in Swedish-language education.',
  5,
  '2026-03-04 12:00:00+02',
  '2026-03-04 13:00:00+02',
  '{
    "article_markdown": "# Swedish-Language Classes See Record Enrollment in Kirkkonummi Schools\n\nEnrollment in Kirkkonummi''s Swedish-language primary schools has risen 18% over the past two years, according to figures released by the municipal education department.\n\nWinellska skolan and Bobäcks skola both report waiting lists for the first time, with a combined 40 families on the lists for the 2026–2027 school year.\n\n\"It''s partly families moving from Helsinki who want their children to grow up bilingual,\" said education director Katarina Eklund. \"Kirkkonummi has always been a bilingual municipality, but we''re seeing Finnish-speaking families actively choosing Swedish-language education.\"\n\nThe trend mirrors a broader national pattern. Statistics Finland data shows Swedish-language school enrollment has grown in the Helsinki metropolitan area even as the overall Swedish-speaking population share has remained stable.\n\nThe municipality is evaluating whether to open an additional Swedish-language class at Gesterbyn koulu to meet demand. A decision is expected by April.\n\nKirkkonummi is officially bilingual, with approximately 15% of residents speaking Swedish as their first language.",
    "article_metadata": {"chosen_structure": "news_report", "category": "schools", "confidence": 0.87, "missing_context": ["exact enrollment numbers per school"]},
    "summary": "Swedish-language school enrollment up 18% in Kirkkonummi as bilingual demand grows.",
    "category": "schools",
    "review": {
      "verification": [{"claim": "risen 18%", "evidence": "municipal education department figures", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.85, "perspectives": 0.8, "representation": 0.85, "ethical_framing": 0.9, "cultural_context": 0.9, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Excellent use of both local and national data to give context to the enrollment trend.", "suggestions": ["A parent perspective on why they chose Swedish-language education would strengthen the piece."]}
    },
    "place_name": "Kirkkonummi",
    "published_at": "2026-03-04T13:00:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 7: News — E18 roadwork
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000007',
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000006',
  'E18 Lane Closures Between Veikkola and Muijala Start Monday',
  'Roadwork on Turku motorway affecting Veikkola commuters.',
  5,
  '2026-03-06 16:00:00+02',
  '2026-03-06 16:30:00+02',
  '{
    "article_markdown": "# E18 Lane Closures Between Veikkola and Muijala Start Monday\n\nVäylävirasto has announced lane closures on the E18 Turku motorway between the Veikkola and Muijala interchanges starting Monday, March 10.\n\nThe roadwork involves resurfacing a 4.5-kilometer stretch and is expected to last three weeks, weather permitting. One lane in each direction will remain open throughout.\n\nCommuters should expect delays of 10–20 minutes during peak hours (7:00–9:00 and 15:30–17:30), according to the road authority.\n\n\"We scheduled this for early spring to avoid the heaviest summer traffic,\" said project manager Jari Nieminen from Väylävirasto. \"The surface damage from this winter was more extensive than usual.\"\n\nDrivers are advised to consider alternative routes via Upinniementie or to adjust commute times where possible. Real-time traffic updates are available through the Fintraffic app.",
    "article_metadata": {"chosen_structure": "brief", "category": "news", "confidence": 0.94, "missing_context": []},
    "summary": "Three weeks of E18 lane closures between Veikkola and Muijala starting March 10.",
    "category": "news",
    "review": {
      "verification": [{"claim": "starting Monday March 10", "evidence": "Väylävirasto announcement", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.95, "perspectives": 0.7, "representation": 0.8, "ethical_framing": 0.9, "cultural_context": 0.8, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Practical, well-sourced traffic news with all the details commuters need.", "suggestions": []}
    },
    "place_name": "Veikkola",
    "published_at": "2026-03-06T16:30:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Article 8: Community — library event
INSERT INTO submissions (id, owner_id, location_id, title, description, status, created_at, updated_at, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000008',
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004',
  'Kirkkonummi Library Launches Free Digital Skills Workshops for Seniors',
  'Library starting tablet and phone workshops.',
  5,
  '2026-03-05 11:00:00+02',
  '2026-03-05 11:30:00+02',
  '{
    "article_markdown": "# Kirkkonummi Library Launches Free Digital Skills Workshops for Seniors\n\nKirkkonummi main library is launching a weekly workshop series to help seniors navigate smartphones, tablets, and online public services.\n\nThe workshops begin Thursday, March 13, and run every Thursday from 13:00 to 15:00 through May. Each session covers a specific topic: mobile banking, using OmaKanta health records, video calling family members, and avoiding online scams.\n\n\"We see people come in every week who can''t access services that have moved online,\" said librarian Hanna Lehtonen. \"The goal isn''t to make everyone a tech expert — it''s to help people do the things they need to do.\"\n\nThe workshops are free and no registration is required. Participants can bring their own devices or use the library''s tablets. Volunteer helpers from Kirkkonummen lukio will assist alongside library staff.\n\nThe program is funded by a grant from the Regional State Administrative Agency.",
    "article_metadata": {"chosen_structure": "brief", "category": "community", "confidence": 0.91, "missing_context": []},
    "summary": "Free weekly digital skills workshops for seniors start March 13 at Kirkkonummi library.",
    "category": "community",
    "review": {
      "verification": [{"claim": "begin March 13", "evidence": "confirmed by librarian", "status": "SUPPORTED"}],
      "scores": {"evidence": 0.9, "perspectives": 0.7, "representation": 0.85, "ethical_framing": 0.9, "cultural_context": 0.85, "manipulation": 0.95},
      "gate": "GREEN",
      "red_triggers": [],
      "yellow_flags": [],
      "coaching": {"celebration": "Clear service journalism — readers know exactly what, when, where, and how to participate.", "suggestions": []}
    },
    "place_name": "Kirkkonummi",
    "published_at": "2026-03-05T11:30:00+02:00"
  }'
)
ON CONFLICT (id) DO NOTHING;
