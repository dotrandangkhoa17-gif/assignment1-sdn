import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

    const { id: teamId, userId } = await params;

    // Check team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isOwner = team.ownerId === session.userId;
    const isSelf = userId === session.userId;

    // Only owner can remove others, or user can remove themselves (leave team)
    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this member' },
        { status: 403 }
      );
    }

    // Owner cannot leave the team directly
    if (isSelf && isOwner) {
      return NextResponse.json(
        { error: 'Team owner cannot leave the team. You can delete the team in Settings.' },
        { status: 400 }
      );
    }

    // Check member exists
    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this team' },
        { status: 404 }
      );
    }

    // Remove member and unassign their tasks
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { teamId, assigneeId: userId },
        data: { assigneeId: null },
      }),
      prisma.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
      }),
    ]);

    return NextResponse.json({
      message: isSelf ? 'You have left the team' : 'Member removed successfully',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/:id/members/:userId - Update member role (owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: teamId, userId } = await params;

    // Check team exists and user is owner
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.ownerId !== session.userId) {
      return NextResponse.json(
        { error: 'Only the team owner can change member roles' },
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
          userId,
        },
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

