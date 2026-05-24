import dotenv from 'dotenv';
dotenv.config();

import createApp from './app';

// Export the Express app for Vercel's serverless runtime.
// Vercel calls this as a function handler — no .listen() needed.
const app = createApp();

export default app;
