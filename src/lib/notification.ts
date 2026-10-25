import { prisma } from './prisma';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TEAM_INVITE'
  | 'TASK_STATUS_CHANGED'
  | 'ROLE_UPDATED'
  | 'NEW_MESSAGE';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType | string,
  link?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link: link || null,
      },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}
