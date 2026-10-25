import { prisma } from './prisma';

export async function logActivity(
  teamId: string,
  userId: string,
  action: string,
  details?: string
) {
  try {
    return await prisma.activityLog.create({
      data: {
        teamId,
        userId,
        action,
        details,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
    return null;
  }
}
