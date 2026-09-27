import './server/src/lib/env';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './server/src/app';
import { config } from './server/src/lib/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Mount Vite dev middleware after API routes for the frontend
    app.use(vite.middlewares);
  } else {
    // Serve static files in production build
    const distPath = fs.existsSync(path.resolve(__dirname, '../dist'))
      ? path.resolve(__dirname, '../dist')
      : path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = config.port || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Codeyoung] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Codeyoung] Backend health check: http://0.0.0.0:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('[Codeyoung] Failed to start server:', err);
  process.exit(1);
});
