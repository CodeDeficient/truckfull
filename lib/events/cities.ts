import { config } from 'dotenv';
config({ path: '.env.local' });
import type { EprovalCityConfig } from '@/lib/events/types';

export const SAVANNAH_CONFIG: EprovalCityConfig = {
  city: 'Savannah',
  state: 'GA',
  calendarKey: process.env.SAVANNAH_EPROVAL_CALENDAR_KEY ?? '',
  clientUri: 'https://eproval.savannahga.gov/',
  source: 'savannah_eproval',
  sourceType: 'eproval',
  latitude: 32.0809,
  longitude: -81.0912,
};

export const SAVANNAH_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Savannah',
  state: 'GA',
  source: 'savannah_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.0809,
  longitude: -81.0912,
  radius: 15,
};

export const AUGUSTA_CONFIG: EprovalCityConfig = {
  city: 'Augusta',
  state: 'GA',
  source: 'augusta_civicplus',
  sourceType: 'civicplus_rss',
  rssUrl: 'https://www.augustaga.gov/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
  latitude: 33.4735,
  longitude: -82.0105,
};

export const COLUMBIA_COUNTY_CONFIG: EprovalCityConfig = {
  city: 'Columbia County',
  state: 'GA',
  source: 'columbia_county_civicplus',
  sourceType: 'civicplus_rss',
  rssUrl: 'https://www.columbiacountyga.gov/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
  latitude: 33.5602,
  longitude: -82.1998,
};

export const ATHENS_CONFIG: EprovalCityConfig = {
  city: 'Athens',
  state: 'GA',
  source: 'athens_civicplus',
  sourceType: 'civicplus_rss',
  rssUrl: 'https://www.accgov.com/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
  latitude: 33.9519,
  longitude: -83.3576,
};

export const AUGUSTA_CVB_CONFIG: EprovalCityConfig = {
  city: 'Augusta',
  state: 'GA',
  source: 'augusta_cvb',
  sourceType: 'simpleview_rss',
  rssUrl: 'https://www.visitaugusta.com/event/rss/',
  latitude: 33.4735,
  longitude: -82.0105,
};

export const COLUMBIA_SC_CVB_CONFIG: EprovalCityConfig = {
  city: 'Columbia',
  state: 'SC',
  source: 'columbia_sc_cvb',
  sourceType: 'simpleview_rss',
  rssUrl: 'https://www.experiencecolumbiasc.com/event/rss/',
  latitude: 34.0007,
  longitude: -81.0348,
};

export const WAYNESBORO_CONFIG: EprovalCityConfig = {
  city: 'Waynesboro',
  state: 'GA',
  source: 'waynesboro_ical',
  sourceType: 'ical',
  rssUrl:
    'https://www.waynesboroga.com/common/modules/iCalendar/iCalendar.aspx?catID=14&feed=calendar',
  latitude: 33.0904,
  longitude: -82.0148,
};

export const AIKEN_CONFIG: EprovalCityConfig = {
  city: 'Aiken',
  state: 'SC',
  source: 'aiken_playwright',
  sourceType: 'aiken_playwright',
  rssUrl: 'https://www.cityofaikensc.gov/calendar-of-events/',
  latitude: 33.5604,
  longitude: -81.7196,
};

export const GREENVILLE_SC_CONFIG: EprovalCityConfig = {
  city: 'Greenville',
  state: 'SC',
  source: 'greenville_sc_cvb',
  sourceType: 'simpleview_rss',
  rssUrl: 'https://www.visitgreenvillesc.com/event/rss/',
  latitude: 34.85,
  longitude: -82.4,
};

export const SPARTANBURG_CONFIG: EprovalCityConfig = {
  city: 'Spartanburg',
  state: 'SC',
  source: 'spartanburg_civicplus',
  sourceType: 'civicplus_rss',
  rssUrl: 'https://www.cityofspartanburg.org/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
  latitude: 34.9496,
  longitude: -81.9321,
};

