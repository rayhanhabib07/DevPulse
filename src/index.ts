import dotenv from 'dotenv';

// Load .env before any other import that reads process.env
dotenv.config();

import createApp from './app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 DevPulse API is running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
