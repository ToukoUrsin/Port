-- Seed data: locations and pre-generated articles for demo
-- Run after database migration

-- ============================================================
-- LOCATIONS (hierarchical: continent > country > region > city)
-- ============================================================

INSERT INTO locations (id, name, slug, level, parent_id, path, description, lat, lng, is_active) VALUES
-- Continent
('a0000000-0000-0000-0000-000000000001', 'Europe', 'europe', 0, NULL, 'europe', 'Europe', 54.5260, 15.2551, TRUE),
-- Country
('a0000000-0000-0000-0000-000000000002', 'Suomi', 'suomi', 1, 'a0000000-0000-0000-0000-000000000001', 'europe/suomi', 'Finland', 61.9241, 25.7482, TRUE),
-- Region
('a0000000-0000-0000-0000-000000000010', 'Lappi', 'lappi', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/suomi/lappi', 'Lapland region', 66.5000, 25.7500, TRUE),
('a0000000-0000-0000-0000-000000000011', 'Uusimaa', 'uusimaa', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/suomi/uusimaa', 'Uusimaa region', 60.2500, 24.7500, TRUE),
-- Cities/Municipalities
('b0000000-0000-0000-0000-000000000001', 'Pelkosenniemi', 'pelkosenniemi', 3, 'a0000000-0000-0000-0000-000000000010', 'europe/suomi/lappi/pelkosenniemi', 'Manner-Suomen pienin kunta. 922 asukasta. Pyha-Luosto matkailualue.', 67.1118, 27.5147, TRUE),
('b0000000-0000-0000-0000-000000000002', 'Savukoski', 'savukoski', 3, 'a0000000-0000-0000-0000-000000000010', 'europe/suomi/lappi/savukoski', 'Suomen harvaan asutuin kunta. 969 asukasta. Korvatunturi.', 67.2917, 28.1667, TRUE),
('b0000000-0000-0000-0000-000000000003', 'Salla', 'salla', 3, 'a0000000-0000-0000-0000-000000000010', 'europe/suomi/lappi/salla', 'Itä-Lappi, napapiirin pohjoispuolella. 3 235 asukasta. Venäjän raja.', 66.8333, 28.6667, TRUE),
('b0000000-0000-0000-0000-000000000004', 'Enontekiö', 'enontekio', 3, 'a0000000-0000-0000-0000-000000000010', 'europe/suomi/lappi/enontekio', 'Luoteis-Lappi. 1 800 asukasta. Saamelaiskulttuuri. Kilpisjärvi.', 68.3833, 23.6333, TRUE),
('b0000000-0000-0000-0000-000000000005', 'Karkkila', 'karkkila', 3, 'a0000000-0000-0000-0000-000000000011', 'europe/suomi/uusimaa/karkkila', 'Menetti paikallislehden 2022. 8 391 asukasta. Taloudellinen kriisi.', 60.5342, 24.2097, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SYSTEM PROFILE (for AI-generated seed content)
-- ============================================================

INSERT INTO profiles (id, profile_name, email, role, public, meta) VALUES
('c0000000-0000-0000-0000-000000000001', 'Uutiskone', 'system@localnews.fi', 0, TRUE, '{"type": "system", "description": "AI-generated articles from public records"}')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SUBMISSIONS (pre-generated articles)
-- ============================================================

-- Pelkosenniemi: New pharmacist
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000001',
 'Pelkosenniemen apteekki saa uuden apteekkarin — Sanna Kiljunen muutti Varsinais-Suomesta Lappiin',
 E'Pelkosenniemen apteekki ja Savukosken sivuapteekki saavat uuden apteekkarin torstaina 6. maaliskuuta. Sanna Kiljunen aloittaa tehtävässään molempien apteekkien vastuullisena apteekkarina.\n\nKiljunen on koulutukseltaan sekä kemisti että proviisori. Hän on työskennellyt suurimman osan urastaan lääketeollisuudessa ja toimi viimeksi apteekinhoitajana sivuapteekissa, jossa hän oli työpäivinään ainoa työntekijä.\n\nUusi apteekkari muutti Lappiin noin tuhannen kilometrin päästä Varsinais-Suomesta.\n\n"Odotan innolla uuden työtehtäväni alkua ja kuntalaisten lääkehoidoista huolehtimista. Lappi sinällään on minulle jo kokemus", Kiljunen kertoo.\n\nPelkosenniemen apteekki ja Savukosken sivuapteekki palvelevat arkisin maanantaista perjantaihin kello 9–16.30. Arkipyhinä sekä juhannus- ja jouluaattoina apteekit ovat suljettuna.\n\nPelkosenniemi on Manner-Suomen pienin kunta noin 900 asukkaallaan. Apteekkipalveluiden jatkuvuus on kunnalle elintärkeää, sillä lähin vaihtoehtoinen apteekki sijaitsee kymmenien kilometrien päässä.',
 3,  -- status: published
 '{"source": "facebook/pelkosenniemen-kunta", "source_type": "municipal_announcement", "generated_by": "ai"}'
);

-- Pelkosenniemi: School transport dispute
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000002',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000001',
 'Pelkosenniemen koulukuljetuskiista etenee markkinaoikeuteen — kunta hylkäsi taksiyhtiön oikaisuvaatimuksen',
 E'Pelkosenniemen kunnanhallitus hylkäsi yksimielisesti Taksi Petteri Kokko Oy:n oikaisuvaatimuksen koulukuljetusten ja asiointiliikenteen kilpailutuksesta vuosille 2026–2028. Asia on edennyt markkinaoikeuteen.\n\nKunnanhallitus päätti joulukuussa 2025 sulkea Taksi Petteri Kokko Oy:n pois tarjouskilpailusta. Päätöksen taustalla oli useita syitä: yhtiön edustajan katsottiin syyllistyneen vakavaan ammatilliseen virheeseen aiemmassa koulukuljetussopimuksessa, eikä yhtiö toimittanut tarjouspyynnössä vaadittuja selvityksiä.\n\nLisäksi yhtiö poistui arvonlisäverorekisteristä lokakuussa 2025 ja ennakkoperintärekisteristä marraskuussa 2025. Kaupparekisterin mukaan yhtiöllä ei tammikuuhun 2026 mennessä ollut toimivaa hallitusta.\n\nTaksi Petteri Kokko Oy vaatii markkinaoikeudelta kunnanhallituksen päätöksen kumoamista sekä 150 000 euron uhkasakon asettamista kunnalle.\n\nLakisääteisten koulukuljetusten turvaamiseksi kunta on tehnyt väliaikaisen ostopalvelusopimuksen Taksi Jari Ahon ja Taksipalvelut Mika Kortelaisen kanssa.',
 3,
 '{"source": "paatoksetd10.pelkosenniemi.fi", "source_type": "council_minutes", "generated_by": "ai"}'
);

-- Pelkosenniemi: Tourist tax
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000003',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000001',
 'Pelkosenniemi otti kantaa matkailuveroon — valtiovarainministeriö selvittää alueellista kokeilua',
 E'Pelkosenniemen kunnanhallitus antoi lausuntonsa valtiovarainministeriölle alueellisen matkailijaveron toteuttamisesta. Ministeriö selvittää parhaillaan matkailijaveron käyttöönottoa osana pääministeri Petteri Orpon hallituksen Itäisen ja Pohjoisen Suomen kehittämisohjelmaa.\n\nMatkailijaverolla tarkoitetaan lyhytaikaisen majoittumisen yhteydessä perittävää veroa, jollainen on käytössä useissa EU-maissa. Suomessa vero vaatisi kokonaan uuden lainsäädännön.\n\nPelkosenniemi sijaitsee Pyhä-Luoston matkailualueella, joka on yksi Lapin merkittävimmistä hiihtokeskuksista. Mahdollinen matkailuvero vaikuttaisi suoraan alueen matkailuyrityksiin ja majoituspalveluihin.\n\nKunnanhallitus hyväksyi lausunnon yksimielisesti.',
 3,
 '{"source": "paatoksetd10.pelkosenniemi.fi", "source_type": "council_minutes", "generated_by": "ai"}'
);

