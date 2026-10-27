export function getConfig(env = process.env) {
  const tryOnProvider = (env.TRYON_PROVIDER || (env.GEMINI_API_KEY ? 'gemini' : 'huggingface')).toLowerCase();
  const visionProvider = env.OPENAI_API_KEY ? 'openai' : env.GEMINI_API_KEY ? 'gemini' : 'mock';
  return {
    port: Number(env.PORT) || 5001,
    tryOnProvider,
    visionProvider,
    hfToken: env.HF_TOKEN || undefined,
    hfSpaces: (env.HF_TRYON_SPACES || 'yisol/IDM-VTON,Nymbo/Virtual-Try-On')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    hfDressSpace: env.HF_DRESS_SPACE ?? 'levihsu/OOTDiffusion',
    falKey: env.FAL_KEY,
    falModel: env.FAL_TRYON_MODEL || 'fal-ai/fashn/tryon/v1.6',
    fashnKey: env.FASHN_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL || 'gpt-4o',
    geminiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || 'gemini-3-flash-preview',
    geminiImageModel: env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
  };
}
