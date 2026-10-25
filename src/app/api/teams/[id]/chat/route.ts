import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notification';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/teams/:id/chat - Get messages for team
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId } = await params;

    // Verify user is a member or owner of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.userId,
        },
      },
    });

    if (!membership) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });
      if (!team || team.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const messages = await prisma.message.findMany({
      where: { teamId },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Return last 100 messages
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/chat - Send a message to team chat
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId } = await params;

    // Verify user is a member or owner of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.userId,
        },
      },
    });

    if (!membership) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });
      if (!team || team.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { content, attachmentUrl, attachmentType, attachmentName } = body;

    const trimmedContent = content?.trim() || '';

    if (!trimmedContent && !attachmentUrl) {
      return NextResponse.json(
        { error: 'Message content or attachment is required' },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content:
          trimmedContent ||
          (attachmentType === 'IMAGE'
            ? '📷 Image attachment'
            : `📎 ${attachmentName || 'File attachment'}`),
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        attachmentName: attachmentName || null,
        teamId,
        senderId: session.userId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify other team members who are not currently viewing the chat
    try {
      const fullTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            select: { userId: true },
          },
        },
      });

      if (fullTeam) {
        const recipientUserIds = new Set<string>();
        if (fullTeam.ownerId && fullTeam.ownerId !== session.userId) {
          recipientUserIds.add(fullTeam.ownerId);
        }
        fullTeam.members.forEach((m) => {
          if (m.userId !== session.userId) {
            recipientUserIds.add(m.userId);
          }
        });

        const displayContent =
          trimmedContent ||
          (attachmentType === 'IMAGE'
            ? '📷 Sent an image'
            : `📎 Sent a file: ${attachmentName || 'attachment'}`);

        const snippet =
          displayContent.length > 60
            ? `${displayContent.slice(0, 60)}...`
            : displayContent;

        const notifTitle = `💬 #${fullTeam.name}`;
        const notifMessage = `${session.name}: ${snippet}`;
        const notifLink = `/teams/${teamId}?tab=chat`;

        await Promise.all(
          Array.from(recipientUserIds).map((recipientId) =>
            createNotification(
              recipientId,
              notifTitle,
              notifMessage,
              'NEW_MESSAGE',
              notifLink
            )
          )
        );

        // Broadcast to Supabase Realtime for recipients
        const supabase = getSupabaseClient();
        if (supabase) {
          recipientUserIds.forEach((recipientId) => {
            supabase.channel(`realtime-user-${recipientId}`).send({
              type: 'broadcast',
              event: 'new-notification',
              payload: {
                title: notifTitle,
                message: notifMessage,
                type: 'NEW_MESSAGE',
                link: notifLink,
                isRead: false,
                createdAt: new Date().toISOString(),
              },
            });
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify team members about new message:', notifErr);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