-- Pelkosenniemi: Political crisis
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000004',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000001',
 'Pelkosenniemellä luottamuspula — epäluottamuslauseet sekä hallitukselle että kunnanjohtajalle',
 E'Manner-Suomen pienin kunta on ajautunut hallinnolliseen kriisiin, jossa epäluottamuslauseita on esitetty sekä kunnanhallituksen puheenjohtajistolle että vt. kunnanjohtaja Mikko Merikannolle.\n\nViisi valtuutettua eri puolueista jätti helmikuun 26. päivänä aloitteen tilapäisen valiokunnan perustamiseksi selvittämään, nauttiiko kunnanhallituksen puheenjohtajisto valtuuston luottamusta.\n\nViikkoa myöhemmin, 5. maaliskuuta, neljä keskustalaista valtuutettua esitti epäluottamuslausetta vt. kunnanjohtaja Merikannolle. Aloitteen perusteluissa mainittiin puutteita johtamisessa, taloudenhoidossa, riskienhallinnassa ja päätösten valmistelussa.\n\nMerikanto valittiin kunnanjohtajaksi yksimielisesti helmikuussa 2025, mutta hän toimii edelleen virkaa tekevänä, koska hänen nimityksensä on valituksen kohteena hallinto-oikeudessa.\n\nPelkosenniemellä asuu noin 920 ihmistä. Kunnassa ei ole omaa paikallislehteä eikä yhtään paikallista toimittajaa.',
 3,
 '{"source": "yle.fi, kuntalehti.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Salla: Reindeer races
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000005',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000003',
 'Sallan porokilpailut käynnissä viikonloppuna — Poro Cupin kolmas osakilpailu Keselmäjärven jäällä',
 E'Sallan perinteiset porokilpailut järjestetään tänä viikonloppuna 6.–8. maaliskuuta Keselmäjärven jäällä, hiihtokeskuksen ja Sallan kansallispuiston tuntumassa.\n\nKyseessä on Ranniot-porokilpailujen kolmas Poro Cup -osakilpailu, johon odotetaan porokisaajia ympäri Lappia. Kilpailuissa ajetaan karsintoja, välieriä ja finaaleja sekä kuuma- että yleissarjassa.\n\nLapsille on tarjolla omaa ohjelmaa: suonpallon heittoa, keppiporo-kisoja sekä ajelua kesyjen porojen vetämillä pulkilla. Sisäänpääsy maksaa viisi euroa, ja alle 7-vuotiaat pääsevät ilmaiseksi.\n\nKilpailupäivien jälkeen juhlat jatkuvat Papana Pubissa perinteikkäillä "porotansseilla".',
 3,
 '{"source": "visitsalla.fi", "source_type": "event", "generated_by": "ai"}'
);