export const CHARLESTON_CONFIG: EprovalCityConfig = {
  city: 'Charleston',
  state: 'SC',
  source: 'charleston_civicplus',
  sourceType: 'civicplus_rss',
  rssUrl: 'https://www.charleston-sc.gov/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
  latitude: 32.78,
  longitude: -79.93,
};

export const MYRTLE_BEACH_CONFIG: EprovalCityConfig = {
  city: 'Myrtle Beach',
  state: 'SC',
  source: 'myrtle_beach_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.6891,
  longitude: -78.8867,
  radius: 10,
};

export const CHARLESTON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Charleston',
  state: 'SC',
  source: 'charleston_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.78,
  longitude: -79.93,
  radius: 15,
};

export const COLUMBIA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Columbia',
  state: 'SC',
  source: 'columbia_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.0007,
  longitude: -81.0348,
  radius: 15,
};

export const GREENVILLE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Greenville',
  state: 'SC',
  source: 'greenville_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.85,
  longitude: -82.4,
  radius: 15,
};

export const HILTON_HEAD_CONFIG: EprovalCityConfig = {
  city: 'Hilton Head',
  state: 'SC',
  source: 'hilton_head_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.2163,
  longitude: -80.7526,
  radius: 10,
};

export const FLORENCE_CONFIG: EprovalCityConfig = {
  city: 'Florence',
  state: 'SC',
  source: 'florence_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.1954,
  longitude: -79.7626,
  radius: 10,
};

export const AUGUSTA_GA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Augusta',
  state: 'GA',
  source: 'augusta_ga_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.4735,
  longitude: -82.0105,
  radius: 15,
};

export const AIKEN_SC_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Aiken',
  state: 'SC',
  source: 'aiken_sc_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.5604,
  longitude: -81.7196,
  radius: 10,
};

export const NORTH_AUGUSTA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'North Augusta',
  state: 'SC',
  source: 'north_augusta_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.5088,
  longitude: -81.9646,
  radius: 10,
};

export const EVANS_GA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Evans',
  state: 'GA',
  source: 'evans_ga_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.531,
  longitude: -82.1207,
  radius: 10,
};

export const MARTINEZ_GA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Martinez',
  state: 'GA',
  source: 'martinez_ga_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.5146,
  longitude: -82.084,
  radius: 10,
};

export const GROVETOWN_GA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Grovetown',
  state: 'GA',
  source: 'grovetown_ga_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.4513,
  longitude: -82.1963,
  radius: 10,
};

export const AIKEN_COUNTY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Aiken County',
  state: 'SC',
  source: 'aiken_county_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.543,
  longitude: -81.64,
  radius: 20,
};

export const COLUMBIA_COUNTY_GA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Columbia County',
  state: 'GA',
  source: 'columbia_county_ga_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.5602,
  longitude: -82.1998,
  radius: 15,
};

export const ATLANTA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Atlanta',
  state: 'GA',
  source: 'atlanta_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.749,
  longitude: -84.388,
  radius: 20,
};

export const ATHENS_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Athens',
  state: 'GA',
  source: 'athens_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.9519,
  longitude: -83.3576,
  radius: 15,
};

export const MARIETTA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Marietta',
  state: 'GA',
  source: 'marietta_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.9526,
  longitude: -84.5499,
  radius: 15,
};

export const DALTON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Dalton',
  state: 'GA',
  source: 'dalton_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.7698,
  longitude: -84.9702,
  radius: 15,
};

export const WARNER_ROBINS_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Warner Robins',
  state: 'GA',
  source: 'warner_robins_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.613,
  longitude: -83.6249,
  radius: 15,
};

export const DUBLIN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Dublin',
  state: 'GA',
  source: 'dublin_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.5404,
  longitude: -82.9038,
  radius: 15,
};

export const VIDALIA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Vidalia',
  state: 'GA',
  source: 'vidalia_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.2177,
  longitude: -82.4135,
  radius: 15,
};

