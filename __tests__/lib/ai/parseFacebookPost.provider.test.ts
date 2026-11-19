import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('@/lib/utils/callLLM', () => ({
  callLLM: jest.fn(),
}));

type CallLLM = typeof import('@/lib/utils/callLLM').callLLM;
type ParsedPost = import('@/lib/ai/parseFacebookPost').ParsedPost;

const mockCallLLM = (await import('@/lib/utils/callLLM')).callLLM as jest.MockedFunction<CallLLM>;
const { parseFacebookPost } = await import('@/lib/ai/parseFacebookPost');

describe('parseFacebookPost - provider routing', () => {
  beforeEach(() => {
    mockCallLLM.mockReset();
  });

  it('returns default result for empty text', async () => {
    const result = await parseFacebookPost('');
    expect(result).toEqual({
      food_items: [],
      location: undefined,
      times: undefined,
      prices: undefined,
      hashtags: undefined,
      confidence: 0,
    });
    expect(mockCallLLM).not.toHaveBeenCalled();
  });

  it('calls callLLM with the post text and returns parsed result', async () => {
    mockCallLLM.mockResolvedValue({
      success: true,
      data: JSON.stringify({
        food_items: ['tacos', 'burgers'],
        location: { address: '123 Main St', city: 'Augusta', state: 'GA', fuzzy: false },
        times: { start: '11am', end: '3pm' },
        prices: [{ item: 'taco', price: 5 }],
        hashtags: ['#foodtruck'],
        confidence: 0.85,
      }),
    });

    const result = await parseFacebookPost('We have tacos and burgers today');

    expect(mockCallLLM).toHaveBeenCalledTimes(1);
    expect(mockCallLLM).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('We have tacos and burgers today'),
        }),
      ]),
      expect.objectContaining({ temperature: 0 }),
    );
    expect(result.food_items).toEqual(['tacos', 'burgers']);
    expect(result.location?.address).toBe('123 Main St');
    expect(result.times?.start).toBe('11am');
    expect(result.confidence).toBe(0.85);
  });

  it('returns default result when callLLM fails', async () => {
    mockCallLLM.mockResolvedValue({
      success: false,
      error: 'All LLM providers failed',
    });

    const result = await parseFacebookPost('Some post text');

    expect(result).toEqual({
      food_items: [],
      location: undefined,
      times: undefined,
      prices: undefined,
      hashtags: undefined,
      confidence: 0,
    });
  });

  it('returns default result when callLLM returns no data', async () => {
    mockCallLLM.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const result = await parseFacebookPost('Some post text');

    expect(result).toEqual({
      food_items: [],
      location: undefined,
      times: undefined,
      prices: undefined,
      hashtags: undefined,
      confidence: 0,
    });
  });

  it('returns default result when response is not valid JSON', async () => {
    mockCallLLM.mockResolvedValue({
      success: true,
      data: 'not valid json at all',
    });

    const result = await parseFacebookPost('Some post text');

    expect(result).toEqual({
      food_items: [],
      location: undefined,
      times: undefined,
      prices: undefined,
      hashtags: undefined,
      confidence: 0,
    });
  });
});