-- Salla: Border fence
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000006',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000003',
 'Sallan Kelloselän raja-aita valmistumassa — osa 362 miljoonan euron rajaturvallisuusohjelmaa',
 E'Kelloselän rajanylityspaikan kohdalle rakennetun raja-aidan viimeiset piikkilankapaneelit hitsattiin paikoilleen marraskuun 2025 lopussa. Aita on osa Suomen 362 miljoonan euron ohjelmaa, jolla rakennetaan noin 200 kilometriä fyysistä estettä Venäjän-vastaiselle rajalle.\n\nLapin yhdeksän kilometrin osuus kattaa Sallan Kelloselän ja Inarin Raja-Joosepin. Aita on 4,5 metriä korkea ja koostuu hitsatusta teräsverkosta, piikkilangasta, maanalaisesta teräsverkosta, liiketunnistimista sekä tekoälykameroista, jotka erottavat ihmiset hirvieläimistä.\n\nVuoden 2026 talousarviossa on varattu 110 miljoonaa euroa lisää Kainuun ja Etelä-Karjalan osuuksien valmistamiseen kesään 2026 mennessä.\n\nKaikki itärajan ylityspaikat, mukaan lukien Salla, ovat olleet suljettuna toistaiseksi marraskuusta 2023 lähtien.',
 3,
 '{"source": "yle.fi, valtioneuvosto.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Salla: Participatory budget
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000007',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000003',
 'Salla jakaa 10 000 euroa asukkaiden ideoille — ehdotuksia voi jättää maaliskuun loppuun asti',
 E'Sallan kunta on avannut osallistuvan budjetoinnin ehdotuskierroksen vuodelle 2026. Kuntalaiset voivat ehdottaa, mihin 10 000 euron määräraha käytetään.\n\nEhdotuksia voi jättää 20. helmikuuta ja 31. maaliskuuta välisenä aikana Webropol-lomakkeella tai paperilomakkeella kunnanvirastolla, kirjastossa tai Save Salla Centerissä. Ehdotuksen voi tehdä jokainen 13 vuotta täyttänyt Sallan asukas.\n\nToteuttamiskelpoisista ehdotuksista järjestetään äänestys, ja eniten ääniä saanut ehdotus toteutetaan vuoden 2026 aikana.\n\nOsallistuva budjetointi on osa Sallan kunnanvaltuuston joulukuussa 2025 hyväksymää vuoden 2026 talousarviota.',
 3,
 '{"source": "salla.fi", "source_type": "municipal_announcement", "generated_by": "ai"}'
);

