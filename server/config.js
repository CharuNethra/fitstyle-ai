export function getConfig(env = process.env) {
  const visionProvider = env.OPENAI_API_KEY ? 'openai' : env.GEMINI_API_KEY ? 'gemini' : 'mock';
  return {
    port: Number(env.PORT) || 5001,
    // Demo JSON database. Vercel only allows writes to /tmp (reset on cold starts).
    dataFile: env.DATA_FILE ?? (env.VERCEL ? '/tmp/fitstyle-data/db.json' : 'data/db.json'),
    // Persistent storage for accounts and sessions (Vercel → Storage → Upstash for Redis sets these).
    redisUrl: env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL,
    redisToken: env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN,
    onVercel: !!env.VERCEL,
    adminEmail: (env.ADMIN_EMAIL || 'admin@fitstyle.ai').toLowerCase(),
    // Demo admin password only outside production; on Vercel/production admin login is off until ADMIN_PASSWORD is set.
    adminPassword: env.ADMIN_PASSWORD || (env.NODE_ENV === 'production' || env.VERCEL ? null : 'admin123'),
    // Dev/demo only: return the simulated reset-email link to the browser (never in production/Vercel).
    showResetLink: !(env.NODE_ENV === 'production' || env.VERCEL),
    visionProvider,
    openaiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL || 'gpt-4o',
    geminiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || 'gemini-3-flash-preview',
    geminiImageModel: env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
    // Per-attempt limit, and the total budget across retries/providers (Vercel functions allow 300 s).
    tryOnTimeoutMs: Number(env.TRYON_TIMEOUT_MS) || 120_000,
    tryOnBudgetMs: Number(env.TRYON_BUDGET_MS) || 240_000,
  };
}
