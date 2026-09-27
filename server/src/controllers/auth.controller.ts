import { Request, Response, NextFunction } from 'express';
import { loginSchema } from '../types/auth.types';
import { authService, AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  /**
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await this.service.login(validated);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/auth/me
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }
      const user = await this.service.getMe(req.user.id);
      res.status(200).json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export const login = authController.login;
export const getMe = authController.getMe;
