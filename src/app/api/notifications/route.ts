import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/notifications - Get current user's notifications
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all, teamId } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (teamId) {
      await prisma.notification.updateMany({
        where: {
          userId: session.userId,
          link: { contains: teamId },
          isRead: false,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'Team notifications marked as read' });
    }

    if (id) {
      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification || notification.userId !== session.userId) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'Invalid request: provide notification id, teamId, or all: true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
