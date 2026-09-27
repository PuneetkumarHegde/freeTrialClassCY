import { NotificationType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  appointmentId?: string;
  recipientUserId?: string;
}

export class NotificationService {
  /**
   * Create an in-app notification (for Admin or a specific User)
   */
  async createNotification(params: CreateNotificationParams) {
    const { type, title, message, appointmentId, recipientUserId } = params;

    try {
      return await prisma.notification.create({
        data: {
          type,
          title,
          message,
          appointmentId,
          recipientUserId,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2003' || String(err).includes('Foreign key constraint')) {
        return await prisma.notification
          .create({
            data: {
              type,
              title,
              message,
              recipientUserId,
            },
          })
          .catch(() => null as any);
      }
      return null as any;
    }
  }

  /**
   * Create notification for all Admin users
   */
  async createAdminNotification(params: Omit<CreateNotificationParams, 'recipientUserId'>) {
    // Find admin users
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    if (admins.length === 0) {
      return this.createNotification(params);
    }

    // Create notifications for each admin
    const created = await Promise.all(
      admins.map((admin) =>
        this.createNotification({
          ...params,
          recipientUserId: admin.id,
        })
      )
    );

    return created[0];
  }

  /**
   * Get notifications for admin / user
   */
  async getNotifications(userId?: string, limit = 50) {
    const where: any = {};
    if (userId) {
      where.OR = [
        { recipientUserId: userId },
        { recipientUserId: null }, // Global notifications
      ];
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          appointment: {
            select: {
              id: true,
              studentName: true,
              subject: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: {
          ...where,
          readAt: null,
        },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        appointmentId: n.appointmentId,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        isRead: !!n.readAt,
        createdAt: n.createdAt.toISOString(),
        appointment: n.appointment
          ? {
              id: n.appointment.id,
              studentName: n.appointment.studentName,
              subject: n.appointment.subject,
              status: n.appointment.status,
            }
          : null,
      })),
      unreadCount,
    };
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string) {
    const notif = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notif) {
      throw new AppError('Notification not found', 404);
    }

    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId?: string) {
    const where: any = { readAt: null };
    if (userId) {
      where.OR = [{ recipientUserId: userId }, { recipientUserId: null }];
    }

    return prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
  }
}

export const notificationService = new NotificationService();
