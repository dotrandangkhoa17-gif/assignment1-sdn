import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canRemoveMember, canUpdateMemberRole } from '@/lib/permissions';
import { createNotification } from '@/lib/notification';
import { logActivity } from '@/lib/activity';

// DELETE /api/teams/:id/members/:userId - Remove member or leave team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;

    // Check team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const callerMember = team.members.find((m) => m.userId === session.userId);
    const callerRole =
      team.ownerId === session.userId
        ? 'OWNER'
        : callerMember?.role || 'MEMBER';

    const targetMember = team.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      return NextResponse.json(
        { error: 'User is not a member of this team' },
        { status: 404 }
      );
    }

    const targetRole =
      team.ownerId === targetUserId ? 'OWNER' : targetMember.role;

    const isSelf = targetUserId === session.userId;

    // Check permission
    if (
      !canRemoveMember(
        callerRole,
        session.userId,
        targetRole,
        targetUserId
      )
    ) {
      return NextResponse.json(
        {
          error: isSelf && callerRole === 'OWNER'
            ? 'Team owner cannot leave the team. You can delete the team in Settings.'
            : 'You do not have permission to remove this member',
        },
        { status: 403 }
      );
    }

    // Remove member and unassign their tasks
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { teamId, assigneeId: targetUserId },
        data: { assigneeId: null },
      }),
      prisma.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
      }),
    ]);

    // Activity log
    await logActivity(
      teamId,
      session.userId,
      isSelf ? 'LEAVE_TEAM' : 'REMOVE_MEMBER',
      isSelf
        ? `${session.name} left the team`
        : `Removed member (ID: ${targetUserId}) from the team`
    );

    // If removed by someone else, notify target user
    if (!isSelf) {
      await createNotification(
        targetUserId,
        'Removed from Team',
        `You were removed from the team "${team.name}" by ${session.name}`,
        'TEAM_REMOVED'
      );
    }

    return NextResponse.json({
      message: isSelf
        ? 'You have left the team'
        : 'Member removed successfully',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/:id/members/:userId - Update member role (Owner / Admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;

    // Check team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const callerMember = team.members.find((m) => m.userId === session.userId);
    const callerRole =
      team.ownerId === session.userId
        ? 'OWNER'
        : callerMember?.role || 'MEMBER';

    const targetMember = team.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      return NextResponse.json(
        { error: 'Target user is not a member of this team' },
        { status: 404 }
      );
    }

    const targetRole =
      team.ownerId === targetUserId ? 'OWNER' : targetMember.role;

    if (!canUpdateMemberRole(callerRole, targetRole)) {
      return NextResponse.json(
        { error: 'You do not have permission to change this member role' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either ADMIN or MEMBER' },
        { status: 400 }
      );
    }

    const updated = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // In-app notification
    await createNotification(
      targetUserId,
      'Role Updated',
      `Your role in team "${team.name}" has been changed to ${role} by ${session.name}`,
      'ROLE_UPDATED',
      `/teams/${teamId}`
    );

    // Activity log
    await logActivity(
      teamId,
      session.userId,
      'UPDATE_ROLE',
      `Updated ${updated.user.name}'s role to ${role}`
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}
