import { Request, Response } from 'express';

/**
 * GET /api/health
 * Returns { "status": "ok" }
 */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
  });
};