export const BRUNSWICK_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Brunswick',
  state: 'GA',
  source: 'brunswick_eventbrite',
  sourceType: 'eventbrite',
  latitude: 31.1495,
  longitude: -81.4915,
  radius: 15,
};

export const NEWNAN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Newnan',
  state: 'GA',
  source: 'newnan_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.3807,
  longitude: -84.7997,
  radius: 15,
};

export const JESUP_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Jesup',
  state: 'GA',
  source: 'jesup_eventbrite',
  sourceType: 'eventbrite',
  latitude: 31.6074,
  longitude: -81.8854,
  radius: 15,
};

export const WASHINGTON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Washington',
  state: 'GA',
  source: 'washington_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.7368,
  longitude: -82.7393,
  radius: 15,
};

export const THOMSON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Thomson',
  state: 'GA',
  source: 'thomson_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.4707,
  longitude: -82.5046,
  radius: 15,
};

export const CONWAY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Conway',
  state: 'SC',
  source: 'conway_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.836,
  longitude: -79.0478,
  radius: 15,
};

export const SUMTER_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Sumter',
  state: 'SC',
  source: 'sumter_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.9204,
  longitude: -80.3415,
  radius: 15,
};

export const NORTH_CHARLESTON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'North Charleston',
  state: 'SC',
  source: 'north_charleston_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.8546,
  longitude: -79.9748,
  radius: 15,
};

export const ORANGEBURG_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Orangeburg',
  state: 'SC',
  source: 'orangeburg_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.4918,
  longitude: -80.8556,
  radius: 15,
};

export const ROCK_HILL_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Rock Hill',
  state: 'SC',
  source: 'rock_hill_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.9249,
  longitude: -81.0251,
  radius: 15,
};

export const GAFFNEY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Gaffney',
  state: 'SC',
  source: 'gaffney_eventbrite',
  sourceType: 'eventbrite',
  latitude: 35.0718,
  longitude: -81.6498,
  radius: 15,
};

export const CLEMSON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Clemson',
  state: 'SC',
  source: 'clemson_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.685,
  longitude: -82.8364,
  radius: 15,
};

export const CAMDEN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Camden',
  state: 'SC',
  source: 'camden_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.2465,
  longitude: -80.607,
  radius: 15,
};

export const MARION_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Marion',
  state: 'SC',
  source: 'marion_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.1782,
  longitude: -79.4006,
  radius: 15,
};

export const DILLON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Dillon',
  state: 'SC',
  source: 'dillon_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.4182,
  longitude: -79.3712,
  radius: 15,
};

export const BENNETTSVILLE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Bennettsville',
  state: 'SC',
  source: 'bennettsville_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.6174,
  longitude: -79.6848,
  radius: 15,
};

export const LANCASTER_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Lancaster',
  state: 'SC',
  source: 'lancaster_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.7204,
  longitude: -80.7709,
  radius: 15,
};

export const MANNING_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Manning',
  state: 'SC',
  source: 'manning_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.6952,
  longitude: -80.2109,
  radius: 15,
};

export const LEXINGTON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Lexington',
  state: 'SC',
  source: 'lexington_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.9813,
  longitude: -81.2362,
  radius: 15,
};

export const GEORGETOWN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Georgetown',
  state: 'SC',
  source: 'georgetown_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.3668,
  longitude: -79.2945,
  radius: 15,
};

export const SUMMERVILLE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Summerville',
  state: 'SC',
  source: 'summerville_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.0185,
  longitude: -80.1756,
  radius: 15,
};

export const MONCKS_CORNER_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Moncks Corner',
  state: 'SC',
  source: 'moncks_corner_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.196,
  longitude: -80.0131,
  radius: 15,
};

export const BLYTHEWOOD_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Blythewood',
  state: 'SC',
  source: 'blythewood_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.2182,
  longitude: -80.974,
  radius: 15,
};

export const GREER_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Greer',
  state: 'SC',
  source: 'greer_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.9387,
  longitude: -82.2271,
  radius: 15,
};

