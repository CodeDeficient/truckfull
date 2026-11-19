import { z } from 'zod';
import { callLLM, type LLMMessage } from '@/lib/utils/callLLM';
import { logError, logMessage } from '@/lib/logging';
import { fetchPageContent } from '@/lib/research/fetchPageContent';

const LEADING_JSON_FENCE = /^```(?:json)?\n?/gi;
const TRAILING_CODE_FENCE = /```$/g;

export const PRIMARY_MODEL = 'gemma4:31b';
export const CONSENSUS_MODEL = 'deepseek-v4-flash';
export const BORDERLINE_THRESHOLD_LOW = 0.5;
export const BORDERLINE_THRESHOLD_HIGH = 0.7;

export const RelevanceClassificationSchema = z.object({
  is_food_truck_relevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  signals: z.array(z.string()).optional(),
});

export type RelevanceClassification = z.infer<typeof RelevanceClassificationSchema>;

export interface SingleClassificationResult {
  eventId: string;
  title: string;
  classification: RelevanceClassification;
  model: string;
  success: true;
}

export interface ClassificationError {
  eventId: string;
  title: string;
  success: false;
  error: string;
}

export type ClassificationResult = SingleClassificationResult | ClassificationError;

export interface BatchEventInput {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
}

function buildPrompt(title: string, description: string): LLMMessage[] {
  return [
    {
      role: 'system',
      content: `You are a food truck event relevance classifier for TruckFull.
Determine if this event is likely to have food trucks present.

Events likely to have food trucks (relevant = true):
- Food festivals, street fairs, block parties, carnivals
- Community celebrations, concerts, live music events
- Farmers markets, craft fairs, flea markets
- Car shows, rodeos, county/state fairs
- Tailgate parties, parades, fireworks shows
- Holiday celebrations (4th of July, Oktoberfest, Christmas)
- Large public gatherings in parks or public spaces
- BBQ cook-offs, seafood festivals, wine/beer festivals
- Grand openings, spring flings, summer bashes

Events unlikely to have food trucks (relevant = false):
- Corporate training, certification exams, workshops
- Support groups, blood drives, hospital tours
- Homeschool events, library programs
- Opera, symphony, theater performances, museum exhibits
- Golf tournaments, 5k runs/walks for charity
- Film screenings, book festivals
- Private parties at venues with their own food service
- Events at convention centers or performing arts centers

Respond in JSON format:
{
  "is_food_truck_relevant": boolean,
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation focusing on food-related signals found or lack thereof",
  "signals": ["specific words or phrases that indicate food truck potential"]
}`,
    },
    {
      role: 'user',
      content: `Classify this event for food truck relevance:

Title: ${title}
Description: ${description || '(no description available)'}`,
    },
  ];
}

async function classifySingle(
  eventId: string,
  title: string,
  description: string,
  model: string,
): Promise<ClassificationResult> {
  const messages = buildPrompt(title, description);
  const result = await callLLM(messages, { model, temperature: 0, jsonMode: true });

  if (!result.success || !result.data) {
    return { eventId, title, success: false, error: result.error ?? 'LLM returned no data' };
  }

  try {
    const cleaned = result.data
      .trim()
      .replaceAll(LEADING_JSON_FENCE, '')
      .replaceAll(TRAILING_CODE_FENCE, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    const validated = RelevanceClassificationSchema.parse(parsed);
    return {
      eventId,
      title,
      classification: validated,
      model,
      success: true,
    };
  } catch (parseError) {
    return {
      eventId,
      title,
      success: false,
      error: `Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    };
  }
}

export async function classifyRelevanceLlm(
  eventId: string,
  title: string,
  description: string,
): Promise<ClassificationResult> {
  const primaryResult = await classifySingle(eventId, title, description, PRIMARY_MODEL);

  if (!primaryResult.success) {
    logMessage(`Primary model failed for "${title}", trying consensus model as fallback`);
    const fallbackResult = await classifySingle(eventId, title, description, CONSENSUS_MODEL);
    if (fallbackResult.success) {
      return fallbackResult;
    }
    return primaryResult;
  }

  const { confidence } = primaryResult.classification;

  if (confidence >= BORDERLINE_THRESHOLD_LOW && confidence <= BORDERLINE_THRESHOLD_HIGH) {
    logMessage(`Borderline confidence ${confidence} for "${title}", running consensus model`);
    const consensusResult = await classifySingle(eventId, title, description, CONSENSUS_MODEL);

    if (consensusResult.success) {
      const primary = primaryResult.classification;
      const consensus = consensusResult.classification;

      if (primary.is_food_truck_relevant === consensus.is_food_truck_relevant) {
        const avgConfidence = (primary.confidence + consensus.confidence) / 2;
        return {
          eventId,
          title,
          classification: {
            is_food_truck_relevant: primary.is_food_truck_relevant,
            confidence: avgConfidence,
            reasoning: `Primary (${PRIMARY_MODEL}): ${primary.reasoning} | Consensus (${CONSENSUS_MODEL}): ${consensus.reasoning}`,
            signals: [
              ...(primary.signals ?? []),
              ...(consensus.signals ?? []),
            ],
          },
          model: `${PRIMARY_MODEL}+${CONSENSUS_MODEL}`,
          success: true,
        };
      }

      return {
        eventId,
        title,
        classification: {
          is_food_truck_relevant: primary.is_food_truck_relevant,
          confidence: (primary.confidence + consensus.confidence) / 2,
          reasoning: `DISAGREEMENT: Primary=${primary.is_food_truck_relevant}@${primary.confidence} (${primary.reasoning}) vs Consensus=${consensus.is_food_truck_relevant}@${consensus.confidence} (${consensus.reasoning})`,
          signals: [
            ...(primary.signals ?? []),
            ...(consensus.signals ?? []),
          ],
        },
        model: `${PRIMARY_MODEL}+${CONSENSUS_MODEL}`,
        success: true,
      };
    }
  }

  return primaryResult;
}

async function fetchDescription(event: BatchEventInput): Promise<string> {
  if (event.description) return event.description;
  if (!event.source_url) return '';
  try {
    const text = await fetchPageContent(event.source_url);
    return text ? text.slice(0, 3000) : '';
  } catch (error) {
    logError(`Tier 0 fetch failed for ${event.title}:`, error);
    return '';
  }
}

export async function classifyRelevanceLlmBatch(
  events: BatchEventInput[],
  concurrency = 3,
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];
  let index = 0;

  while (index < events.length) {
    const batch = events.slice(index, index + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (event) => {
        const description = await fetchDescription(event);
        return classifyRelevanceLlm(event.id, event.title, description);
      }),
    );

    for (const [i, r] of batchResults.entries()) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({
          eventId: batch[i]!.id,
          title: batch[i]!.title,
          success: false,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }

    index += concurrency;
  }

  return results;
}
