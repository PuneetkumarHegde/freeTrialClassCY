import express, { Express } from 'express';
import cors from 'cors';
import { config } from './lib/env';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

export function createApp(): Express {
  const app = express();

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, server-to-server)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          config.clientUrl,
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
        ];

        if (config.isDev || allowedOrigins.includes(origin) || origin.endsWith('.run.app')) {
          return callback(null, true);
        }

        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parse JSON bodies
  app.use(express.json({ limit: '2mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // 404 handler for unmatched /api routes
  app.use('/api', notFoundHandler);

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
