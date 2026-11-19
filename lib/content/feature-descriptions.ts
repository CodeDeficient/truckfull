export interface FeatureDescription {
  short: string;
  long: string;
}

export const liveMapFeature: FeatureDescription = {
  short:
    'Real-time locations of food trucks on an interactive map across Georgia and South Carolina.',
  long: 'Find food trucks operating near you on a live map. See their real-time locations, current status, and whether they are open right now. No more guessing where your favorite truck might be parked today.',
};

export const browseMenusFeature: FeatureDescription = {
  short: 'View menus, cuisine types, hours, and photos before you visit.',
  long: 'Check menus, specialties, operating hours, and photos before you head out. Know what you want to order before you get there.',
};

export const saveFavoritesFeature: FeatureDescription = {
  short: 'Create a free account to bookmark your favorite trucks.',
  long: 'Save your favorite food trucks so you can find them again in one place. Alerts when they go live near you are coming soon.',
};

export const eventDiscoveryFeature: FeatureDescription = {
  short:
    'AI discovers vending opportunities from government, tourism, and event sources across the Southeast. Each event is automatically scored for relevance and quality.',
  long: 'TruckFull continuously ingests events from government permit systems, tourism boards, and event platforms across Georgia and South Carolina. Instead of manually searching Facebook groups and county websites, you see a curated feed of events that match your area and cuisine type. Replace 5 to 10 hours per week of manual hunting with a 5-minute feed scan.',
};

export const eventVettingFeature: FeatureDescription = {
  short:
    'Events are scored using traffic data, historical patterns, and recurrence analysis so you can decide if an event is worth your time before committing.',
  long: 'Every discovered event goes through a multi-factor scoring process: traffic volume at the location, research confidence from independent verification, historical event density in the area, and whether the event has recurred annually. One avoided fake event pays for 2 to 6 months of TruckFull.',
};

export const liveGpsFeature: FeatureDescription = {
  short:
    'Go live with one tap. Your location appears on the map for customers nearby. Close shop and it reverts automatically.',
  long: 'One tap to go live. Your GPS location appears on the public map for anyone nearby to see. A green status ring shows you are open. Close shop and it reverts to your default location automatically. No more where-are-you DMs, no missed walk-ups.',
};

export const trafficIntelligenceFeature: FeatureDescription = {
  short:
    'Access vehicle traffic data from thousands of DOT monitoring stations. A heatmap shows high-traffic areas so you can scout locations before you park.',
  long: 'TruckFull aggregates historical vehicle traffic data from thousands of monitoring stations across Georgia and South Carolina. The field guide shows a heatmap overlay — red means busy, green means quiet — so you can scout high-traffic areas without driving around. Find hotspots. Stop guessing which intersection gets more traffic. Pick your spot with data, not hope.',
};

export const menuManagementFeature: FeatureDescription = {
  short:
    'Keep your menu and operating schedule current so customers always know what you serve and when.',
  long: 'Update your menu categories, items, and prices anytime. Set your recurring schedule or add special events. Customers see everything on your truck profile — no more outdated Facebook posts or missed opportunities because someone did not know you were open.',
};

export const quickCheckFeature: FeatureDescription = {
  short:
    'A checklist that helps you spot red flags before you pay a vendor fee.',
  long: 'Quick Check \u2014 12 red flags before you pay. P2P-only payment? High-pressure deposit? No contract? No digital footprint? A printable checklist helps you spot the warning signs before you commit your time and gas money. These are the red flags that separate legitimate events from risky ones.',
};

export const posterInvestigationFeature: FeatureDescription = {
  short:
    'Paste a flyer or upload an image. TruckFull reads it, extracts the details, and builds a structured event profile with a risk audit.',
  long: 'See an event flyer on Facebook or in a group chat? Paste the text or upload the image. TruckFull reads it, pulls out the event details, and builds a structured profile with a full risk audit. Save hours of Googling venue addresses, tracking down organizer contact info, and wondering if the event is legit.',
};

export const contactVerificationFeature: FeatureDescription = {
  short:
    'TruckFull cross-checks phone numbers and emails against independent sources to flag mismatches.',
  long: 'The phone number on that flyer — does it actually belong to the venue? That email — is it the real organizer? TruckFull cross-checks contact info against independent sources and flags mismatches before you commit. A 1 dollar verify beats a 50 to 200 dollar fake event — that is a 50x to 200x return.',
};

export const sourceTrustFeature: FeatureDescription = {
  short:
    'High-trust sources like .gov sites carry more weight than random social media events. TruckFull flags the difference.',
  long: 'A listing on a .gov site carries more weight than a random Facebook event. TruckFull flags high-trust sources like government permit systems and educational institutions, and flags low-trust sources that lack established digital presence. Every claim on that flyer gets verified against what TruckFull finds independently online.',
};