-- Karkkila: Rudus crisis
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000008',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000011',
 'b0000000-0000-0000-0000-000000000005',
 'Karkkila maksoi lähes 10 miljoonaa euroa irlantilaiskonsernille — edessä vuosien säästökuuri',
 E'Karkkilan kaupunki on maksanut Rudus Oy:lle, irlantilaisen CRH-konsernin tytäryhtiölle, yhteensä noin 9,3 miljoonaa euroa korvauksia sopimusrikkomuksesta. Korkein oikeus hylkäsi Karkkilan valitusluvan marraskuussa 2025, ja tuomio tuli lainvoimaiseksi.\n\nKiista juontaa juurensa vuoteen 1987 solmittuun sopimukseen, joka antoi Rudukselle oikeuden ottaa noin miljoona kuutiometriä soraa Toivikkeen Anttila II -alueelta. Soraa otettiin lopulta vain 20 000 kuutiometriä. Karkkilan ympäristölautakunta kieltäytyi myöntämästä Rudukselle uutta lupaa, minkä Helsingin hovioikeus katsoi sopimusrikkomukseksi helmikuussa 2025.\n\nKorvaussumma vastaa noin puolta Karkkilan vuotuisista verotuloista.\n\nKorvausten lisäksi kaupunki kamppailee rakenteellisen alijäämän kanssa: menot ylittävät tulot noin 1,5 miljoonalla eurolla vuodessa. Vuosien 2026–2029 aikana kaupungin on leikattava yhteensä noin 10 miljoonaa euroa.',
 3,
 '{"source": "yle.fi, kuntalehti.fi, irishtimes.com", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Karkkila: School closures
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000009',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000011',
 'b0000000-0000-0000-0000-000000000005',
 'Karkkilan kouluverkko supistuu — Haukkamäki ja Tuorila sulkeutuvat kevätlukukauden jälkeen',
 E'Karkkilan kaupunginvaltuusto päätti joulukuussa 2025 sulkea Haukkamäen ja Tuorilan koulut lukuvuoden 2025–2026 päätteeksi. Esikoulu siirtyy Nyhkälään syksystä 2026 alkaen, ja luokat 1–6 keskitetään Nyhkälän kouluun.\n\nPäätöstä edelsi poikkeuksellinen käänne. Marraskuussa 2025 valtuusto äänesti äärimmäisen tiukasti 16–15 koulujen säilyttämisen puolesta vasemmistoliiton Mari Rautiaisen muutosehdotuksen pohjalta.\n\nKokoomus ja Sitoutunut Karkkilaan -ryhmä jättivät eriävän mielipiteen vedoten syyskuussa hyväksyttyyn talouden tasapainottamisohjelmaan. Kuukautta myöhemmin valtuusto kääntyi ja päätti koulujen sulkemisesta.\n\nTaustalla on oppilasmäärän jyrkkä lasku: alakoululaisten määrä putoaa nykyisestä 470:stä noin 325:een vuoteen 2030–2031 mennessä.',
 3,
 '{"source": "yle.fi, karkkilalainen.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Savukoski: Manager crisis
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000010',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000002',
 'Savukosken kunnanjohtaja irtisanoutui — "laitonta painostusta"',
 E'Savukosken kunnanjohtaja Petri Härkönen irtisanoutui tehtävästään ilmoittaen syyksi laittoman painostuksen. Härkönen on Savukosken kolmas kunnanjohtaja lyhyen ajan sisällä.\n\nIrtisanoutumisen taustalla on pitkään jatkunut hallinnollinen kriisi Suomen harvimmin asutussa kunnassa. Härkönen kertoi kokeneensa painostusta, joka ylitti hänen sietokykynsä rajat.\n\nSavukoskella asuu noin 969 ihmistä. Kunnan pinta-ala on yli 6 400 neliökilometriä, mikä tekee siitä yhden Suomen suurimmista kunnista maantieteellisesti — mutta samalla yhden harvimmin asutuista. Asukastiheys on vain 0,15 asukasta neliökilometrillä.\n\nKunnanjohtajan vaihtuminen tuo lisähaasteita kunnalle, joka kamppailee muuttotappion ja ikääntyvän väestön kanssa. Savukoskella ei ole omaa paikallislehteä eikä yhtään paikallista toimittajaa.',
 3,
 '{"source": "yle.fi, kuntalehti.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Savukoski: Sokli mine
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000011',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000002',
 'Sokli-kaivoshanke etenee Savukoskella — 65 miljoonan euron investointi',
 E'Sokli-kaivoshanke Savukosken kunnan alueella on edennyt suunnitteluvaiheeseen. Hankkeen arvioitu investointikustannus on noin 65 miljoonaa euroa.\n\nSoklin fosfaattiesiintymä on yksi Euroopan suurimmista. Esiintymä löydettiin jo 1960-luvulla, mutta hanke on edennyt hitaasti ympäristö- ja logistiikkakysymysten vuoksi. Kaivos sijaitsisi noin 80 kilometriä Savukosken kuntakeskuksesta koilliseen, lähellä Venäjän rajaa.\n\nHanke herättää ristiriitaisia tunteita. Kannattajat näkevät kaivoksen mahdollisuutena tuoda työpaikkoja ja elinvoimaa alueelle, joka kärsii muuttotappiosta. Vastustajat ovat huolissaan vaikutuksista Vuotoksen ja Kemijoen vesistöalueeseen sekä alueen luontomatkailuun.\n\nSavukoski on Suomen harvimmin asuttu kunta. Kaivoshanke voisi merkittävästi muuttaa kunnan taloudellista tilannetta, mutta sen ympäristövaikutukset jakavat mielipiteitä.',
 3,
 '{"source": "yle.fi, gtk.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Savukoski: Korvatunturi shelter
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000012',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000002',
 'Korvatunturille rakennetaan päivätupa — joulupukin kotivaara saa uuden palvelupisteen',
 E'Korvatunturille, joka tunnetaan joulupukin kotivaaran nimellä, rakennetaan uusi päivätupa. Hanke tuo palveluita retkeilijöille alueella, joka on yksi Itä-Lapin suosituimmista vaelluskohteista.\n\nKorvatunturi sijaitsee Suomen ja Venäjän rajalla Savukosken kunnan alueella. Tunturi nousi kansainväliseen tietoisuuteen, kun Markus Rautio kertoi vuonna 1927 Yleisradion lastenlähetyksessä joulupukin asuvan Korvatunturilla.\n\nPäivätupa tarjoaa retkeilijöille suojaisan levähdyspaikan ja tukee alueen luontomatkailua. Savukosken kunta on panostanut matkailuun osana elinvoimastrategiaansa.\n\nKorvatunturin alue on myös merkittävä luontokohde: se kuuluu Urho Kekkosen kansallispuiston eteläisiin osiin ja tarjoaa ainutlaatuisen erämaaluontokokemuksen.',
 3,
 '{"source": "savukoski.fi, metsahallitus.fi", "source_type": "municipal_announcement", "generated_by": "ai"}'
);

