import { logMessage, logError } from '@/lib/logging';
import { postToSlack, type SlackAttachment } from './slackClient';

export interface PipelineFailureAlert {
  jobName: string;
  errorMessage: string;
  journalExcerpt?: string;
}

export async function sendPipelineFailureAlert(
  params: PipelineFailureAlert,
): Promise<boolean> {
  const { jobName, errorMessage, journalExcerpt } = params;

  const fields: SlackAttachment['fields'] = [
    { title: 'Unit', value: jobName, short: true },
    { title: 'Time', value: new Date().toISOString(), short: true },
  ];

  if (journalExcerpt) {
    fields.push({
      title: 'Journal (last 20 lines)',
      value: `\`\`\`${journalExcerpt.slice(0, 1500)}\`\`\``,
      short: false,
    });
  }

  const text = `🚨 *Pipeline failure* — \`${jobName}\` exited with error`;

  logMessage('Sending pipeline failure alert', { jobName, errorMessage });

  const result = await postToSlack(
    {
      text,
      attachments: [
        {
          color: 'danger',
          title: errorMessage.slice(0, 200),
          fields,
          footer: 'TruckFull Pipeline Monitor',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    },
    { priority: 'pipeline' },
  );

  if (!result) {
    logError('Failed to send pipeline failure alert', { jobName });
  }

  return result;
}