export const LORIS_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Loris',
  state: 'SC',
  source: 'loris_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.056,
  longitude: -78.8903,
  radius: 15,
};

export const BOILING_SPRINGS_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Boiling Springs',
  state: 'SC',
  source: 'boiling_springs_eventbrite',
  sourceType: 'eventbrite',
  latitude: 35.0426,
  longitude: -81.9818,
  radius: 15,
};

export const NORTH_MYRTLE_BEACH_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'North Myrtle Beach',
  state: 'SC',
  source: 'north_myrtle_beach_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.816,
  longitude: -78.68,
  radius: 15,
};

export const MOUNT_PLEASANT_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Mount Pleasant',
  state: 'SC',
  source: 'mount_pleasant_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.7942,
  longitude: -79.8626,
  radius: 15,
};

export const GOOSE_CREEK_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Goose Creek',
  state: 'SC',
  source: 'goose_creek_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.981,
  longitude: -80.0326,
  radius: 15,
};

export const WEST_COLUMBIA_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'West Columbia',
  state: 'SC',
  source: 'west_columbia_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.9935,
  longitude: -81.0737,
  radius: 15,
};

export const EDGEFIELD_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Edgefield',
  state: 'SC',
  source: 'edgefield_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.7896,
  longitude: -81.9296,
  radius: 15,
};

export const SIMPSONVILLE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Simpsonville',
  state: 'SC',
  source: 'simpsonville_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.7371,
  longitude: -82.2543,
  radius: 15,
};

export const MAULDIN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Mauldin',
  state: 'SC',
  source: 'mauldin_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.7787,
  longitude: -82.3001,
  radius: 15,
};

export const EASLEY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Easley',
  state: 'SC',
  source: 'easley_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.8298,
  longitude: -82.6015,
  radius: 15,
};

export const INMAN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Inman',
  state: 'SC',
  source: 'inman_eventbrite',
  sourceType: 'eventbrite',
  latitude: 35.0476,
  longitude: -82.0904,
  radius: 15,
};

export const ELGIN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Elgin',
  state: 'SC',
  source: 'elgin_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.1704,
  longitude: -80.794,
  radius: 15,
};

export const JOHNSTON_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Johnston',
  state: 'SC',
  source: 'johnston_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.8321,
  longitude: -81.8007,
  radius: 15,
};

export const SPRINGFIELD_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Springfield',
  state: 'SC',
  source: 'springfield_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.4957,
  longitude: -81.2793,
  radius: 15,
};

export const GRAY_COURT_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Gray Court',
  state: 'SC',
  source: 'gray_court_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.6087,
  longitude: -82.1137,
  radius: 15,
};

export const LAKE_CITY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Lake City',
  state: 'SC',
  source: 'lake_city_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.871,
  longitude: -79.7553,
  radius: 15,
};

export const WARRENVILLE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Warrenville',
  state: 'SC',
  source: 'warrenville_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.5507,
  longitude: -81.804,
  radius: 15,
};

export const HEMINGWAY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Hemingway',
  state: 'SC',
  source: 'hemingway_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.7538,
  longitude: -79.4462,
  radius: 15,
};

export const HARTSVILLE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Hartsville',
  state: 'SC',
  source: 'hartsville_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.374,
  longitude: -80.0734,
  radius: 15,
};

export const WALTERBORO_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Walterboro',
  state: 'SC',
  source: 'walterboro_eventbrite',
  sourceType: 'eventbrite',
  latitude: 32.9052,
  longitude: -80.6668,
  radius: 15,
};

export const PAWLEYS_ISLAND_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Pawleys Island',
  state: 'SC',
  source: 'pawleys_island_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.4302,
  longitude: -79.125,
  radius: 15,
};

export const GARDEN_CITY_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Garden City',
  state: 'SC',
  source: 'garden_city_eventbrite',
  sourceType: 'eventbrite',
  latitude: 33.5793,
  longitude: -78.9906,
  radius: 15,
};

