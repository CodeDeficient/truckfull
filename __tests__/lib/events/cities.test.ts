import { jest, describe, it, expect } from '@jest/globals';

describe('CITIES config', () => {
  it('has config-only cities with correct fields', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    const configCities = ['greenville_sc', 'spartanburg', 'charleston'];

    for (const key of configCities) {
      expect(CITIES[key]).toBeDefined();
      expect(CITIES[key].city).toBeDefined();
      expect(CITIES[key].state).toBeDefined();
      expect(CITIES[key].source).toBeDefined();
      expect(CITIES[key].sourceType).toBeDefined();
      expect(CITIES[key].rssUrl).toBeDefined();
    }
  });

  it('greenville uses simpleview_rss adapter', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.greenville_sc.sourceType).toBe('simpleview_rss');
    expect(CITIES.greenville_sc.city).toBe('Greenville');
    expect(CITIES.greenville_sc.state).toBe('SC');
    expect(CITIES.greenville_sc.source).toBe('greenville_sc_cvb');
    expect(CITIES.greenville_sc.rssUrl).toBe('https://www.visitgreenvillesc.com/event/rss/');
  });

  it('spartanburg uses civicplus_rss adapter', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.spartanburg.sourceType).toBe('civicplus_rss');
    expect(CITIES.spartanburg.city).toBe('Spartanburg');
    expect(CITIES.spartanburg.state).toBe('SC');
    expect(CITIES.spartanburg.source).toBe('spartanburg_civicplus');
    expect(CITIES.spartanburg.rssUrl).toBe(
      'https://www.cityofspartanburg.org/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
    );
  });

  it('athens uses civicplus_rss adapter', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.athens.sourceType).toBe('civicplus_rss');
    expect(CITIES.athens.city).toBe('Athens');
    expect(CITIES.athens.state).toBe('GA');
    expect(CITIES.athens.source).toBe('athens_civicplus');
    expect(CITIES.athens.rssUrl).toBe(
      'https://www.accgov.com/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
    );
  });

  it('charleston uses civicplus_rss adapter', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.charleston.sourceType).toBe('civicplus_rss');
    expect(CITIES.charleston.city).toBe('Charleston');
    expect(CITIES.charleston.state).toBe('SC');
    expect(CITIES.charleston.source).toBe('charleston_civicplus');
    expect(CITIES.charleston.rssUrl).toBe(
      'https://www.charleston-sc.gov/RSSFeed.aspx?ModID=58&CID=All-calendar.xml',
    );
  });

  it('all config-only cities have valid rssUrl', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    const configCities = ['greenville_sc', 'spartanburg', 'charleston'];

    for (const key of configCities) {
      expect(CITIES[key].rssUrl).toMatch(/^https:\/\//);
    }
  });

  it('myrtle_beach uses eventbrite adapter with location params', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.myrtle_beach.sourceType).toBe('eventbrite');
    expect(CITIES.myrtle_beach.city).toBe('Myrtle Beach');
    expect(CITIES.myrtle_beach.state).toBe('SC');
    expect(CITIES.myrtle_beach.source).toBe('myrtle_beach_eventbrite');
    expect(CITIES.myrtle_beach.latitude).toBe(33.6891);
    expect(CITIES.myrtle_beach.longitude).toBe(-78.8867);
    expect(CITIES.myrtle_beach.radius).toBe(25);
  });

  it('tourism cities have tourismSelectors with required fields', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.valdosta).toBeDefined();
    expect(CITIES.valdosta.sourceType).toBe('tourism_html');
    expect(CITIES.valdosta.tourismSelectors).toBeDefined();
    expect(CITIES.valdosta.tourismSelectors!.url).toMatch(/^https:\/\//);
    expect(CITIES.valdosta.tourismSelectors!.eventContainerSelector).toBeTruthy();
    expect(CITIES.valdosta.tourismSelectors!.titleSelector).toBeTruthy();
    expect(CITIES.valdosta.tourismSelectors!.dateSelector).toBeTruthy();
    expect(CITIES.valdosta.tourismSelectors!.dateParsePattern).toBeTruthy();
  });

  it('algolia city has algoliaConfig with required fields', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.macon).toBeDefined();
    expect(CITIES.macon.sourceType).toBe('algolia_api');
    expect(CITIES.macon.algoliaConfig).toBeDefined();
    expect(CITIES.macon.algoliaConfig!.appId).toBeDefined();
    expect(CITIES.macon.algoliaConfig!.indexName).toBe('prod-macon-georgia-listings');
    expect(CITIES.macon.algoliaConfig!.filters).toBeTruthy();
  });

  it('timely city has timelyConfig with required fields', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.columbus_ga).toBeDefined();
    expect(CITIES.columbus_ga.sourceType).toBe('timely_api');
    expect(CITIES.columbus_ga.timelyConfig).toBeDefined();
    expect(CITIES.columbus_ga.timelyConfig!.calendarId).toBe('54704419');
  });

  it('tourism cities have correct source identifiers', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    expect(CITIES.valdosta.source).toBe('valdosta_tourism');
    expect(CITIES.valdosta.city).toBe('Valdosta');
    expect(CITIES.valdosta.state).toBe('GA');

    expect(CITIES.macon.source).toBe('macon_algolia');
    expect(CITIES.macon.city).toBe('Macon');
    expect(CITIES.macon.state).toBe('GA');

    expect(CITIES.columbus_ga.source).toBe('columbus_ga_timely');
    expect(CITIES.columbus_ga.city).toBe('Columbus');
    expect(CITIES.columbus_ga.state).toBe('GA');
  });

  it('permit cities read only public approved events from ArcGIS', async () => {
    const { CITIES } = await import('@/lib/events/cities');

    for (const key of ['durham_permits', 'raleigh_permits']) {
      const config = CITIES[key];
      expect(config.sourceType).toBe('arcgis_permits');
      expect(config.source).toBe(key);
      expect(config.state).toBe('NC');
      expect(config.arcgisConfig?.layerUrl).toMatch(
        /^https:\/\/services\d?\.arcgis\.com\/.+\/FeatureServer\/0$/,
      );
      expect(config.arcgisConfig?.where).toContain("'Approved'");
    }
    expect(CITIES.durham_permits.arcgisConfig?.where).toContain("opentopublic = 'Yes'");
    expect(CITIES.raleigh_permits.arcgisConfig?.where).toContain('Neighborhood Block Party');
  });
});
