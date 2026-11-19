import { describe, it, expect } from '@jest/globals';
import {
  classifyDomainAuthority,
  getDomainTrustBonus,
  isObituaryOrMemorial,
  isGeographicallyRelevant,
  isUkDomain,
  isSourceRelevant,
} from '@/lib/research/sourceAuthority';

describe('classifyDomainAuthority', () => {
  it('classifies .gov domains as high', () => {
    expect(classifyDomainAuthority('https://www.ninetyisixsc.gov/events')).toBe('high');
    expect(classifyDomainAuthority('https://cityofaugusta.gov/parks')).toBe('high');
    expect(classifyDomainAuthority('https://sc.gov')).toBe('high');
  });

  it('classifies .mil domains as high', () => {
    expect(classifyDomainAuthority('https://www.army.mil/events')).toBe('high');
    expect(classifyDomainAuthority('https://navy.mil')).toBe('high');
  });

  it('classifies .edu domains as high', () => {
    expect(classifyDomainAuthority('https://www.sc.edu/calendar')).toBe('high');
    expect(classifyDomainAuthority('https://clemson.edu/events')).toBe('high');
  });

  it('classifies event platforms as medium', () => {
    expect(classifyDomainAuthority('https://www.eventbrite.com/e/some-event')).toBe('medium');
    expect(classifyDomainAuthority('https://www.ticketmaster.com/event/123')).toBe('medium');
    expect(classifyDomainAuthority('https://www.meetup.com/group/events')).toBe('medium');
  });

  it('classifies Facebook events as medium', () => {
    expect(classifyDomainAuthority('https://www.facebook.com/events/12345')).toBe('medium');
    expect(classifyDomainAuthority('https://facebook.com/events/67890')).toBe('medium');
  });

  it('rejects Facebook subdomain spoofing as low', () => {
    expect(classifyDomainAuthority('https://facebook.com.evil.com/events')).toBe('low');
  });

  it('classifies city/county sites as medium', () => {
    expect(classifyDomainAuthority('https://www.orangeburgcounty.org')).toBe('medium');
    expect(classifyDomainAuthority('https://cityofandersonsc.com')).toBe('medium');
    expect(classifyDomainAuthority('https://townofsummerville.com')).toBe('medium');
  });

  it('classifies chamber of commerce as medium', () => {
    expect(classifyDomainAuthority('https://www.augustachamber.org')).toBe('medium');
    expect(classifyDomainAuthority('https://charlestonchamber.org/events')).toBe('medium');
  });

  it('classifies .org events domains as medium', () => {
    expect(classifyDomainAuthority('https://juneteenthaugusta.org')).toBe('medium');
    expect(classifyDomainAuthority('https://columbiasgreekfestival.com')).toBe('medium');
  });

  it('classifies random domains as low', () => {
    expect(classifyDomainAuthority('https://www.csrakids.com')).toBe('low');
    expect(classifyDomainAuthority('https://someblog.wordpress.com')).toBe('low');
    expect(classifyDomainAuthority('https://www.tripadvisor.com')).toBe('low');
  });

  it('classifies social media domains as low', () => {
    expect(classifyDomainAuthority('https://www.instagram.com/p/abc')).toBe('low');
    expect(classifyDomainAuthority('https://tiktok.com/@user')).toBe('low');
    expect(classifyDomainAuthority('https://reddit.com/r/events')).toBe('low');
  });

  it('returns low for invalid URLs', () => {
    expect(classifyDomainAuthority('not-a-url')).toBe('low');
    expect(classifyDomainAuthority('')).toBe('low');
  });
});

describe('getDomainTrustBonus', () => {
  it('returns 1.0 for .gov domains', () => {
    expect(getDomainTrustBonus('https://www.sc.gov')).toBe(1);
  });

  it('returns 1.0 for .mil domains', () => {
    expect(getDomainTrustBonus('https://army.mil')).toBe(1);
  });

  it('returns 0.8 for .edu domains', () => {
    expect(getDomainTrustBonus('https://sc.edu')).toBe(0.8);
  });

  it('returns 0.6 for city/county sites', () => {
    expect(getDomainTrustBonus('https://orangeburgcounty.org')).toBe(0.6);
    expect(getDomainTrustBonus('https://cityofandersonsc.com')).toBe(0.6);
  });

  it('returns 0.4 for event platforms', () => {
    expect(getDomainTrustBonus('https://eventbrite.com/e/event')).toBe(0.4);
  });

  it('returns 0.3 for event-specific domains', () => {
    expect(getDomainTrustBonus('https://juneteenthaugusta.org')).toBe(0.3);
    expect(getDomainTrustBonus('https://columbiasgreekfestival.com')).toBe(0.3);
  });

  it('returns 0 for low-authority domains', () => {
    expect(getDomainTrustBonus('https://www.csrakids.com')).toBe(0);
    expect(getDomainTrustBonus('https://instagram.com')).toBe(0);
  });

  it('returns 0 for invalid URLs', () => {
    expect(getDomainTrustBonus('not-a-url')).toBe(0);
  });
});