export const INDIAN_LAND_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Indian Land',
  state: 'SC',
  source: 'indian_land_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.9993,
  longitude: -80.8562,
  radius: 15,
};

export const CHARLOTTE_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Charlotte',
  state: 'NC',
  source: 'charlotte_eventbrite',
  sourceType: 'eventbrite',
  latitude: 35.2271,
  longitude: -80.8431,
  radius: 20,
};

export const KINGS_MOUNTAIN_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Kings Mountain',
  state: 'NC',
  source: 'kings_mountain_eventbrite',
  sourceType: 'eventbrite',
  latitude: 35.244,
  longitude: -81.3412,
  radius: 15,
};

export const LAURINBURG_EVENTBRITE_CONFIG: EprovalCityConfig = {
  city: 'Laurinburg',
  state: 'NC',
  source: 'laurinburg_eventbrite',
  sourceType: 'eventbrite',
  latitude: 34.774,
  longitude: -79.4628,
  radius: 15,
};

export const VALDOSTA_CONFIG: EprovalCityConfig = {
  city: 'Valdosta',
  state: 'GA',
  source: 'valdosta_tourism',
  sourceType: 'tourism_html',
  latitude: 30.8487,
  longitude: -83.2785,
  tourismSelectors: {
    url: 'https://visitvaldosta.org/events/',
    eventContainerSelector: '.event',
    titleSelector: '.txt h3',
    dateSelector: '.txt > span',
    daySelector: '.date span',
    descriptionSelector: '.event > p',
    linkSelector: 'a',
    defaultLocation: 'Valdosta, GA',
    dateParsePattern: String.raw`(\w+ \d{1,2}(?: - \w+ \d{1,2})?, \d{4})`,
  },
};

export const MACON_CONFIG: EprovalCityConfig = {
  city: 'Macon',
  state: 'GA',
  source: 'macon_algolia',
  sourceType: 'algolia_api',
  latitude: 32.8407,
  longitude: -83.6324,
  algoliaConfig: {
    // Public by design: Algolia search-only key + public application ID, used
    // solely to read the public Macon event index. Not secrets — do not report.
    appId: process.env.MACON_ALGOLIA_APP_ID ?? '',
    apiKey: process.env.MACON_ALGOLIA_API_KEY ?? '',
    indexName: 'prod-macon-georgia-listings',
    filters: 'sectionName:"Events" AND (NOT isPrimaryEvent:false)',
  },
};

export const COLUMBUS_GA_CONFIG: EprovalCityConfig = {
  city: 'Columbus',
  state: 'GA',
  source: 'columbus_ga_timely',
  sourceType: 'timely_api',
  latitude: 32.4607,
  longitude: -84.9877,
  timelyConfig: {
    // Public by design: Timely calendar-embed key, exposed client-side by the
    // provider for public event listings. Not a secret — do not report.
    calendarId: '54704419',
    apiKey: process.env.COLUMBUS_TIMELY_API_KEY ?? '',
  },
};

export const DURHAM_PERMITS_CONFIG: EprovalCityConfig = {
  city: 'Durham',
  state: 'NC',
  source: 'durham_permits',
  sourceType: 'arcgis_permits',
  latitude: 35.994,
  longitude: -78.8986,
  arcgisConfig: {
    layerUrl:
      'https://services2.arcgis.com/G5vR3cOjh6g2Ed8E/arcgis/rest/services/Special_Events_approved/FeatureServer/0',
    where: "permitstatus = 'Approved' AND opentopublic = 'Yes' AND eventend >= CURRENT_TIMESTAMP",
    idField: 'GlobalID',
    titleField: 'eventnm',
    startField: 'eventstart',
    endField: 'eventend',
    categoryField: 'eventtype',
    descriptionField: 'description',
    organizationField: 'orgname',
    websiteField: 'eventurl',
    locationField: 'eventdesc',
    defaultLocation: 'Durham, NC',
  },
};

