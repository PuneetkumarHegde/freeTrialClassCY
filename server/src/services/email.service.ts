import { EmailDeliveryStatus, EmailRecipientType, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';
import { Temporal } from '@js-temporal/polyfill';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export interface ParentBookingEmailParams {
  appointmentId: string;
  parentEmail: string;
  parentName: string;
  studentName: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  parentTimezone: string;
  meetingLink: string;
}

export interface MentorBookingEmailParams {
  appointmentId: string;
  mentorEmail: string;
  mentorName: string;
  studentName: string;
  studentGrade: string;
  subject: string;
  learningGoal?: string | null;
  startTime: Date;
  endTime: Date;
  mentorTimezone: string;
  meetingLink: string;
}

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  accessToken?: string;
  senderEmail: string;
  fromName: string;
  baseUrl: string;
}

export class EmailService {
  private inMemoryRefreshToken: string | null = null;
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Resolves Gmail OAuth configuration from environment variables (or runtime store)
   */
  private getOAuthConfig(): GmailOAuthConfig {
    // Dynamically reload .env if variables are updated on disk
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
      }
    } catch {
      // Ignore in mock/sandboxed environments
    }

    const port = process.env.PORT || '3000';
    const baseUrl = (
      process.env.APP_URL ||
      process.env.APP_BASE_URL ||
      `http://localhost:${port}`
    ).replace(/\/+$/, '');

    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || '').trim();
    const redirectUri = (
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GMAIL_REDIRECT_URI ||
      `${baseUrl}/api/auth/google/callback`
    ).trim();

    const refreshToken = (
      this.inMemoryRefreshToken ||
      process.env.GOOGLE_REFRESH_TOKEN ||
      process.env.GMAIL_REFRESH_TOKEN ||
      ''
    ).trim();

    const accessToken = (process.env.GOOGLE_ACCESS_TOKEN || process.env.GMAIL_ACCESS_TOKEN || '').trim();
    const senderEmail = (process.env.GMAIL_SENDER_EMAIL || 'worklord035@gmail.com').trim();
    const fromName = (process.env.GMAIL_FROM_NAME || 'Codeyoung Admissions').trim();

    return {
      clientId,
      clientSecret,
      redirectUri,
      refreshToken,
      accessToken,
      senderEmail,
      fromName,
      baseUrl,
    };
  }

  /**
   * Generate the Google OAuth 2.0 authorization URL for worklord035@gmail.com
   */
  public getGoogleAuthUrl(): string {
    const config = this.getOAuthConfig();
    if (!config.clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.send',
      access_type: 'offline',
      prompt: 'consent',
      login_hint: config.senderEmail,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for tokens and activates Gmail sending in memory
   */
  public async exchangeAuthCode(code: string): Promise<{
    senderEmail: string;
    refreshToken: string | null;
  }> {
    const config = this.getOAuthConfig();
    if (!config.clientId || !config.clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in environment');
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const bodyParams = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    const data = (await response.json().catch(() => ({}))) as any;

    if (!response.ok || (!data.access_token && !data.refresh_token)) {
      const errorMsg = data.error_description || data.error || `HTTP ${response.status} token exchange error`;
      throw new Error(`Google OAuth code exchange failed: ${errorMsg}`);
    }

    if (data.access_token) {
      this.cachedAccessToken = data.access_token;
      const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
    }

    if (data.refresh_token) {
      this.inMemoryRefreshToken = data.refresh_token;
    }

    return {
      senderEmail: config.senderEmail,
      refreshToken: data.refresh_token || null,
    };
  }

  /**
   * Check status of Gmail OAuth configuration
   */
  public getStatus() {
    const config = this.getOAuthConfig();
    const hasClientId = Boolean(config.clientId);
    const hasClientSecret = Boolean(config.clientSecret);
    const hasRefreshToken = Boolean(config.refreshToken);
    const isConfigured = hasClientId && hasClientSecret && hasRefreshToken;

    return {
      provider: 'Gmail API (OAuth 2.0)',
      senderEmail: config.senderEmail,
      isConfigured,
      hasClientId,
      hasClientSecret,
      hasRefreshToken,
      redirectUri: config.redirectUri,
    };
  }

  /**
   * Encodes a string to RFC 4648 Base64URL without trailing padding
   */
  private toBase64Url(input: string): string {
    return Buffer.from(input, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Constructs an RFC 2822 compliant MIME email string
   */
  private buildRfc2822Raw(from: string, to: string, subject: string, body: string): string {
    const encodedSubject = `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
    const lines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
    ];
    return lines.join('\r\n');
  }

  /**
   * Obtains a valid Google OAuth 2.0 access token using client credentials and refresh token
   */
  private async getValidAccessToken(config: GmailOAuthConfig): Promise<string> {
    // 1. If we have a valid unexpired cached access token, reuse it
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    // 2. If refresh token and client credentials are provided, exchange for a fresh access token
    if (config.refreshToken && config.clientId && config.clientSecret) {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const bodyParams = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const data = (await response.json().catch(() => ({}))) as any;

      if (!response.ok || !data.access_token) {
        const errorDetail = data.error_description || data.error || response.statusText || 'Failed to refresh token';
        throw new Error(`Gmail OAuth token refresh failed (${response.status}): ${errorDetail}`);
      }

      this.cachedAccessToken = data.access_token;
      const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
      return this.cachedAccessToken!;
    }

    // 3. Fallback to direct static access token if supplied
    if (config.accessToken) {
      return config.accessToken;
    }

    throw new Error(
      'Missing Gmail OAuth 2.0 credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables.'
    );
  }

  /**
   * Dispatches an email via the Gmail REST API (users.messages.send)
   */
  private async sendViaGmailApi(
    config: GmailOAuthConfig,
    recipientEmail: string,
    subject: string,
    bodyText: string
  ): Promise<{ messageId: string }> {
    const accessToken = await this.getValidAccessToken(config);
    const fromHeader = `${config.fromName} <${config.senderEmail}>`;
    const rfc2822 = this.buildRfc2822Raw(fromHeader, recipientEmail, subject, bodyText);
    const rawBase64Url = this.toBase64Url(rfc2822);

    const gmailSendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

    const response = await fetch(gmailSendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawBase64Url,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as any;

    if (!response.ok || !data.id) {
      const errorMsg =
        data.error?.message ||
        data.error_description ||
        data.error ||
        `Gmail API responded with HTTP ${response.status}`;
      throw new Error(`Gmail API error: ${errorMsg}`);
    }

    return { messageId: data.id };
  }

  /**
   * Helper to format human-readable time range in specified timezone
   */
  private formatDateTimeRange(start: Date, end: Date, timeZone: string): { dateStr: string; timeStr: string } {
    try {
      const instantStart = Temporal.Instant.fromEpochMilliseconds(start.getTime());
      const zonedDateTimeStart = instantStart.toZonedDateTimeISO(timeZone);
      const instantEnd = Temporal.Instant.fromEpochMilliseconds(end.getTime());
      const zonedDateTimeEnd = instantEnd.toZonedDateTimeISO(timeZone);

      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = months[zonedDateTimeStart.month - 1];
      const dateStr = `${monthName} ${zonedDateTimeStart.day}, ${zonedDateTimeStart.year}`;

      const formatTime = (zdt: Temporal.ZonedDateTime) => {
        let hour = zdt.hour;
        const minute = String(zdt.minute).padStart(2, '0');
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
      };

      const timeStr = `${formatTime(zonedDateTimeStart)} – ${formatTime(zonedDateTimeEnd)} (${timeZone})`;
      return { dateStr, timeStr };
    } catch {
      // Fallback
      return {
        dateStr: start.toLocaleDateString('en-US', { timeZone }),
        timeStr: `${start.toLocaleTimeString('en-US', { timeZone })} – ${end.toLocaleTimeString('en-US', { timeZone })} (${timeZone})`,
      };
    }
  }

  /**
   * Send booking confirmation email to Parent (Dynamic recipient)
   */
  async sendParentBookingConfirmation(params: ParentBookingEmailParams) {
    const { appointmentId, parentEmail, parentName, studentName, subject, startTime, endTime, parentTimezone, meetingLink } = params;
    const { dateStr, timeStr } = this.formatDateTimeRange(startTime, endTime, parentTimezone);
    const bookingCode = `BK-${appointmentId.substring(0, 6).toUpperCase()}`;

    const emailSubject = 'Your Codeyoung Trial Class is Confirmed';
    const emailBody = `
Dear ${parentName || 'Parent'},

Your child's complimentary 1-on-1 STEM trial class with Codeyoung is confirmed!

Booking Details:
• Student Name: ${studentName}
• Subject: ${subject}
• Date: ${dateStr}
• Time: ${timeStr}
• Booking ID: ${bookingCode}

Class Link:
${meetingLink}

Please ensure your child has a laptop/computer with Google Chrome and a working microphone/camera.

Best regards,
The Codeyoung Admissions & Mentorship Team
    `.trim();

    return this.sendEmail({
      appointmentId,
      recipientEmail: parentEmail,
      recipientType: EmailRecipientType.PARENT,
      subject: emailSubject,
      text: emailBody,
    });
  }

  /**
   * Send assignment notification email to assigned Mentor (Dynamic stored mentor email)
   */
  async sendMentorBookingNotification(params: MentorBookingEmailParams) {
    const {
      appointmentId,
      mentorEmail,
      mentorName,
      studentName,
      studentGrade,
      subject,
      learningGoal,
      startTime,
      endTime,
      mentorTimezone,
      meetingLink,
    } = params;

    const { dateStr, timeStr } = this.formatDateTimeRange(startTime, endTime, mentorTimezone);
    const bookingCode = `BK-${appointmentId.substring(0, 6).toUpperCase()}`;
    const { baseUrl } = this.getOAuthConfig();
    const portalUrl = `${baseUrl}/mentor/dashboard`;

    const emailSubject = 'New Trial Class Assigned';
    const emailBody = `
Hi ${mentorName || 'Mentor'},

A new live 1-on-1 trial class has been assigned to your calendar:

Session Details:
• Student Name: ${studentName}
• Grade / Level: ${studentGrade}
• Subject: ${subject}
• Student Learning Goal: ${learningGoal || 'Exploratory STEM fundamentals'}
• Date: ${dateStr}
• Time: ${timeStr} (Mentor Local Time)
• Booking ID: ${bookingCode}

Classroom Link:
${meetingLink}

Open Mentor Portal:
${portalUrl}

Please be in the classroom 2 minutes prior to session start.

Best regards,
Codeyoung Academic Operations
    `.trim();

    const normalizedEmail = (mentorEmail || '').trim().toLowerCase();
    const isDemoAddress =
      normalizedEmail.endsWith('@example.com') ||
      normalizedEmail.endsWith('@test.com') ||
      normalizedEmail.endsWith('.invalid');

    if (isDemoAddress) {
      // For demo/example mentor email, do not attempt Gmail delivery; log and notify in portal
      try {
        await prisma.emailLog.create({
          data: {
            appointmentId,
            recipientEmail: mentorEmail,
            recipientType: EmailRecipientType.MENTOR,
            subject: emailSubject,
            emailContent: emailBody,
            status: EmailDeliveryStatus.NOT_DELIVERED,
            errorMessage:
              'Demo/example mentor email (@example.com). Gmail delivery skipped; assignment displayed in mentor dashboard notification.',
            sentAt: new Date(),
          },
        });
      } catch (err) {
        console.warn('Failed to write EmailLog for demo mentor:', err);
      }

      try {
        const mentorUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (mentorUser) {
          await notificationService.createNotification({
            type: NotificationType.NEW_TRIAL_BOOKING,
            recipientUserId: mentorUser.id,
            title: 'New Trial Class Assigned',
            message: `New 1-on-1 trial class (${subject}) booked for ${studentName} (${dateStr}, ${timeStr}).`,
            appointmentId,
          });
        }
      } catch (notifErr) {
        console.warn('Failed to notify mentor user for demo email:', notifErr);
      }

      return null;
    }

    return this.sendEmail({
      appointmentId,
      recipientEmail: mentorEmail,
      recipientType: EmailRecipientType.MENTOR,
      subject: emailSubject,
      text: emailBody,
    });
  }

  /**
   * Core delivery dispatcher with database logging and safety guarantees
   */
  private async sendEmail(options: {
    appointmentId?: string;
    recipientEmail: string;
    recipientType: EmailRecipientType;
    subject: string;
    text: string;
  }) {
    const { appointmentId, recipientEmail, recipientType, subject, text } = options;

    // Create initial QUEUED log in database with foreign key safety fallback for mock unit tests
    let log: any;
    try {
      log = await prisma.emailLog.create({
        data: {
          appointmentId,
          recipientEmail,
          recipientType,
          subject,
          emailContent: text,
          status: EmailDeliveryStatus.QUEUED,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2003' || String(err).includes('Foreign key constraint')) {
        log = await prisma.emailLog
          .create({
            data: {
              recipientEmail,
              recipientType,
              subject,
              emailContent: text,
              status: EmailDeliveryStatus.QUEUED,
            },
          })
          .catch(() => null);
      }
    }

    if (!log) {
      return null;
    }

    const config = this.getOAuthConfig();
    const hasCredentials =
      (config.refreshToken && config.clientId && config.clientSecret) || Boolean(config.accessToken);

    // Check if Gmail OAuth credentials are provided in environment
    if (!hasCredentials) {
      const updatedLog = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailDeliveryStatus.NOT_DELIVERED,
          errorMessage:
            'Gmail OAuth 2.0 credentials not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN). Delivery safely skipped.',
          sentAt: new Date(),
        },
      });
      return updatedLog;
    }

    try {
      const result = await this.sendViaGmailApi(config, recipientEmail, subject, text);

      const updatedLog = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailDeliveryStatus.SENT,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      return updatedLog;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Gmail API email delivery error';

      const updatedLog = await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailDeliveryStatus.FAILED,
          errorMessage: errorMsg,
          sentAt: new Date(),
        },
      });

      // Create admin notification for email failure
      try {
        await notificationService.createAdminNotification({
          type: NotificationType.EMAIL_FAILED,
          title: `Email Delivery Failed (${recipientType})`,
          message: `Failed to deliver "${subject}" to ${recipientEmail} via Gmail API: ${errorMsg}`,
          appointmentId,
        });
      } catch (notifErr) {
        console.error('Failed to create EMAIL_FAILED notification:', notifErr);
      }

      return updatedLog;
    }
  }

  /**
   * Get all email logs for Admin inspection
   */
  async getEmailLogs(limit = 100, status?: EmailDeliveryStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        appointment: {
          select: {
            id: true,
            studentName: true,
            subject: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      appointmentId: log.appointmentId,
      recipientEmail: log.recipientEmail,
      recipientType: log.recipientType,
      subject: log.subject,
      status: log.status,
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      emailContent: log.emailContent,
      sentAt: log.sentAt ? log.sentAt.toISOString() : null,
      createdAt: log.createdAt.toISOString(),
      studentName: log.appointment?.studentName || null,
      subjectName: log.appointment?.subject || null,
    }));
  }
}

export const emailService = new EmailService();
