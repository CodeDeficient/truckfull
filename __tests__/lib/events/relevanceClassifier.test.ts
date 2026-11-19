import { describe, it, expect } from '@jest/globals';
import {
  classifyRelevance,
  classifyRelevanceDetailed,
  FOOD_TRUCK_RELEVANCE_THRESHOLD,
} from '@/lib/events/relevanceClassifier';

describe('classifyRelevance', () => {
  it('scores FOODEESFEST Augusta with 40+ food trucks highly', () => {
    const score = classifyRelevance('FOODEESFEST Augusta', '40+ food trucks and craft vendors!');
    expect(score).toBeGreaterThanOrEqual(8);
  });

  it('scores Food Truck Downtown Event highly', () => {
    const score = classifyRelevance('Food Truck Downtown Event', '');
    expect(score).toBeGreaterThanOrEqual(7);
  });

  it('scores Boss Hog Cook-Off highly', () => {
    const score = classifyRelevance('Boss Hog Cook-Off', '');
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('scores American Hero Pro Rodeo highly', () => {
    const score = classifyRelevance('American Hero Pro Rodeo', '');
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('scores Augusta Oktoberfest 2026 highly', () => {
    const score = classifyRelevance('Augusta Oktoberfest 2026', '');
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('scores Southeast Crab Feast highly', () => {
    const score = classifyRelevance('Southeast Crab Feast', '');
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('scores PMP Certification Training as zero', () => {
    const score = classifyRelevance('PMP Certification 4 Days Classroom Training', '');
    expect(score).toBe(0);
  });

  it('scores Homeschool Nature Walk as zero', () => {
    const score = classifyRelevance('Homeschool Nature Walk', '');
    expect(score).toBe(0);
  });

  it('scores Tech Talk Augusta Meetup as zero', () => {
    const score = classifyRelevance('Tech Talk Augusta Meetup', '');
    expect(score).toBe(0);
  });

  it('scores Nursing Information Session as zero', () => {
    const score = classifyRelevance('Nursing Information Session', '');
    expect(score).toBe(0);
  });

  it('scores Sewing for Adult Beginners as zero to one', () => {
    const score = classifyRelevance('Sewing for Adult Beginners', '');
    expect(score).toBeLessThanOrEqual(1);
  });

  it('scores Music Bingo at Top Dawg Tavern moderately', () => {
    const score = classifyRelevance(
      'Music Bingo at Top Dawg Tavern',
      'Join us for music and bingo',
    );
    expect(score).toBeGreaterThanOrEqual(2);
    expect(score).toBeLessThanOrEqual(5);
  });

  it('scores CSRA Community Hope & Wellness Fair moderately', () => {
    const score = classifyRelevance(
      'CSRA Community Hope & Wellness Fair',
      'Join us for a community fair',
    );
    expect(score).toBeGreaterThanOrEqual(3);
  });

  it('scores Tequila and Tacos Fest highly', () => {
    const score = classifyRelevance('Tequila and Tacos Fest', '');
    expect(score).toBeGreaterThanOrEqual(8);
  });

  it('scores American Girl Club as zero', () => {
    const score = classifyRelevance('American Girl Club', '');
    expect(score).toBe(0);
  });

  it('scores Trivia Night as zero to one', () => {
    const score = classifyRelevance('Trivia Night', '');
    expect(score).toBeLessThanOrEqual(1);
  });

  it('scores Pot-a-Plant as zero', () => {
    const score = classifyRelevance('Pot-a-Plant', '');
    expect(score).toBe(0);
  });

  it('scores Paint Nite as zero to one', () => {
    const score = classifyRelevance('Paint Nite', '');
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns zero for event with no text', () => {
    const score = classifyRelevance('', '');
    expect(score).toBe(0);
  });

  it('scores Walk a Mile in Their Shoes as zero to two', () => {
    const score = classifyRelevance('Walk a Mile in Their Shoes', 'Charity walk event');
    expect(score).toBeLessThanOrEqual(2);
  });

  it('does not boost ribbon cutting on its own', () => {
    const score = classifyRelevance('Daughters of Both Suns Ribbon Cutting Celebration', '');
    expect(score).toBeLessThan(5);
  });

  it('scores Mindful Steps Awareness Walk as below threshold', () => {
    const score = classifyRelevance(
      'Mindful Steps 2026: 5th Annual Mental Health Awareness Walk & Community Day',
      'Join us for a community walk and celebration',
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Sickle Cell Awareness Walk as below threshold', () => {
    const score = classifyRelevance(
      'GALS SUPPORT SICKLE CELL AWARENESS 365 DAYS',
      'Join GALS for the Sickle Cell Awareness Walk & Community Celebration',
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Buddy Walk 2026 as below threshold', () => {
    const score = classifyRelevance(
      'Forsyth Park - Lowcountry Down Syndrome Society BUDDY WALK 2026',
      'Walk for a cause',
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Miles for Margaritas 5k/10k as below threshold', () => {
    const score = classifyRelevance('Daffin Park-Miles for Margaritas 5k/10k', 'Run for margaritas');
    expect(score).toBeLessThan(5);
  });

  it('scores Run for Wounded Veterans as below threshold', () => {
    const score = classifyRelevance(
      'Daffin Park- Nine Line Foundation Run for Wounded Veterans',
      'Annual run',
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Local Girls Film Premiere as below threshold', () => {
    const score = classifyRelevance(
      "Local Girls Premiere Original Film at Columbia's Nickelodeon Theatre",
      'Film premiere',
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Carmen opera as below threshold', () => {
    const score = classifyRelevance(
      "Muzika! Festival presents Carmen",
      "Bizet's fiery masterpiece comes to life with unforgettable melodies",
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Charleston Bachelorette Party Bach Bar Crawl as below threshold', () => {
    const score = classifyRelevance(
      'Charleston Bachelorette Party & Bachelor Party-Bach Bar Crawl in Charleston',
      'Bach bar crawl',
    );
    expect(score).toBeLessThan(5);
  });

  it('scores Hollywood-Rose Hill Walking Tour as below threshold', () => {
    const score = classifyRelevance('Hollywood-Rose Hill Walking Tour', 'Historic walking tour');
    expect(score).toBeLessThan(5);
  });

  it('scores Wild Adventures Concert as below threshold', () => {
    const score = classifyRelevance(
      'Wild Adventures Concert: Travis Tritt',
      'Theme park concert series in Valdosta',
    );
    expect(score).toBeLessThan(5);
  });

  describe('FOOD_TRUCK_RELEVANCE_THRESHOLD', () => {
    it('equals 5', () => {
      expect(FOOD_TRUCK_RELEVANCE_THRESHOLD).toBe(5);
    });
  });
});

describe('classifyRelevanceDetailed', () => {
  it('returns RelevanceResult with all fields', () => {
    const result = classifyRelevanceDetailed('Food Truck Fest', '');
    expect(result).toHaveProperty('decision');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('matchedSignals');
    expect(result).toHaveProperty('fuzzyMatches');
    expect(result).toHaveProperty('hardExclusionMatched');
  });

  it('returns relevant for food truck event', () => {
    const result = classifyRelevanceDetailed('Food Truck Festival', '');
    expect(result.decision).toBe('relevant');
    expect(result.score).toBeGreaterThanOrEqual(FOOD_TRUCK_RELEVANCE_THRESHOLD);
    expect(result.hardExclusionMatched).toBeNull();
  });

  it('includes fuzzy matches in result', () => {
    const result = classifyRelevanceDetailed('Foodie Fest', '');
    if (result.fuzzyMatches.length > 0) {
      const match = result.fuzzyMatches[0];
      expect(typeof match).toBe('string');
      expect(match).toMatch(/→/);
    }
  });

  it('returns irrelevant with hardExclusionMatched for PMP event', () => {
    const result = classifyRelevanceDetailed('PMP Certification 4 Days Classroom Training', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(1);
    expect(result.hardExclusionMatched).toBe('certification_exam');
  });

  it('returns irrelevant with hardExclusionMatched for homeschool event', () => {
    const result = classifyRelevanceDetailed('Homeschool Nature Walk', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('homeschool');
  });

  it('returns irrelevant with hardExclusionMatched for 5k run', () => {
    const result = classifyRelevanceDetailed('Annual 5k Run for Charity', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('foot_race');
  });

  it('returns irrelevant with hardExclusionMatched for blood drive', () => {
    const result = classifyRelevanceDetailed('Red Cross Blood Drive', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('blood_drive');
  });

  it('returns irrelevant with hardExclusionMatched for support group', () => {
    const result = classifyRelevanceDetailed('Breast Cancer Support Group', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('support_group');
  });

  it('returns irrelevant with hardExclusionMatched for craft class', () => {
    const result = classifyRelevanceDetailed('Pottery Class for Beginners', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('craft_class');
  });

  it('returns irrelevant with hardExclusionMatched for golf classic', () => {
    const result = classifyRelevanceDetailed('Charity Golf Classic', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('golf_event');
  });

  it('returns irrelevant with hardExclusionMatched for walkathon', () => {
    const result = classifyRelevanceDetailed('Annual Walkathon', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('charity_walk_run');
  });

  it('returns irrelevant with hardExclusionMatched for hospital tour', () => {
    const result = classifyRelevanceDetailed('Maternity OB Tour', 'Sign up for our OB tour');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('hospital_tour');
  });

  it('returns irrelevant with hardExclusionMatched for exam prep', () => {
    const result = classifyRelevanceDetailed('GMAT Test Prep Course', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.hardExclusionMatched).toBe('test_prep');
  });

  it('returns ambiguous for borderline music bingo event', () => {
    const result = classifyRelevanceDetailed(
      'Music Bingo at Top Dawg Tavern',
      'Join us for music and bingo',
    );
    expect(result.decision).toBe('ambiguous');
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(FOOD_TRUCK_RELEVANCE_THRESHOLD);
  });

  it('returns ambiguous for ribbon cutting', () => {
    const result = classifyRelevanceDetailed(
      'Daughters of Both Suns Ribbon Cutting Celebration',
      '',
    );
    expect(result.decision).toBe('ambiguous');
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(FOOD_TRUCK_RELEVANCE_THRESHOLD);
  });

  it('returns irrelevant with negative signals for awareness walk', () => {
    const result = classifyRelevanceDetailed(
      'Mindful Steps 2026: 5th Annual Mental Health Awareness Walk & Community Day',
      'Join us for a community walk and celebration',
    );
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('returns relevant with high confidence for tacos fest', () => {
    const result = classifyRelevanceDetailed('Tequila and Tacos Fest', '');
    expect(result.decision).toBe('relevant');
    expect(result.score).toBeGreaterThanOrEqual(FOOD_TRUCK_RELEVANCE_THRESHOLD);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns relevant for food truck event with no negatives', () => {
    const result = classifyRelevanceDetailed('Food Truck Festival Downtown', '');
    expect(result.decision).toBe('relevant');
    expect(result.confidence).toBe(1);
  });

  it('returns ambiguous for car show with no food signals', () => {
    const result = classifyRelevanceDetailed('Annual Car Show', 'Classic cars on display');
    expect(result.decision).toBe('ambiguous');
    expect(result.score).toBe(3);
    expect(result.score).toBeLessThan(FOOD_TRUCK_RELEVANCE_THRESHOLD);
  });

  it('handles empty title and description', () => {
    const result = classifyRelevanceDetailed('', '');
    expect(result.decision).toBe('irrelevant');
    expect(result.score).toBe(0);
    expect(result.matchedSignals).toHaveLength(0);
  });

  it('reuses classifyRelevance for backward compatibility', () => {
    const score1 = classifyRelevance('Food Truck Festival', '');
    const score2 = classifyRelevanceDetailed('Food Truck Festival', '').score;
    expect(score1).toBe(score2);
  });

  it('handles very long text without crashing', () => {
    const longTitle = 'A'.repeat(10000);
    const result = classifyRelevanceDetailed(longTitle, longTitle);
    expect(result.score).toBe(0);
    expect(result.decision).toBe('irrelevant');
  });
});