export const compatibilityFeature: FeatureDescription = {
  short:
    'TruckFull checks whether your menu fits the event so you do not apply to the wrong ones.',
  long: 'A BBQ truck gets a boost at a cook-off. A taco truck sees elevated scores for Cinco de Mayo events. The system also flags incompatibilities — so you do not accidentally apply to an event where your menu does not fit.',
};

export const eventPipelineFeature: FeatureDescription = {
  short:
    'Save events you are interested in. Track applications. See what is coming up this week, this month, or this season.',
  long: 'Save events you are interested in. Track your applications. See which events are coming up this week, this month, or this season. Free accounts can save up to 5 leads; Pro users get unlimited saves and advanced calendar views.',
};

export const liveLocationStatusRingFeature: FeatureDescription = {
  short:
    'A real-time status indicator shows customers if you are open and where.',
  long: 'Your truck profile shows a real-time status indicator. Green means you are open and accepting customers at the mapped location. Gray means you are closed or operating at your default spot. Customers can filter the map to show only trucks that are currently open.',
};

export const customerNotificationsFeature: FeatureDescription = {
  short: 'Coming soon: customers who saved your truck get an alert when you go live nearby.',
  long: 'Coming soon. Customers who saved your truck as a favorite will get an alert on their phone when you go live nearby, with no social media post needed. Until then, anyone nearby can see you on the live map the moment you go live.',
};

export const liveLocationHowItWorks: FeatureDescription = {
  short: 'One tap to go live, one tap to close up.',
  long: 'Sign in to your owner dashboard on any device. Tap Go Live — your current GPS location is broadcast to the public map. A green status ring appears around your truck. Anyone browsing TruckFull in your area sees you are open for business. Tap close and your location reverts to your default spot. No manual updates needed.',
};

export const worksEverywhereFeature: FeatureDescription = {
  short:
    'TruckFull live location works across Georgia and South Carolina wherever you have a GPS signal.',
  long: 'No hardware to install. No external devices. Just your phone and the TruckFull app. Works wherever you have GPS in Georgia and South Carolina.',
};

export const hotspotDiscoveryFeature: FeatureDescription = {
  short:
    'TruckFull identifies traffic hotspots — areas with unusually high vehicle activity — so you can plan routes around proven locations.',
  long: 'TruckFull identifies traffic hotspots — areas with unusually high vehicle activity — and makes them available on your map. Plan your weekly route around proven high-traffic locations instead of rolling the dice on a new spot.',
};

export const eventLocationScoringFeature: FeatureDescription = {
  short:
    'Event locations are automatically scored using nearby traffic data so high-traffic events rank higher in your recommendations.',
  long: 'When TruckFull discovers an event, the location is automatically scored using nearby traffic data. High-traffic event locations rank higher in your recommendations. Low-traffic or remote locations get flagged so you can factor that into your decision. Combined with historical event density and recurrence data, you get a complete picture of an event potential before you commit.',
};

export const fieldGuideFeature: FeatureDescription = {
  short:
    'The TruckFull field guide shows traffic volume as a heatmap overlay on an interactive map.',
  long: 'The TruckFull field guide displays traffic volume as a heatmap overlay on an interactive map. Pan across any city in Georgia or South Carolina. Tap a location to see traffic stats for the surrounding area. Find the busy intersections, the high-traffic corridors, and the hidden gems before you drive out to scout in person.',
};

export const claimYourTruckFeature: FeatureDescription = {
  short:
    'Your truck may already be in our directory. Claim it for free to take control of your profile and start using owner tools.',
  long: 'Your truck may already be in our directory. Claim it for free to take control of your profile, add your menu, and start discovering events. A Pro tier unlocks unlimited saved leads, the full traffic field guide, and advanced analytics.',
};

export const organizerPostEventFeature: FeatureDescription = {
  short:
    'List your event on TruckFull and reach food truck operators across the region.',
  long: 'List your event on TruckFull and reach food truck operators across the region. Include details like date, location, expected attendance, and cuisine preferences.',
};

export const organizerReviewApplicationsFeature: FeatureDescription = {
  short: 'Review truck applications, menus, cuisine types, and availability in one place.',
  long: 'Food truck operators apply through the platform. Review their menus, cuisine types, ratings, and availability in one place.',
};

export const organizerManageRosterFeature: FeatureDescription = {
  short: 'Accept, decline, or waitlist applications. Communicate with operators directly.',
  long: 'Accept, decline, or waitlist applications. Communicate with operators directly. Track event logistics from a single dashboard.',
};

export const organizerCuratedNetworkFeature: FeatureDescription = {
  short:
    'Your event reaches qualified operators, not just whoever sees a Facebook post.',
  long: 'TruckFull tracks hundreds of food trucks across Georgia and South Carolina. Your event reaches qualified operators, not just whoever sees a Facebook post.',
};

export const organizerVerifiedProfilesFeature: FeatureDescription = {
  short:
    'Every truck has a profile with cuisine type, menu, location, and operating status.',
  long: 'Every truck on TruckFull has a profile with cuisine type, menu, location, and operating status. You know exactly who you are booking.',
};
