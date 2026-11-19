import { describe, expect, it } from '@jest/globals';
import {
  listContactInfo,
  redactDirectContact,
  toPublicTruckList,
} from '@/lib/mappers/publicListView';

const truck = {
  id: 't1',
  name: 'Taco Spot',
  description: 'Best tacos in town. Call (803) 555-1212 or email owner@taco.example!',
  phone_number: '803-555-1212',
  email: 'owner@taco.example',
  contact_info: {
    phone: '803-555-1212',
    phone2: '803-555-3434',
    email: 'owner@taco.example',
    secondary_email: 'other@taco.example',
    website: 'https://taco.example',
    instagram: 'tacospot',
    messenger: 'm.me/tacospot',
  },
  current_location: { lat: 34, lng: -81, address: '1 Main St', contact_phone: '8035551212' },
  menu: [{ name: 'Tacos', items: [{ name: 'Al pastor' }] }],
  cuisine_type: ['Mexican'],
};

describe('redactDirectContact', () => {
  it('drops sentences that contain a phone or an email', () => {
    expect(redactDirectContact('Great food. phone 803-555-0101. Open daily!')).toBe(
      'Great food. Open daily!',
    );
    expect(redactDirectContact('Text 803.555.1212 today')).toBe('');
  });

  it('keeps text without direct contact unchanged', () => {
    const text = 'Open 11-2, since 2024. Lunch $10.';
    expect(redactDirectContact(text)).toBe(text);
  });
});

describe('listContactInfo', () => {
  it('keeps only website and social handles', () => {
    expect(listContactInfo(truck.contact_info)).toEqual({
      website: 'https://taco.example',
      instagram: 'tacospot',
    });
  });

  it('returns an empty object for missing contact info', () => {
    expect(listContactInfo(null)).toEqual({});
  });
});

describe('toPublicTruckList', () => {
  const [item] = toPublicTruckList([truck]);
  const serialized = JSON.stringify(item);

  it('removes every phone and email key and value at any depth', () => {
    expect(serialized).not.toMatch(/phone|e_?mail/i);
    expect(serialized).not.toMatch(/555-?1212|@taco\.example/);
  });

  it('keeps list fields and marks the menu for lazy loading', () => {
    expect(item).toMatchObject({
      id: 't1',
      name: 'Taco Spot',
      description: 'Best tacos in town.',
      cuisine_type: ['Mexican'],
      current_location: { lat: 34, lng: -81, address: '1 Main St' },
      contact_info: { website: 'https://taco.example', instagram: 'tacospot' },
      has_menu: true,
    });
  });

  it('does not change the input trucks', () => {
    expect(truck.contact_info.phone).toBe('803-555-1212');
    expect(truck.phone_number).toBe('803-555-1212');
  });
});
