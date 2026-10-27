import 'dotenv/config';
import { createApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`FitStyle AI API listening on http://localhost:${config.port}`);
  console.log(`  try-on provider: ${config.tryOnProvider} | vision provider: ${config.visionProvider}`);
});
