import 'dotenv/config';
import { createApp } from '../server/app.js';
import { getConfig } from '../server/config.js';

// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
export default createApp(getConfig());
