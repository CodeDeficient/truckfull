import { postToSlack, type SlackAttachment } from './slackClient';
export { resetAlertHistoryForTesting } from './slackClient';

export interface RelevancePipelineAlert {
  readonly batchSize: number;
  readonly tier1Classified: number;
  readonly tier2Classified: number;
  readonly errors: number;
  readonly reviewNeeded: number;
  readonly durationMs: number;
}

export async function sendRelevancePipelineAlert(
  stats: RelevancePipelineAlert,
): Promise<boolean> {
  const text =
    stats.errors > 0
      ? `🚨 Relevance pipeline completed with *${stats.errors}* errors`
      : `✅ Relevance pipeline completed successfully`;

  const fields: SlackAttachment['fields'] = [
    { title: 'Batch Size', value: String(stats.batchSize), short: true },
    { title: 'Tier 1 (Keyword)', value: String(stats.tier1Classified), short: true },
    { title: 'Tier 2 (LLM)', value: String(stats.tier2Classified), short: true },
    { title: 'Review Needed', value: String(stats.reviewNeeded), short: true },
    { title: 'Errors', value: String(stats.errors), short: true },
    { title: 'Duration', value: `${(stats.durationMs / 1000).toFixed(1)}s`, short: true },
  ];

  return postToSlack(
    {
      text,
      attachments: [
        {
          color: stats.errors > 0 ? 'danger' : 'good',
          title: 'Relevance Classification Pipeline',
          fields,
          footer: new Date().toISOString(),
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    },
    { priority: 'pipeline' },
  );
}

export interface ReviewAlertItem {
  readonly eventId: string;
  readonly title: string;
  readonly confidence: number;
  readonly reasoning: string;
  readonly model: string;
}

export async function sendRelevanceReviewAlert(
  items: readonly ReviewAlertItem[],
): Promise<boolean> {
  if (items.length === 0) return false;

  const MAX_ITEMS_IN_ATTACHMENT = 5;
  const displayItems = items.slice(0, MAX_ITEMS_IN_ATTACHMENT);

  const fields = displayItems.map((item) => ({
    title: item.title,
    value: `Confidence: ${item.confidence} | Model: ${item.model}\nReason: ${item.reasoning}\nEvent: \`${item.eventId}\``,
    short: false,
  }));

  if (items.length > MAX_ITEMS_IN_ATTACHMENT) {
    fields.push({
      title: 'And more...',
      value: `${items.length - MAX_ITEMS_IN_ATTACHMENT} additional event(s) need review`,
      short: false,
    });
  }

  return postToSlack({
    text: `⚠️ *${items.length} event(s) need human relevance review*`,
    attachments: [
      {
        color: 'warning',
        title: 'Relevance Review Required',
        fields,
        footer: new Date().toISOString(),
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}

export interface DailyDigestStats {
  readonly totalEvents: number;
  readonly relevant: number;
  readonly notRelevant: number;
  readonly tier2Used: number;
  readonly reviewNeeded: number;
  readonly errors: number;
  readonly avgConfidence: number;
  readonly pipelineRuns: number;
}

export async function sendRelevanceDailyDigest(stats: DailyDigestStats): Promise<boolean> {
  const relevancePercent =
    stats.totalEvents > 0 ? ((stats.relevant / stats.totalEvents) * 100).toFixed(1) : '0.0';
  const reviewPercent =
    stats.totalEvents > 0 ? ((stats.reviewNeeded / stats.totalEvents) * 100).toFixed(1) : '0.0';

  const text = [
    '📊 *Relevance Classification Daily Digest*',
    '',
    `• Events processed: *${stats.totalEvents}*`,
    `• Relevant: *${stats.relevant}* (${relevancePercent}%)`,
    `• Not relevant: *${stats.notRelevant}*`,
    `• LLM (Tier 2) used: *${stats.tier2Used}*`,
    `• Review needed: *${stats.reviewNeeded}* (${reviewPercent}%)`,
    `• Errors: *${stats.errors}*`,
    `• Avg confidence: *${stats.avgConfidence.toFixed(2)}*`,
    `• Pipeline runs: *${stats.pipelineRuns}*`,
  ].join('\n');

  return postToSlack({
    text,
    attachments: [
      {
        color: stats.errors > 0 ? 'warning' : 'good',
        title: '24h Summary',
        footer: new Date().toISOString(),
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}