-- Enontekio: Manager crisis
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000013',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000004',
 'Enontekiöltä lähtenyt kolme kunnanjohtajaa peräkkäin — "toimintakulttuuri on rikki"',
 E'Enontekiön kunnasta on eronnut kolme kunnanjohtajaa peräjälkeen lyhyen ajan sisällä. Tilannetta on kuvattu poikkeukselliseksi Suomen kuntakentällä.\n\nViimeisin kunnanjohtaja jätti tehtävänsä vuoden 2025 aikana. Erojen taustalla on raportoitu olevan vaikea hallinnollinen toimintakulttuuri, jota useat lähtijät ovat kuvanneet "rikkinäiseksi".\n\nEnontekiö on noin 1 800 asukkaan kunta Luoteis-Lapissa, Norjan ja Ruotsin rajalla. Kunta tunnetaan saamelaiskulttuuristaan ja Kilpisjärven matkailualueesta.\n\nKunnanjohtajien jatkuva vaihtuminen vaikeuttaa kunnan pitkäjänteistä kehittämistä aikana, jolloin kunta tarvitsisi vakaata johtamista matkailun kasvun, saamelaiskysymysten ja väestörakenteen muutosten keskellä.\n\nKunnanjohtajan rekrytointi on käynnissä.',
 3,
 '{"source": "yle.fi, kuntalehti.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Enontekio: Tourism award
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000014',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000004',
 'Enontekiö valittiin Vuoden matkailualueeksi 2024',
 E'Enontekiö palkittiin Vuoden matkailualueena 2024. Tunnustus myönnettiin kunnan pitkäjänteisestä työstä matkailun kehittämiseksi ja kestävän matkailun edistämisestä.\n\nEnontekiö tunnetaan erityisesti Kilpisjärven matkailualueesta, jossa sijaitsee Suomen, Norjan ja Ruotsin kolmen valtakunnan rajapyykki. Haltin tunturi, Suomen korkein kohta (1 324 metriä), sijaitsee Enontekiön kunnan alueella.\n\nPalkinnon perusteluissa korostettiin Enontekiön kykyä yhdistää luontomatkailu ja saamelaiskulttuuri vastuullisella tavalla. Kunta on panostanut ympärivuotiseen matkailuun ja paikallisyhteisön osallistamiseen matkailun kehittämisessä.\n\nMatkailun merkitys Enontekiön taloudelle on kasvanut merkittävästi viime vuosina.',
 3,
 '{"source": "visitfinland.fi, enontekio.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Enontekio: Newspaper merger
