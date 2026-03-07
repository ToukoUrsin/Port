export interface Article {
  id: number;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  timeAgo: string;
  image: string;
  area?: string;
  isLead?: boolean;
  qualityScore?: number;
  qualityDimensions?: {
    factualAccuracy: number;
    quoteAttribution: number;
    perspectives: number;
    representation: number;
    ethicalFraming: number;
    completeness: number;
  };
  sourceType?: string;
}

export const ARTICLES: Article[] = [
  {
    id: 1,
    title: "City Council Approves New Downtown Revitalization Plan",
    excerpt:
      "The $12M initiative aims to transform vacant lots into mixed-use spaces, with construction expected to begin this fall. Residents voiced support during Tuesday's packed public hearing.",
    body: "The City Council voted 7-2 on Tuesday evening to approve a sweeping $12 million downtown revitalization plan that promises to reshape the heart of the city over the next three years.\n\nThe initiative targets six vacant lots along Main Street and Second Avenue. Plans call for a mix of affordable housing units, ground-floor retail spaces, and a new community center.\n\n\"This is a once-in-a-generation opportunity to reimagine what our downtown can be,\" said Mayor Elena Rodriguez during the packed public hearing.\n\nResidents largely voiced support, though some raised concerns about potential displacement. Council member David Park pushed for an amendment requiring 30% of new housing units to be designated affordable.\n\nConstruction is expected to begin this fall, funded through federal grants, municipal bonds, and private investment. The project is projected to create over 200 construction jobs and 80 permanent positions.",
    category: "council",
    author: "Maria Santos",
    timeAgo: "2 hours ago",
    image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&h=500&fit=crop",
    area: "Downtown",
    isLead: true,
    qualityScore: 82,
    qualityDimensions: {
      factualAccuracy: 90,
      quoteAttribution: 85,
      perspectives: 75,
      representation: 70,
      ethicalFraming: 88,
      completeness: 82,
    },
    sourceType: "Voice recording + photos",
  },
  {
    id: 2,
    title: "Lincoln High Robotics Team Heads to State Championship",
    excerpt:
      "After an undefeated regional season, the team will compete against 40 schools next month in Austin.",
    body: "The Lincoln High School robotics team punched their ticket to the state championship after completing a flawless 12-0 regional season.\n\nThe team of 14 students, led by senior captain Aisha Thompson, designed and built a robot capable of navigating complex obstacle courses while performing precision tasks. Their creation, nicknamed \"Volt,\" consistently outperformed competitors from across the region.\n\n\"These kids have put in hundreds of hours after school and on weekends,\" said coach Robert Chen. \"Their dedication is remarkable.\"\n\nThe state championship will be held next month in Austin, where the team will compete against 40 schools from across the state.",
    category: "schools",
    author: "James Liu",
    timeAgo: "4 hours ago",
    image: "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=600&h=400&fit=crop",
    area: "Northside",
    qualityScore: 76,
    qualityDimensions: {
      factualAccuracy: 88,
      quoteAttribution: 80,
      perspectives: 60,
      representation: 65,
      ethicalFraming: 85,
      completeness: 78,
    },
    sourceType: "Voice recording + notes",
  },
  {
    id: 3,
    title: "Local Bakery Expands to Second Location on Main Street",
    excerpt:
      "Sweet Rise Bakery will open its new storefront in the former hardware store space, creating 15 new jobs.",
    body: "Sweet Rise Bakery, a beloved neighborhood staple for eight years, announced plans to open a second location in the former Patterson Hardware building on Main Street.\n\nOwner Carmen Delgado said the expansion has been a long-held dream. \"We've outgrown our original kitchen. This new space lets us do everything we've been wanting to — a bigger seating area, a dedicated pastry counter, and a small event space for the community.\"\n\nThe new 2,400-square-foot location will create 15 full-time and part-time positions. Delgado said she plans to prioritize hiring from the neighborhood.\n\nRenovations are underway, with a grand opening planned for late spring. The original location on Elm Street will remain open.",
    category: "business",
    author: "Ana Gutierrez",
    timeAgo: "5 hours ago",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop",
    area: "Downtown",
    qualityScore: 88,
    qualityDimensions: {
      factualAccuracy: 92,
      quoteAttribution: 95,
      perspectives: 78,
      representation: 82,
      ethicalFraming: 90,
      completeness: 90,
    },
    sourceType: "Voice recording + photos",
  },
  {
    id: 4,
    title: "Weekend Farmers Market Adds Evening Hours for Summer",
    excerpt:
      "Starting in June, the market will stay open until 8 PM on Thursdays to accommodate working families.",
    body: "The Downtown Farmers Market announced Thursday evening hours from 4 PM to 8 PM beginning in June, responding to feedback from residents who said the Saturday-only schedule was difficult for working families.\n\n\"We heard loud and clear that people want access to fresh, local food on their own schedule,\" said market director Lisa Huang.\n\nThe Thursday evening market will feature live music, food trucks, and a dedicated kids' activity area. Over 30 vendors have already signed up for the expanded schedule.\n\nThe change comes as the market celebrates its 15th anniversary season.",
    category: "events",
    author: "Tom Bradley",
    timeAgo: "6 hours ago",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop",
    area: "East Side",
    qualityScore: 72,
    qualityDimensions: {
      factualAccuracy: 85,
      quoteAttribution: 78,
      perspectives: 55,
      representation: 60,
      ethicalFraming: 82,
      completeness: 72,
    },
    sourceType: "Notes + photos",
  },
  {
    id: 5,
    title: "Community Garden Project Breaks Ground in East Side Park",
    excerpt:
      "Volunteers gathered Saturday to build 40 raised beds, with plots available to residents on a first-come basis.",
    body: "More than 60 volunteers turned out Saturday morning to break ground on a new community garden in East Side Park, marking the culmination of a two-year grassroots campaign.\n\nThe garden features 40 raised beds, a shared tool shed, composting stations, and accessible pathways that meet ADA standards. Plots are available at no cost to neighborhood residents.\n\n\"This garden is about more than vegetables,\" said organizer Priya Sharma. \"It's about neighbors getting to know each other, kids learning where food comes from, and building something together.\"\n\nThe project was funded through a combination of city parks department support and a crowdfunding campaign that raised over $8,000 from 200 donors.",
    category: "community",
    author: "Priya Sharma",
    timeAgo: "2 days ago",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
    area: "East Side",
    qualityScore: 91,
    qualityDimensions: {
      factualAccuracy: 94,
      quoteAttribution: 92,
      perspectives: 85,
      representation: 90,
      ethicalFraming: 95,
      completeness: 88,
    },
    sourceType: "Voice recording + photos + notes",
  },
  {
    id: 6,
    title: "High School Soccer Team Wins Regional Finals in Overtime",
    excerpt:
      "A last-minute goal from sophomore Daniela Cruz sealed the victory, sending the team to state playoffs.",
    body: "The Riverside High girls' soccer team captured the regional championship Saturday with a dramatic 2-1 overtime victory over defending champions Oakmont Academy.\n\nSophomore forward Daniela Cruz scored the winning goal with three minutes remaining in extra time, sending the home crowd into celebration.\n\n\"I just saw the opening and took the shot,\" said Cruz, who also assisted on the team's first goal. \"This team never gives up.\"\n\nHead coach Maria Fernandez praised the team's resilience throughout a season that included a five-game winning streak and a gutsy comeback in the semifinal.\n\nThe team will travel to the state tournament next weekend.",
    category: "sports",
    author: "Marcus Johnson",
    timeAgo: "3 days ago",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=400&fit=crop",
    area: "Westside",
    qualityScore: 79,
    qualityDimensions: {
      factualAccuracy: 88,
      quoteAttribution: 90,
      perspectives: 65,
      representation: 68,
      ethicalFraming: 80,
      completeness: 82,
    },
    sourceType: "Voice recording + photos",
  },
  {
    id: 7,
    title: "Water Main Replacement Project Starts Next Week on Oak Avenue",
    excerpt:
      "Expect lane closures and detours for approximately six weeks as aging infrastructure is replaced.",
    body: "The city's Public Works Department will begin a major water main replacement project on Oak Avenue starting Monday, with work expected to last approximately six weeks.\n\nThe project will replace aging cast-iron pipes installed in the 1960s with modern ductile iron lines. Residents along the corridor may experience temporary water service interruptions during connections.\n\n\"These pipes are past their service life,\" said Public Works Director Tom Nakamura. \"Replacing them now prevents emergency failures down the road.\"\n\nLane closures will be in effect between 3rd Street and 7th Street during work hours. The city has posted a detour map on its website.",
    category: "council",
    author: "Sarah Chen",
    timeAgo: "4 days ago",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop",
    area: "Downtown",
    qualityScore: 68,
    qualityDimensions: {
      factualAccuracy: 82,
      quoteAttribution: 75,
      perspectives: 50,
      representation: 55,
      ethicalFraming: 78,
      completeness: 68,
    },
    sourceType: "Notes",
  },
  {
    id: 8,
    title: "New After-School Program Launches at Three Elementary Schools",
    excerpt:
      "The free program offers tutoring, arts, and sports activities until 6 PM for working families.",
    body: "A new after-school program launched this week at Jefferson, Washington, and Lincoln elementary schools, offering free tutoring, arts, and sports activities until 6 PM.\n\nThe program, funded by a state education grant, aims to support working families who need reliable after-school care. Each site will be staffed by certified teachers and trained volunteers.\n\n\"This fills a critical gap for families in our district,\" said Superintendent Dr. Angela Morrison. \"No child should have to go home to an empty house because their parents are still at work.\"\n\nEnrollment is open to all students at the three schools, with priority given to families demonstrating financial need.",
    category: "schools",
    author: "James Liu",
    timeAgo: "5 days ago",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
    area: "Northside",
    qualityScore: 85,
    qualityDimensions: {
      factualAccuracy: 90,
      quoteAttribution: 88,
      perspectives: 72,
      representation: 80,
      ethicalFraming: 92,
      completeness: 85,
    },
    sourceType: "Voice recording + notes",
  },
  {
    id: 9,
    title: "Why Our City Needs a Public Transit Overhaul — Now",
    excerpt:
      "Bus routes haven't changed in 20 years while the city has grown by 40%. It's time to rethink how we move.",
    body: "I've lived in this city for 15 years, and in that time, I've watched new neighborhoods spring up, schools overflow, and businesses open in areas that were once empty fields. What hasn't changed? The bus routes.\n\nOur public transit system still runs on a map drawn two decades ago. Routes snake through neighborhoods that have declined in population while bypassing the fastest-growing corridors entirely.\n\nThe result: ridership is down 30% since 2020, not because people don't want public transit, but because the system doesn't go where they need it to go.\n\nOther mid-sized cities have shown what's possible. Columbus redesigned its entire bus network in 2017 and saw ridership jump 8% in the first year. Houston did the same and gained 20% more riders without adding a single bus.\n\nWe don't need billions in new infrastructure. We need the political will to redraw lines on a map. The transit authority's own study from last year recommended 12 route changes that would improve coverage for 60,000 residents. The report is gathering dust.\n\nIt's time to dust it off.",
    category: "opinion",
    author: "Sarah Chen",
    timeAgo: "1 day ago",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop",
    area: "Citywide",
    qualityScore: 87,
    qualityDimensions: {
      factualAccuracy: 85,
      quoteAttribution: 78,
      perspectives: 82,
      representation: 90,
      ethicalFraming: 92,
      completeness: 88,
    },
    sourceType: "Written submission",
  },
  {
    id: 10,
    title: "Spring Arts Festival Returns With Expanded Lineup",
    excerpt:
      "Over 80 local artists, live performances, and food vendors will fill Riverside Park this weekend.",
    body: "The annual Spring Arts Festival returns to Riverside Park this Saturday and Sunday with its biggest lineup yet — over 80 local artists, a dozen live performance acts, and 25 food vendors.\n\nNew this year is a dedicated children's art zone, a mural painting competition, and evening concerts both nights featuring local bands.\n\n\"We've been planning since last October,\" said festival coordinator Diana Torres. \"The community response has been incredible. We had to expand the vendor area by 40% to fit everyone.\"\n\nAdmission is free, though VIP passes with reserved seating and early vendor access are available for $25. Parking will be available at the community college lot with free shuttle service.\n\nHours are 10 AM to 9 PM Saturday and 10 AM to 6 PM Sunday.",
    category: "events",
    author: "Ana Gutierrez",
    timeAgo: "8 hours ago",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
    area: "Westside",
    qualityScore: 74,
    qualityDimensions: {
      factualAccuracy: 82,
      quoteAttribution: 80,
      perspectives: 60,
      representation: 65,
      ethicalFraming: 78,
      completeness: 76,
    },
    sourceType: "Notes + photos",
  },
  {
    id: 11,
    title: "The Quiet Crisis: Loneliness Among Our Senior Residents",
    excerpt:
      "One in three seniors in our county lives alone. A new study reveals the health toll — and what neighbors can do.",
    body: "When Margaret Ellis, 78, moved into her apartment on Pine Street six years ago, she knew three neighbors by name within a week. Today, she says she can go days without speaking to another person.\n\n\"The world got smaller during COVID, and for a lot of us, it never got bigger again,\" she told me over tea last Tuesday.\n\nMargaret is not unusual. A county health department study released this month found that 34% of residents over 65 live alone, and nearly half of those report feeling lonely \"most or all of the time.\"\n\nThe health consequences are severe. Chronic loneliness carries health risks comparable to smoking 15 cigarettes a day, according to the U.S. Surgeon General.\n\nBut solutions don't require massive programs. The study highlights simple interventions: regular check-in calls, intergenerational meetups at community centers, and neighborhood \"adopt a senior\" initiatives.\n\nSeveral local organizations have already stepped up. The Riverside Senior Center now offers daily drop-in hours, and the public library started a weekly book club specifically for older adults.\n\nSometimes the most powerful thing you can do is knock on a door.",
    category: "opinion",
    author: "Maria Santos",
    timeAgo: "3 days ago",
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop",
    area: "Citywide",
    qualityScore: 93,
    qualityDimensions: {
      factualAccuracy: 92,
      quoteAttribution: 95,
      perspectives: 90,
      representation: 95,
      ethicalFraming: 96,
      completeness: 90,
    },
    sourceType: "Voice recording + research",
  },
  {
    id: 12,
    title: "Free Health Screening Event at Memorial Hospital This Saturday",
    excerpt:
      "Blood pressure, diabetes, and vision checks available at no cost. No appointment needed.",
    body: "Memorial Hospital will host a free community health screening event this Saturday from 9 AM to 3 PM in its main lobby and adjacent parking lot.\n\nServices include blood pressure checks, blood glucose screening, vision tests, BMI assessments, and flu vaccinations. Bilingual staff will be available in English and Spanish.\n\n\"Preventive care saves lives, but too many people skip it because of cost or access barriers,\" said Dr. Rachel Kim, the hospital's community outreach director. \"We want to remove those barriers entirely.\"\n\nLast year's event served over 400 residents and identified 28 cases of previously undiagnosed hypertension.\n\nNo appointment or insurance is needed. Walk-ins are welcome throughout the day.",
    category: "events",
    author: "Tom Bradley",
    timeAgo: "10 hours ago",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop",
    area: "Northside",
    qualityScore: 80,
    qualityDimensions: {
      factualAccuracy: 90,
      quoteAttribution: 82,
      perspectives: 65,
      representation: 75,
      ethicalFraming: 85,
      completeness: 82,
    },
    sourceType: "Notes",
  },
  {
    id: 13,
    title: "Pothole Problem: Elm Street Residents Say City Is Ignoring Their Calls",
    excerpt:
      "Residents have filed 47 repair requests in six months. Only three have been addressed.",
    body: "Residents of Elm Street between 4th and 9th avenues say they've been waiting months for the city to address a growing pothole problem that has damaged cars and created safety hazards for cyclists.\n\nAccording to public records obtained by PORT, 47 repair requests were filed through the city's 311 system since September. Only three have been completed.\n\n\"My daughter hit a pothole on her bike last month and broke her wrist,\" said resident Carlos Mendez. \"I've called the city four times. Nothing.\"\n\nPublic Works spokesperson Janet Morrison said the department is dealing with a backlog due to staffing shortages. \"We understand the frustration. We're working to hire additional crews and expect to address the Elm Street corridor by the end of next month.\"\n\nCouncil member David Park said he plans to request an emergency allocation for road repairs at next week's budget session.",
    category: "news",
    author: "Marcus Johnson",
    timeAgo: "1 day ago",
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&h=400&fit=crop",
    area: "East Side",
    qualityScore: 90,
    qualityDimensions: {
      factualAccuracy: 94,
      quoteAttribution: 92,
      perspectives: 88,
      representation: 85,
      ethicalFraming: 90,
      completeness: 90,
    },
    sourceType: "Voice recording + public records",
  },
  {
    id: 14,
    title: "Local Tech Startup Raises $2M to Build Neighborhood Safety App",
    excerpt:
      "SafeWalk connects walkers and joggers with real-time safety data and community check-ins.",
    body: "SafeWalk, a startup founded by two local university graduates, announced a $2 million seed round to develop a neighborhood safety app that connects walkers and joggers with real-time data.\n\nThe app uses crowdsourced reports, streetlight status data from the city, and foot traffic patterns to suggest the safest walking routes at any time of day.\n\n\"We started this because our friends didn't feel safe walking home from campus at night,\" said co-founder Kenji Watanabe. \"We wanted to build something that helps without relying on surveillance.\"\n\nThe app also features a community check-in system where users can mark themselves as available to walk with neighbors heading in the same direction.\n\nSafeWalk plans to launch a beta in the city next month before expanding to three additional markets by year's end.",
    category: "business",
    author: "James Liu",
    timeAgo: "12 hours ago",
    image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=400&fit=crop",
    area: "Downtown",
    qualityScore: 83,
    qualityDimensions: {
      factualAccuracy: 88,
      quoteAttribution: 85,
      perspectives: 72,
      representation: 78,
      ethicalFraming: 86,
      completeness: 84,
    },
    sourceType: "Voice recording + notes",
  },
  {
    id: 15,
    title: "City Budget Hearing Moved to March 20 Due to Scheduling Conflict",
    excerpt:
      "The annual budget hearing, originally set for March 14, has been rescheduled. Public comment period remains open.",
    body: "The City Clerk's office announced Wednesday that the annual budget hearing has been moved from March 14 to March 20 due to a scheduling conflict with the county assessor's office.\n\nAll other details remain the same. The hearing will be held at City Hall, Room 201, starting at 6 PM. Residents wishing to provide public comment can sign up online or in person before the session.\n\nThe proposed 2026-2027 budget is available for review on the city's website.",
    category: "news",
    author: "Sarah Chen",
    timeAgo: "3 hours ago",
    image: "",
    area: "Downtown",
    qualityScore: 65,
    qualityDimensions: {
      factualAccuracy: 90,
      quoteAttribution: 50,
      perspectives: 40,
      representation: 55,
      ethicalFraming: 80,
      completeness: 72,
    },
    sourceType: "Notes",
  },
  {
    id: 16,
    title: "Boil Water Advisory Lifted for Riverside Neighborhood",
    excerpt:
      "Residents can resume normal water use after test results confirm water quality meets safety standards.",
    body: "The boil water advisory issued last Friday for the Riverside neighborhood has been lifted, the city's water department confirmed this morning.\n\nTest results from samples taken Monday show all contaminant levels are within safe limits. Residents can resume using tap water for drinking and cooking without boiling.\n\nThe advisory was issued after a water main break at the intersection of River Road and 5th Street caused a temporary drop in water pressure, which can allow contaminants to enter the system.\n\nRepairs were completed Saturday.",
    category: "news",
    author: "Tom Bradley",
    timeAgo: "6 hours ago",
    image: "",
    area: "Westside",
    qualityScore: 70,
    qualityDimensions: {
      factualAccuracy: 92,
      quoteAttribution: 55,
      perspectives: 45,
      representation: 60,
      ethicalFraming: 82,
      completeness: 78,
    },
    sourceType: "Notes",
  },
  {
    id: 17,
    title: "Library Board Votes to Extend Weekend Hours Starting April",
    excerpt:
      "All three branch libraries will now stay open until 6 PM on Saturdays and add Sunday hours from 12-5 PM.",
    body: "The Library Board voted unanimously Thursday to extend weekend hours at all three branch locations beginning April 1.\n\nSaturday hours will extend from the current 4 PM closing to 6 PM, and Sunday hours of 12 PM to 5 PM will be added at the Main, Northside, and East Side branches.\n\nThe expansion was made possible by a reallocation of funds from the city's general budget. Library Director Patricia Holmes said the change responds to patron surveys showing strong demand for weekend access.\n\n\"Our busiest time is Saturday afternoon, and we've been turning people away at 4 PM,\" Holmes said. \"This fixes that.\"",
    category: "news",
    author: "Maria Santos",
    timeAgo: "7 hours ago",
    image: "",
    area: "Citywide",
    qualityScore: 73,
    qualityDimensions: {
      factualAccuracy: 88,
      quoteAttribution: 82,
      perspectives: 55,
      representation: 65,
      ethicalFraming: 80,
      completeness: 75,
    },
    sourceType: "Notes",
  },
  {
    id: 18,
    title: "Police Report: Vehicle Break-ins Up 15% in Parking Garages",
    excerpt:
      "Downtown and East Side garages see the most incidents. Police urge residents not to leave valuables visible.",
    body: "Vehicle break-ins in city parking garages rose 15% in February compared to the same month last year, according to the latest police department crime report.\n\nThe Downtown Municipal Garage and East Side Transit Garage accounted for the majority of incidents. Most involved smashed windows to grab visible electronics or bags.\n\nPolice Captain James Rivera urged residents to take precautions. \"Don't leave anything visible in your car — no bags, no electronics, nothing that looks like it might be worth breaking a window for.\"\n\nThe department has increased patrol frequency in the affected garages and is working with the city to improve lighting and camera coverage.",
    category: "news",
    author: "Marcus Johnson",
    timeAgo: "9 hours ago",
    image: "",
    area: "Downtown",
    qualityScore: 77,
    qualityDimensions: {
      factualAccuracy: 90,
      quoteAttribution: 85,
      perspectives: 60,
      representation: 68,
      ethicalFraming: 78,
      completeness: 80,
    },
    sourceType: "Public records",
  },
];