export const RALEIGH_PERMITS_CONFIG: EprovalCityConfig = {
  city: 'Raleigh',
  state: 'NC',
  source: 'raleigh_permits',
  sourceType: 'arcgis_permits',
  latitude: 35.7796,
  longitude: -78.6382,
  arcgisConfig: {
    layerUrl:
      'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Special_Events_All_Routes/FeatureServer/0',
    where:
      "STATUS = 'Approved' AND EVENT_TYPE <> 'Neighborhood Block Party' AND EVENT_ENDDATE >= CURRENT_TIMESTAMP",
    idField: 'OBJECTID',
    titleField: 'EVENT_NAME',
    startField: 'EVENT_STARTDATE',
    endField: 'EVENT_ENDDATE',
    categoryField: 'EVENT_TYPE',
    descriptionField: 'COMMENTS',
    defaultLocation: 'Raleigh, NC',
  },
};

export const CITIES: Record<string, EprovalCityConfig> = {
  savannah: SAVANNAH_CONFIG,
  savannah_eb: SAVANNAH_EVENTBRITE_CONFIG,
  augusta: AUGUSTA_CONFIG,
  columbia_county: COLUMBIA_COUNTY_CONFIG,
  athens: ATHENS_CONFIG,
  augusta_cvb: AUGUSTA_CVB_CONFIG,
  columbia_sc: COLUMBIA_SC_CVB_CONFIG,
  waynesboro: WAYNESBORO_CONFIG,
  // aiken: AIKEN_CONFIG, // disabled — requires Playwright browser not available on server
  greenville_sc: GREENVILLE_SC_CONFIG,
  spartanburg: SPARTANBURG_CONFIG,
  charleston: CHARLESTON_CONFIG,
  myrtle_beach: MYRTLE_BEACH_CONFIG,
  charleston_eb: CHARLESTON_EVENTBRITE_CONFIG,
  columbia_eb: COLUMBIA_EVENTBRITE_CONFIG,
  greenville_eb: GREENVILLE_EVENTBRITE_CONFIG,
  hilton_head: HILTON_HEAD_CONFIG,
  florence: FLORENCE_CONFIG,
  augusta_ga_eb: AUGUSTA_GA_EVENTBRITE_CONFIG,
  aiken_sc_eb: AIKEN_SC_EVENTBRITE_CONFIG,
  north_augusta_eb: NORTH_AUGUSTA_EVENTBRITE_CONFIG,
  evans_ga_eb: EVANS_GA_EVENTBRITE_CONFIG,
  martinez_ga_eb: MARTINEZ_GA_EVENTBRITE_CONFIG,
  grovetown_ga_eb: GROVETOWN_GA_EVENTBRITE_CONFIG,
  aiken_county_eb: AIKEN_COUNTY_EVENTBRITE_CONFIG,
  columbia_county_ga_eb: COLUMBIA_COUNTY_GA_EVENTBRITE_CONFIG,
  atlanta_eb: ATLANTA_EVENTBRITE_CONFIG,
  athens_eb: ATHENS_EVENTBRITE_CONFIG,
  marietta_eb: MARIETTA_EVENTBRITE_CONFIG,
  dalton_eb: DALTON_EVENTBRITE_CONFIG,
  warner_robins_eb: WARNER_ROBINS_EVENTBRITE_CONFIG,
  dublin_eb: DUBLIN_EVENTBRITE_CONFIG,
  vidalia_eb: VIDALIA_EVENTBRITE_CONFIG,
  brunswick_eb: BRUNSWICK_EVENTBRITE_CONFIG,
  newnan_eb: NEWNAN_EVENTBRITE_CONFIG,
  jesup_eb: JESUP_EVENTBRITE_CONFIG,
  washington_eb: WASHINGTON_EVENTBRITE_CONFIG,
  thomson_eb: THOMSON_EVENTBRITE_CONFIG,
  conway_eb: CONWAY_EVENTBRITE_CONFIG,
  sumter_eb: SUMTER_EVENTBRITE_CONFIG,
  north_charleston_eb: NORTH_CHARLESTON_EVENTBRITE_CONFIG,
  orangeburg_eb: ORANGEBURG_EVENTBRITE_CONFIG,
  rock_hill_eb: ROCK_HILL_EVENTBRITE_CONFIG,
  gaffney_eb: GAFFNEY_EVENTBRITE_CONFIG,
  clemson_eb: CLEMSON_EVENTBRITE_CONFIG,
  camden_eb: CAMDEN_EVENTBRITE_CONFIG,
  marion_eb: MARION_EVENTBRITE_CONFIG,
  dillon_eb: DILLON_EVENTBRITE_CONFIG,
  bennettsville_eb: BENNETTSVILLE_EVENTBRITE_CONFIG,
  lancaster_eb: LANCASTER_EVENTBRITE_CONFIG,
  manning_eb: MANNING_EVENTBRITE_CONFIG,
  lexington_eb: LEXINGTON_EVENTBRITE_CONFIG,
  georgetown_eb: GEORGETOWN_EVENTBRITE_CONFIG,
  summerville_eb: SUMMERVILLE_EVENTBRITE_CONFIG,
  moncks_corner_eb: MONCKS_CORNER_EVENTBRITE_CONFIG,
  blythewood_eb: BLYTHEWOOD_EVENTBRITE_CONFIG,
  greer_eb: GREER_EVENTBRITE_CONFIG,
  loris_eb: LORIS_EVENTBRITE_CONFIG,
  boiling_springs_eb: BOILING_SPRINGS_EVENTBRITE_CONFIG,
  north_myrtle_beach_eb: NORTH_MYRTLE_BEACH_EVENTBRITE_CONFIG,
  mount_pleasant_eb: MOUNT_PLEASANT_EVENTBRITE_CONFIG,
  goose_creek_eb: GOOSE_CREEK_EVENTBRITE_CONFIG,
  west_columbia_eb: WEST_COLUMBIA_EVENTBRITE_CONFIG,
  edgefield_eb: EDGEFIELD_EVENTBRITE_CONFIG,
  simpsonville_eb: SIMPSONVILLE_EVENTBRITE_CONFIG,
  mauldin_eb: MAULDIN_EVENTBRITE_CONFIG,
  easley_eb: EASLEY_EVENTBRITE_CONFIG,
  inman_eb: INMAN_EVENTBRITE_CONFIG,
  elgin_eb: ELGIN_EVENTBRITE_CONFIG,
  johnston_eb: JOHNSTON_EVENTBRITE_CONFIG,
  springfield_eb: SPRINGFIELD_EVENTBRITE_CONFIG,
  gray_court_eb: GRAY_COURT_EVENTBRITE_CONFIG,
  lake_city_eb: LAKE_CITY_EVENTBRITE_CONFIG,
  warrenville_eb: WARRENVILLE_EVENTBRITE_CONFIG,
  hemingway_eb: HEMINGWAY_EVENTBRITE_CONFIG,
  hartsville_eb: HARTSVILLE_EVENTBRITE_CONFIG,
  walterboro_eb: WALTERBORO_EVENTBRITE_CONFIG,
  pawleys_island_eb: PAWLEYS_ISLAND_EVENTBRITE_CONFIG,
  garden_city_eb: GARDEN_CITY_EVENTBRITE_CONFIG,
  indian_land_eb: INDIAN_LAND_EVENTBRITE_CONFIG,
  charlotte_eb: CHARLOTTE_EVENTBRITE_CONFIG,
  kings_mountain_eb: KINGS_MOUNTAIN_EVENTBRITE_CONFIG,
  laurinburg_eb: LAURINBURG_EVENTBRITE_CONFIG,
  valdosta: VALDOSTA_CONFIG,
  macon: MACON_CONFIG,
  columbus_ga: COLUMBUS_GA_CONFIG,
  durham_permits: DURHAM_PERMITS_CONFIG,
  raleigh_permits: RALEIGH_PERMITS_CONFIG,
};