INSERT INTO submissions (id, owner_id, location_id, continent_id, country_id, region_id, city_id, title, description, status, meta) VALUES
('d0000000-0000-0000-0000-000000000015',
 'c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000004',
 'Enontekiön Sanomat lakkasi ilmestymästä — lehti sulautui Tunturi-Lappiin',
 E'Enontekiön oma paikallislehti Enontekiön Sanomat lakkasi itsenäisenä julkaisuna 1. tammikuuta 2026 alkaen. Lehti sulautui osaksi laajempaa Tunturi-Lappi-lehteä.\n\nYhdistymisen myötä Enontekiö menetti oman nimetyn paikallislehtensä. Tunturi-Lappi kattaa laajemman alueen, eikä Enontekiön paikallisasioiden käsittely ole enää yhtä kattavaa kuin omalla lehdellä.\n\nLehden lakkaaminen on osa laajempaa trendiä, jossa pienten kuntien paikallislehdet yhdistyvät tai lopettavat kokonaan. Suomessa on viime vuosina suljettu tai yhdistetty kymmeniä paikallislehtiä taloudellisten paineiden vuoksi.\n\nEnontekiössä asuu noin 1 800 ihmistä. Kunnan asukkaiden tiedonsaanti paikallisista päätöksistä ja tapahtumista on heikentynyt lehden lopettamisen myötä.',
 3,
 '{"source": "yle.fi, medialiitto.fi", "source_type": "news_synthesis", "generated_by": "ai"}'
);

-- Update location article counts
UPDATE locations SET article_count = 4 WHERE slug = 'pelkosenniemi';
UPDATE locations SET article_count = 3 WHERE slug = 'salla';
UPDATE locations SET article_count = 3 WHERE slug = 'savukoski';
UPDATE locations SET article_count = 3 WHERE slug = 'enontekio';
UPDATE locations SET article_count = 2 WHERE slug = 'karkkila';
