import { Request, Response } from 'express';
import { emailService } from '../services/email.service';
import fs from 'fs';
import path from 'path';

/**
 * Safely persists or updates an environment variable key in the .env file
 */
function updateEnvFile(key: string, value: string) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf-8');
    }

    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, content, 'utf-8');
  } catch (err) {
    console.error(`[OAuth] Note: Could not auto-write ${key} to .env file:`, err);
  }
}

/**
 * Initiates the Google OAuth 2.0 authorization flow for Gmail sending
 * GET /api/auth/google/authorize
 */
export async function googleAuthorize(req: Request, res: Response) {
  try {
    const authUrl = emailService.getGoogleAuthUrl();
    return res.redirect(authUrl);
  } catch (err: any) {
    return res.status(400).json({
      error: 'Failed to generate Google OAuth authorization URL',
      details: err?.message || String(err),
    });
  }
}

/**
 * Handles the Google OAuth 2.0 callback and exchanges the auth code for a refresh token
 * GET /api/auth/google/callback
 */
export async function googleCallback(req: Request, res: Response) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Gmail Authorization Failed</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">Google Authorization Error</h2>
          <p>Google returned an error: <strong>${error}</strong></p>
          <p><a href="/api/auth/google/authorize">Click here to retry authorization</a></p>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Missing Authorization Code</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">Missing Authorization Code</h2>
          <p>No authorization code was received in the query parameters.</p>
          <p><a href="/api/auth/google/authorize">Click here to start authorization</a></p>
        </body>
      </html>
    `);
  }

  try {
    const result = await emailService.exchangeAuthCode(code);

    // Securely persist refresh token into backend .env if obtained
    if (result.refreshToken) {
      updateEnvFile('GOOGLE_REFRESH_TOKEN', result.refreshToken);
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail OAuth 2.0 Authorization Successful</title>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 40px auto; padding: 24px; line-height: 1.6; background-color: #f8fafc; color: #1e293b;">
          <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="background: #10b981; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">✓</div>
              <h2 style="margin: 0; color: #0f172a;">Gmail Authorization Successful!</h2>
            </div>
            
            <p><strong>Authorized Sender:</strong> <code>${result.senderEmail}</code></p>
            <p>The Gmail API has been successfully authorized with <code>https://www.googleapis.com/auth/gmail.send</code> scope. The credentials have been stored securely in the backend environment.</p>

            <div style="margin-top: 24px;">
              <a href="/admin/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">Return to Dashboard</a>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Token Exchange Failed</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #dc2626;">OAuth Token Exchange Error</h2>
          <p>Failed to exchange authorization code for tokens:</p>
          <pre style="background: #fee2e2; padding: 12px; border-radius: 6px; color: #991b1b; white-space: pre-wrap;">${err?.message || String(err)}</pre>
          <p><a href="/api/auth/google/authorize">Retry Authorization</a></p>
        </body>
      </html>
    `);
  }
}

/**
 * Returns current Gmail integration status
 * GET /api/auth/google/status
 */
export async function getGoogleAuthStatus(req: Request, res: Response) {
  const status = emailService.getStatus();
  return res.json(status);
}
