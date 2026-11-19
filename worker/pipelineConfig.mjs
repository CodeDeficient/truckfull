const REQUIRED = [
  'STAGING_SUPABASE_URL',
  'STAGING_SUPABASE_SERVICE_ROLE_KEY',
  'PROD_SUPABASE_URL',
  'PROD_SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CRON_SECRET',
  'TRUCKFULL_EDGE_SECRET',
  'NEXT_PUBLIC_APP_URL',
];

const OPTIONAL = [
  'BRAVE_API_KEY',
  'COLUMBUS_TIMELY_API_KEY',
  'ENFORMION_PROFILE_KEY_NAME',
  'ENFORMION_PROFILE_KEY_PASSWORD',
  'EVENTBRITE_KEYWORD_SKIP_THRESHOLD',
  'EVENTBRITE_PRIVATE_TOKEN',
  'EXA_API_KEY',
  'FOURSQUARE_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'LOCATIONIQ_API_KEY',
  'MACON_ALGOLIA_API_KEY',
  'MACON_ALGOLIA_APP_ID',
  'SAVANNAH_EPROVAL_CALENDAR_KEY',
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'OLLAMA_CLOUD_API_KEY',
  'OLLAMA_CLOUD_URL',
  'OPENCODE_GO_API_KEY',
  'OPENROUTER_API_KEY',
  'RESEARCH_DISABLE_EXA',
  'SEARXNG_PROXY_TOKEN',
  'SEARXNG_URL',
  'SLACK_WEBHOOK_URL',
  'TAVILY_API_KEY',
  'TOMTOM_API_KEY',
];

export function buildPipelineContainerEnv(env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Pipeline is missing required environment variables: ${missing.join(', ')}`);
  }
  if (new URL(env.STAGING_SUPABASE_URL).origin === new URL(env.PROD_SUPABASE_URL).origin) {
    throw new Error('Staging and production Supabase URLs must differ');
  }

  return {
    ...Object.fromEntries(
      [...REQUIRED, ...OPTIONAL]
        .filter((name) => typeof env[name] === 'string' && env[name].length > 0)
        .map((name) => [name, env[name]]),
    ),
    NEXT_PUBLIC_SUPABASE_URL: env.STAGING_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  };
}