export function authorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export interface Author {
  name: string;
  slug: string;
  email: string;
  joined: string;
}

export const AUTHORS: Author[] = [
  { name: "Maria Santos", slug: "maria-santos", email: "maria.santos@email.com", joined: "March 2026" },
  { name: "James Liu", slug: "james-liu", email: "james.liu@email.com", joined: "January 2026" },
  { name: "Ana Gutierrez", slug: "ana-gutierrez", email: "ana.gutierrez@email.com", joined: "February 2026" },
  { name: "Tom Bradley", slug: "tom-bradley", email: "tom.bradley@email.com", joined: "December 2025" },
  { name: "Priya Sharma", slug: "priya-sharma", email: "priya.sharma@email.com", joined: "November 2025" },
  { name: "Marcus Johnson", slug: "marcus-johnson", email: "marcus.johnson@email.com", joined: "January 2026" },
  { name: "Sarah Chen", slug: "sarah-chen", email: "sarah.chen@email.com", joined: "October 2025" },
];

export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

export function getArticlesByAuthor(authorName: string): Article[] {
  return ARTICLES.filter((a) => a.author === authorName);
}

export const BADGE_CLASS: Record<string, string> = {
  council: "badge-council",
  schools: "badge-schools",
  business: "badge-business",
  events: "badge-events",
  sports: "badge-sports",
  community: "badge-community",
  opinion: "badge-opinion",
  news: "badge-news",
};

export function getArticleById(id: number): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}

export function getRelatedArticles(article: Article, count = 3): Article[] {
  return ARTICLES
    .filter((a) => a.id !== article.id)
    .sort((a, b) => {
      // Prioritize same category, then same area
      const aScore = (a.category === article.category ? 2 : 0) + (a.area === article.area ? 1 : 0);
      const bScore = (b.category === article.category ? 2 : 0) + (b.area === article.area ? 1 : 0);
      return bScore - aScore;
    })
    .slice(0, count);
}
