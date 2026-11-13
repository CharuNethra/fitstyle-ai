import 'dotenv/config';
import { createApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`FitStyle AI API listening on http://localhost:${config.port}`);
  console.log(`  try-on: ${config.geminiKey ? 'gemini' : 'not configured (set GEMINI_API_KEY)'} | vision provider: ${config.visionProvider}`);
});
