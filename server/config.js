export function getConfig(env = process.env) {
  const tryOnProvider = env.FAL_KEY ? 'fal' : env.FASHN_API_KEY ? 'fashn' : 'mock';
  const visionProvider = env.OPENAI_API_KEY ? 'openai' : env.GEMINI_API_KEY ? 'gemini' : 'mock';
  return {
    port: Number(env.PORT) || 5001,
    tryOnProvider,
    visionProvider,
    falKey: env.FAL_KEY,
    falModel: env.FAL_TRYON_MODEL || 'fal-ai/fashn/tryon/v1.6',
    fashnKey: env.FASHN_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL || 'gpt-4o',
    geminiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || 'gemini-3-flash-preview',
  };
}
