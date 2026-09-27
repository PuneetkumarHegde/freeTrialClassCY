import './lib/env';
import { app } from './app';
import { config } from './lib/env';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[Backend] Codeyoung API server running on http://0.0.0.0:${config.port}`);
  console.log(`[Backend] Environment: ${config.nodeEnv}`);
  console.log(`[Backend] Health check available at: http://0.0.0.0:${config.port}/api/health`);
});

const handleShutdown = (signal: string) => {
  console.log(`[Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Backend] Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