describe('isObituaryOrMemorial', () => {
  it('detects "obituary" in text', () => {
    expect(isObituaryOrMemorial('John Smith obituary and funeral arrangements')).toBe(true);
  });

  it('detects "funeral home" patterns', () => {
    expect(isObituaryOrMemorial('Services held at Smith Funeral Home on Saturday')).toBe(true);
  });

  it('detects "funeral service" patterns', () => {
    expect(isObituaryOrMemorial('The funeral service will be held at noon')).toBe(true);
  });

  it('detects "survived by" patterns', () => {
    expect(isObituaryOrMemorial('Survived by his wife Sarah and three children')).toBe(true);
  });

  it('detects "passed away" patterns', () => {
    expect(isObituaryOrMemorial('Remembering those who passed away this year')).toBe(true);
  });

  it('detects "celebration of life" patterns', () => {
    expect(isObituaryOrMemorial('Join us to celebrate the life of Mary Jones')).toBe(true);
  });

  it('detects "in memoriam" patterns', () => {
    expect(isObituaryOrMemorial('In Memoriam - John Smith obituary')).toBe(true);
  });

  it('detects death date patterns', () => {
    expect(isObituaryOrMemorial('Born March 15, 1945, died peacefully on April 1, 2026')).toBe(true);
  });

  it('detects "condolences" patterns', () => {
    expect(isObituaryOrMemorial('Condolences to the family')).toBe(true);
  });

  it('does not flag regular events', () => {
    expect(isObituaryOrMemorial('Join us for the 4th of July celebration at the park')).toBe(false);
    expect(isObituaryOrMemorial('Vendors wanted for craft fair this weekend')).toBe(false);
    expect(isObituaryOrMemorial('Food trucks needed for summer festival')).toBe(false);
  });

  it('handles empty text', () => {
    expect(isObituaryOrMemorial('')).toBe(false);
  });

  it('case insensitive matching', () => {
    expect(isObituaryOrMemorial('OBITUARY: John Doe')).toBe(true);
  });
});

describe('isGeographicallyRelevant', () => {
  it('returns true when city mentioned', () => {
    expect(isGeographicallyRelevant('Event in Augusta, GA this weekend', 'augusta', 'GA')).toBe(true);
  });

  it('returns true when state mentioned', () => {
    expect(isGeographicallyRelevant('South Carolina festival draws crowds', 'augusta', 'SC')).toBe(true);
  });

  it('returns true when full state name mentioned', () => {
    expect(isGeographicallyRelevant('Georgia peach festival next month', 'augusta', 'GA')).toBe(true);
  });

  it('returns true for UK-named US city with state signal', () => {
    expect(isGeographicallyRelevant('Birmingham, Alabama food truck festival', 'birmingham', 'AL')).toBe(true);
  });

  it('returns false when wrong country detected and no US signal', () => {
    expect(isGeographicallyRelevant('UK festival in London draws crowds', 'seneca', 'SC')).toBe(false);
    expect(isGeographicallyRelevant('Event in Canada next month', 'seneca', 'SC')).toBe(false);
  });

  it('returns false when text has no geographic signals', () => {
    expect(isGeographicallyRelevant('A wonderful event for the whole family', 'augusta', 'GA')).toBe(false);
  });

  it('handles empty text', () => {
    expect(isGeographicallyRelevant('', 'augusta', 'GA')).toBe(false);
  });

  it('handles empty city/state', () => {
    expect(isGeographicallyRelevant('event in Augusta', '', '')).toBe(false);
  });

  it('does not match state abbreviations in unrelated words', () => {
    expect(isGeographicallyRelevant('science fair', 'augusta', 'SC')).toBe(false);
    expect(isGeographicallyRelevant('textbook', 'augusta', 'TX')).toBe(false);
    expect(isGeographicallyRelevant('alphabet', 'augusta', 'AL')).toBe(false);
  });

  it('matches state abbreviation at word boundaries', () => {
    expect(isGeographicallyRelevant('Event in SC this weekend', 'augusta', 'SC')).toBe(true);
    expect(isGeographicallyRelevant('Augusta, GA food festival', 'augusta', 'GA')).toBe(true);
  });
});

describe('isUkDomain', () => {
  it('detects .uk domains', () => {
    expect(isUkDomain('https://www.bbc.co.uk/news')).toBe(true);
    expect(isUkDomain('https://example.uk')).toBe(true);
  });

  it('returns false for non-UK domains', () => {
    expect(isUkDomain('https://www.example.com')).toBe(false);
    expect(isUkDomain('https://www.sc.gov')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isUkDomain('not-a-url')).toBe(false);
  });
});

describe('isSourceRelevant', () => {
  const baseSource = {
    url: 'https://example.com/event',
    title: 'Summer Food Festival',
    snippet: 'Join us in Augusta, GA for the best food trucks',
  };

  it('returns true for relevant source', () => {
    expect(isSourceRelevant(baseSource, 'augusta', 'GA')).toBe(true);
  });

  it('returns false for obituary source', () => {
    expect(isSourceRelevant(
      { ...baseSource, title: 'John Smith Obituary' },
      'augusta', 'GA',
    )).toBe(false);
  });

  it('returns false for UK domain', () => {
    expect(isSourceRelevant(
      { ...baseSource, url: 'https://www.bbc.co.uk/news' },
      'augusta', 'GA',
    )).toBe(false);
  });

  it('returns false when not geographically relevant', () => {
    expect(isSourceRelevant(
      { ...baseSource, snippet: 'Event happening in London, UK' },
      'augusta', 'GA',
    )).toBe(false);
  });

  it('returns false for funeral home in snippet', () => {
    expect(isSourceRelevant(
      { ...baseSource, snippet: 'Funeral home services this weekend' },
      'augusta', 'GA',
    )).toBe(false);
  });
});
