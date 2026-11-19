import { logError, logMessage } from '@/lib/logging';
import { callLLM } from '@/lib/utils/callLLM';
import { extractJsonSafely } from '@/lib/utils/jsonExtractor';

const MAX_ADDRESS_LENGTH = 1000;

const SYSTEM_PROMPT = `You are an address parser for Savannah, Georgia event permits.
Given messy, incomplete, or ambiguous location text from city permit applications,
extract the most geocodable address possible.

Rules:
1. Return a clean, geocodable address string suitable for a geocoding API (Nominatim/Photon)
2. Always include "Savannah, GA" in the cleaned address
3. If the text describes an intersection, format as "Street1 & Street2, Savannah, GA"
4. If the text names a known venue/landmark, return "Venue Name, Savannah, GA"
5. If the text is truly unresolvable (e.g. "undisclosed", "various locations", no real address), return null
6. Never fabricate an address you cannot reasonably extract from the input
7. Confidence: 0.0-1.0 scale. Below 0.5 means uncertain, above 0.8 means confident.

Examples:
- "The city Hall landing, boat dock at 6 east Bay street savannah ga" → cleaned_address: "6 E Bay St, Savannah, GA", address_type: "street_address", confidence: 0.8
- "Telfair Square 121 Barnard Street, Savannah, GA 31401" → cleaned_address: "Telfair Square, 121 Barnard St, Savannah, GA", address_type: "venue_name", confidence: 0.9
- "undisclosed" → cleaned_address: null, address_type: "unresolvable", confidence: 0.1
- "Public Park" → cleaned_address: null, address_type: "vague", confidence: 0.2
- "2 W Gaston St to 2 E. Bay Street" → cleaned_address: "2 W Gaston St, Savannah, GA", address_type: "street_address", confidence: 0.7
- "Grayson Stadium parking lot near the main entrance" → cleaned_address: "Grayson Stadium, Savannah, GA", address_type: "venue_name", confidence: 0.9
- "corner of Abercorn and Broughton near the downtown area" → cleaned_address: "Abercorn St & Broughton St, Savannah, GA", address_type: "intersection", confidence: 0.85`;

export interface AiAddressResult {
  cleaned_address: string | null;
  address_type: 'street_address' | 'intersection' | 'venue_name' | 'vague' | 'unresolvable';
  confidence: number;
}

const UNRESOLVABLE: AiAddressResult = {
  cleaned_address: null,
  address_type: 'unresolvable',
  confidence: 0,
};

export function isAiExtractorAvailable(): boolean {
  return Boolean(process.env.OLLAMA_CLOUD_API_KEY || process.env.OPENROUTER_API_KEY);
}

export async function extractAddressWithAI(rawAddress: string): Promise<AiAddressResult> {
  if (!rawAddress?.trim()) return UNRESOLVABLE;

  const trimmed = rawAddress.trim();
  if (trimmed.length > MAX_ADDRESS_LENGTH) {
    logMessage('Address too long for AI extraction', { length: trimmed.length });
    return UNRESOLVABLE;
  }

  if (!isAiExtractorAvailable()) {
    logMessage('No LLM provider configured for AI extraction');
    return UNRESOLVABLE;
  }

  try {
    const result = await callLLM(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract a clean, geocodable address from this Savannah, GA permit location text:\n\n"${trimmed}"\n\nReturn ONLY a JSON object with: cleaned_address (string|null), address_type (street_address|intersection|venue_name|vague|unresolvable), confidence (0.0-1.0).`,
        },
      ],
      { temperature: 0 },
    );

    if (!result.success || !result.data) {
      logMessage('AI address extraction failed', {
        error: result.error,
        address: trimmed.slice(0, 80),
      });
      return UNRESOLVABLE;
    }

    const jsonStr = extractJsonSafely(result.data);
    if (!jsonStr) {
      logMessage('AI returned no parseable JSON', {
        address: trimmed.slice(0, 80),
        rawResponse: result.data.slice(0, 300),
      });
      return UNRESOLVABLE;
    }

    const parsed = JSON.parse(jsonStr) as AiAddressResult;

    if (
      parsed.address_type === 'unresolvable' ||
      !parsed.cleaned_address ||
      (parsed.confidence ?? 0) < 0.3
    ) {
      return {
        cleaned_address: null,
        address_type: parsed.address_type ?? 'unresolvable',
        confidence: parsed.confidence ?? 0,
      };
    }

    logMessage('AI address extraction succeeded', {
      original: trimmed.slice(0, 80),
      cleaned: parsed.cleaned_address.trim().slice(0, 80),
      type: parsed.address_type,
      confidence: parsed.confidence,
    });

    return {
      cleaned_address: parsed.cleaned_address.trim(),
      address_type: parsed.address_type,
      confidence: parsed.confidence,
    };
  } catch (error) {
    logError('AI address extraction failed', { error, address: trimmed.slice(0, 80) });
    return UNRESOLVABLE;
  }
}
